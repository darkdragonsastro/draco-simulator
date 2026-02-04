package catalog

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// HipparcosCatalog implements StarCatalog for the Hipparcos catalog.
// It provides efficient access to ~118,218 stars with positions, magnitudes,
// and proper motions.
type HipparcosCatalog struct {
	mu sync.RWMutex

	// stars holds all stars indexed by HIP number
	stars map[int]*Star

	// starList is a sorted slice for iteration
	starList []Star

	// index provides spatial indexing for cone searches
	index *SpatialIndex

	// loaded indicates whether the catalog has been loaded
	loaded bool

	// brightStars caches stars brighter than magnitude 6 for quick rendering
	brightStars []Star

	// namedStars maps common names to HIP numbers
	namedStars map[string]int
}

// NewHipparcosCatalog creates a new Hipparcos catalog instance.
// The catalog must be loaded before use via Load() or LoadFromFile().
func NewHipparcosCatalog() *HipparcosCatalog {
	return &HipparcosCatalog{
		stars:      make(map[int]*Star),
		namedStars: make(map[string]int),
	}
}

// Name returns the catalog name
func (h *HipparcosCatalog) Name() string {
	return "Hipparcos"
}

// IsLoaded returns true if the catalog has been loaded
func (h *HipparcosCatalog) IsLoaded() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.loaded
}

// Count returns the total number of stars in the catalog
func (h *HipparcosCatalog) Count() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.starList)
}

// Load loads the catalog from embedded data.
// This is the preferred method for zero-dependency deployment.
func (h *HipparcosCatalog) Load(ctx context.Context) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.loaded {
		return nil
	}

	// Check if embedded data is available
	if len(embeddedHipparcosData) > 0 {
		return h.loadFromBinaryData(embeddedHipparcosData)
	}

	return fmt.Errorf("no embedded catalog data available, use LoadFromFile()")
}

// LoadFromFile loads the catalog from an ASCII file (hip_main.dat format).
// This is useful for development and testing.
func (h *HipparcosCatalog) LoadFromFile(ctx context.Context, path string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.loaded {
		return nil
	}

	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open catalog file: %w", err)
	}
	defer f.Close()

	return h.loadFromReader(ctx, f)
}

// LoadFromBinaryFile loads the catalog from a compressed binary file.
func (h *HipparcosCatalog) LoadFromBinaryFile(ctx context.Context, path string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.loaded {
		return nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read binary catalog: %w", err)
	}

	return h.loadFromBinaryData(data)
}

// loadFromReader parses the Hipparcos ASCII format (hip_main.dat)
// Format documented at: https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/I/239
func (h *HipparcosCatalog) loadFromReader(ctx context.Context, r io.Reader) error {
	scanner := bufio.NewScanner(r)

	// Pre-allocate for ~118K stars
	h.stars = make(map[int]*Star, 120000)
	h.starList = make([]Star, 0, 120000)

	lineNum := 0
	for scanner.Scan() {
		lineNum++

		// Check for cancellation every 1000 lines
		if lineNum%1000 == 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
		}

		line := scanner.Text()
		if len(line) < 78 {
			continue // Skip short lines
		}

		star, err := parseHipLine(line)
		if err != nil {
			// Skip invalid lines rather than failing
			continue
		}

		h.stars[star.HIP] = &star
		h.starList = append(h.starList, star)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read catalog: %w", err)
	}

	// Build spatial index
	h.buildIndex()

	// Cache bright stars
	h.cacheBrightStars()

	h.loaded = true
	return nil
}

// loadFromBinaryData loads from compressed binary format
func (h *HipparcosCatalog) loadFromBinaryData(data []byte) error {
	// Decompress if gzipped
	var reader io.Reader = bytes.NewReader(data)

	// Check for gzip magic number
	if len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b {
		gzr, err := gzip.NewReader(reader)
		if err != nil {
			return fmt.Errorf("decompress catalog: %w", err)
		}
		defer gzr.Close()
		reader = gzr
	}

	buf := bufio.NewReader(reader)

	// Read header
	var numStars uint32
	if err := binary.Read(buf, binary.LittleEndian, &numStars); err != nil {
		return fmt.Errorf("read header: %w", err)
	}

	// Pre-allocate
	h.stars = make(map[int]*Star, numStars)
	h.starList = make([]Star, 0, numStars)

	// Read stars
	for i := uint32(0); i < numStars; i++ {
		star, err := readBinaryStar(buf)
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("read star %d: %w", i, err)
		}

		h.stars[star.HIP] = &star
		h.starList = append(h.starList, star)
	}

	// Build spatial index
	h.buildIndex()

	// Cache bright stars
	h.cacheBrightStars()

	h.loaded = true
	return nil
}

// parseHipLine parses a line from hip_main.dat
// The Hipparcos main catalog uses fixed-width columns
func parseHipLine(line string) (Star, error) {
	var star Star

	// HIP number (columns 9-14)
	if len(line) < 14 {
		return star, fmt.Errorf("line too short")
	}
	hip, err := strconv.Atoi(strings.TrimSpace(line[8:14]))
	if err != nil {
		return star, fmt.Errorf("parse HIP: %w", err)
	}
	star.HIP = hip

	// RA in degrees (columns 52-63)
	if len(line) >= 63 {
		ra, err := strconv.ParseFloat(strings.TrimSpace(line[51:63]), 64)
		if err == nil {
			star.RA = ra
		}
	}

	// Dec in degrees (columns 65-76)
	if len(line) >= 76 {
		dec, err := strconv.ParseFloat(strings.TrimSpace(line[64:76]), 64)
		if err == nil {
			star.Dec = dec
		}
	}

	// Parallax in milliarcseconds (columns 80-86)
	if len(line) >= 86 {
		plx, err := strconv.ParseFloat(strings.TrimSpace(line[79:86]), 64)
		if err == nil {
			star.Parallax = plx
		}
	}

	// Proper motion RA (columns 88-95)
	if len(line) >= 95 {
		pmra, err := strconv.ParseFloat(strings.TrimSpace(line[87:95]), 64)
		if err == nil {
			star.ProperMotionRA = pmra
		}
	}

	// Proper motion Dec (columns 97-104)
	if len(line) >= 104 {
		pmdec, err := strconv.ParseFloat(strings.TrimSpace(line[96:104]), 64)
		if err == nil {
			star.ProperMotionDec = pmdec
		}
	}

	// V magnitude (columns 42-46)
	if len(line) >= 46 {
		vmag, err := strconv.ParseFloat(strings.TrimSpace(line[41:46]), 64)
		if err == nil {
			star.VMag = vmag
		}
	}

	// B-V color (columns 246-251)
	if len(line) >= 251 {
		bv, err := strconv.ParseFloat(strings.TrimSpace(line[245:251]), 64)
		if err == nil {
			star.BV = bv
		}
	}

	// Spectral type (columns 436-447)
	if len(line) >= 447 {
		star.SpectralType = strings.TrimSpace(line[435:447])
	}

	return star, nil
}

// readBinaryStar reads a star from binary format
// Binary format (28 bytes):
//   - HIP: int32 (4 bytes)
//   - RA: float64 (8 bytes)
//   - Dec: float64 (8 bytes)
//   - VMag: float32 (4 bytes)
//   - BV: float32 (4 bytes)
func readBinaryStar(r io.Reader) (Star, error) {
	var star Star
	var hip int32
	var vmag, bv float32

	if err := binary.Read(r, binary.LittleEndian, &hip); err != nil {
		return star, err
	}
	if err := binary.Read(r, binary.LittleEndian, &star.RA); err != nil {
		return star, err
	}
	if err := binary.Read(r, binary.LittleEndian, &star.Dec); err != nil {
		return star, err
	}
	if err := binary.Read(r, binary.LittleEndian, &vmag); err != nil {
		return star, err
	}
	if err := binary.Read(r, binary.LittleEndian, &bv); err != nil {
		return star, err
	}

	star.HIP = int(hip)
	star.VMag = float64(vmag)
	star.BV = float64(bv)

	return star, nil
}

// buildIndex creates the spatial index for efficient queries
func (h *HipparcosCatalog) buildIndex() {
	// Use 10° bands for ~118K stars
	h.index = NewSpatialIndex(10.0)

	for i, star := range h.starList {
		h.index.Add(star.RA, star.Dec, i)
	}

	h.index.Compact()
}

// cacheBrightStars caches stars brighter than magnitude 6
func (h *HipparcosCatalog) cacheBrightStars() {
	h.brightStars = make([]Star, 0, 10000)
	for _, star := range h.starList {
		if star.VMag < 6.0 {
			h.brightStars = append(h.brightStars, star)
		}
	}

	// Sort by magnitude (brightest first)
	sort.Slice(h.brightStars, func(i, j int) bool {
		return h.brightStars[i].VMag < h.brightStars[j].VMag
	})
}

// GetStar returns a star by its HIP number
func (h *HipparcosCatalog) GetStar(ctx context.Context, hip int) (*Star, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded {
		return nil, ErrCatalogNotLoaded
	}

	star, ok := h.stars[hip]
	if !ok {
		return nil, ErrObjectNotFound
	}

	return star, nil
}

// ConeSearch returns stars within a cone centered on RA/Dec
func (h *HipparcosCatalog) ConeSearch(ctx context.Context, query ConeSearchQuery) ([]Star, error) {
	if err := query.Validate(); err != nil {
		return nil, err
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded {
		return nil, ErrCatalogNotLoaded
	}

	// Get candidate indices from spatial index
	candidates := h.index.Query(query.RA, query.Dec, query.Radius)

	// Filter candidates
	results := make([]Star, 0, len(candidates)/4)

	for _, idx := range candidates {
		// Check for cancellation periodically
		if len(results)%1000 == 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}
		}

		star := h.starList[idx]

		// Magnitude filter
		if query.MagLimit > 0 && star.VMag > query.MagLimit {
			continue
		}
		if query.MinMag != 0 && star.VMag < query.MinMag {
			continue
		}

		// Distance check
		dist := AngularDistance(query.RA, query.Dec, star.RA, star.Dec)
		if dist > query.Radius {
			continue
		}

		results = append(results, star)

		// Limit check
		if query.MaxResults > 0 && len(results) >= query.MaxResults {
			break
		}
	}

	// Sort by magnitude (brightest first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].VMag < results[j].VMag
	})

	return results, nil
}

// GetBrightStars returns stars brighter than the given magnitude.
// This is an optimized method using cached bright stars.
func (h *HipparcosCatalog) GetBrightStars(ctx context.Context, maxMag float64) ([]Star, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded {
		return nil, ErrCatalogNotLoaded
	}

	if maxMag >= 6.0 {
		// Return all cached bright stars
		result := make([]Star, len(h.brightStars))
		copy(result, h.brightStars)
		return result, nil
	}

	// Filter cached stars
	result := make([]Star, 0)
	for _, star := range h.brightStars {
		if star.VMag <= maxMag {
			result = append(result, star)
		}
	}

	return result, nil
}

// GetByName returns a star by its common name
func (h *HipparcosCatalog) GetByName(ctx context.Context, name string) (*Star, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded {
		return nil, ErrCatalogNotLoaded
	}

	hip, ok := h.namedStars[strings.ToLower(name)]
	if !ok {
		return nil, ErrObjectNotFound
	}

	return h.stars[hip], nil
}

// AddStarName associates a common name with a HIP number.
// This is called during catalog initialization to populate named stars.
func (h *HipparcosCatalog) AddStarName(name string, hip int) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.namedStars[strings.ToLower(name)] = hip

	// Also update the star's Name field if loaded
	if star, ok := h.stars[hip]; ok {
		if star.Name == "" {
			star.Name = name
		}
	}
}

// ExportBinary exports the catalog to compressed binary format
func (h *HipparcosCatalog) ExportBinary(w io.Writer) error {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded {
		return ErrCatalogNotLoaded
	}

	// Create gzip writer
	gzw := gzip.NewWriter(w)
	defer gzw.Close()

	// Write header
	numStars := uint32(len(h.starList))
	if err := binary.Write(gzw, binary.LittleEndian, numStars); err != nil {
		return fmt.Errorf("write header: %w", err)
	}

	// Write stars
	for _, star := range h.starList {
		if err := writeBinaryStar(gzw, star); err != nil {
			return fmt.Errorf("write star %d: %w", star.HIP, err)
		}
	}

	return nil
}

// writeBinaryStar writes a star in binary format
func writeBinaryStar(w io.Writer, star Star) error {
	if err := binary.Write(w, binary.LittleEndian, int32(star.HIP)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, star.RA); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, star.Dec); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, float32(star.VMag)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, float32(star.BV)); err != nil {
		return err
	}
	return nil
}

// embeddedHipparcosData holds pre-compiled catalog data.
// This will be populated by the embedded.go file during build.
var embeddedHipparcosData []byte

// SetEmbeddedData sets the embedded catalog data.
// This is called from embedded.go during init().
func SetEmbeddedData(data []byte) {
	embeddedHipparcosData = data
}

// GetMagnitudeStats returns magnitude distribution statistics
func (h *HipparcosCatalog) GetMagnitudeStats() MagnitudeStats {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if !h.loaded || len(h.starList) == 0 {
		return MagnitudeStats{}
	}

	var sum, min, max float64
	min = math.MaxFloat64
	max = -math.MaxFloat64

	counts := make(map[int]int) // Count per integer magnitude

	for _, star := range h.starList {
		sum += star.VMag
		if star.VMag < min {
			min = star.VMag
		}
		if star.VMag > max {
			max = star.VMag
		}
		counts[int(star.VMag)]++
	}

	return MagnitudeStats{
		Min:          min,
		Max:          max,
		Mean:         sum / float64(len(h.starList)),
		TotalStars:   len(h.starList),
		Distribution: counts,
	}
}

// MagnitudeStats holds magnitude distribution information
type MagnitudeStats struct {
	Min          float64     `json:"min"`
	Max          float64     `json:"max"`
	Mean         float64     `json:"mean"`
	TotalStars   int         `json:"total_stars"`
	Distribution map[int]int `json:"distribution"` // Count per integer magnitude
}
