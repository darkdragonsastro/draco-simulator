package catalog

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// DSOCatalogImpl implements DSOCatalog for Messier, NGC, and IC objects.
type DSOCatalogImpl struct {
	mu sync.RWMutex

	// name is the catalog name (e.g., "Messier", "NGC", "IC")
	name string

	// objects holds all DSOs indexed by primary ID
	objects map[string]*DeepSkyObject

	// objectList is a sorted slice for iteration
	objectList []DeepSkyObject

	// index provides spatial indexing for cone searches
	index *SpatialIndex

	// loaded indicates whether the catalog has been loaded
	loaded bool

	// crossIndex maps alternative names to primary IDs
	crossIndex map[string]string

	// byType groups objects by type
	byType map[ObjectType][]int // indices into objectList
}

// NewDSOCatalog creates a new DSO catalog instance.
func NewDSOCatalog(name string) *DSOCatalogImpl {
	return &DSOCatalogImpl{
		name:       name,
		objects:    make(map[string]*DeepSkyObject),
		crossIndex: make(map[string]string),
		byType:     make(map[ObjectType][]int),
	}
}

// Name returns the catalog name
func (d *DSOCatalogImpl) Name() string {
	return d.name
}

// IsLoaded returns true if the catalog has been loaded
func (d *DSOCatalogImpl) IsLoaded() bool {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.loaded
}

// Count returns the total number of objects in the catalog
func (d *DSOCatalogImpl) Count() int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.objectList)
}

// Load loads the catalog from embedded data.
func (d *DSOCatalogImpl) Load(ctx context.Context) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.loaded {
		return nil
	}

	// Check for embedded data based on catalog name
	var data []byte
	switch d.name {
	case "Messier":
		data = embeddedMessierData
	case "NGC":
		data = embeddedNGCData
	case "IC":
		data = embeddedICData
	}

	if len(data) > 0 {
		return d.loadFromJSONData(data)
	}

	return fmt.Errorf("no embedded %s data available, use LoadFromFile()", d.name)
}

// LoadFromFile loads the catalog from a JSON file.
func (d *DSOCatalogImpl) LoadFromFile(ctx context.Context, path string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.loaded {
		return nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read catalog file: %w", err)
	}

	return d.loadFromJSONData(data)
}

// LoadFromCSV loads objects from CSV format (OpenNGC style)
func (d *DSOCatalogImpl) LoadFromCSV(ctx context.Context, r io.Reader) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.loaded {
		return nil
	}

	scanner := bufio.NewScanner(r)

	// Skip header line
	if scanner.Scan() {
		_ = scanner.Text() // Header
	}

	d.objects = make(map[string]*DeepSkyObject, 15000)
	d.objectList = make([]DeepSkyObject, 0, 15000)

	lineNum := 0
	for scanner.Scan() {
		lineNum++

		// Check for cancellation
		if lineNum%1000 == 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
		}

		line := scanner.Text()
		obj, err := parseNGCCSVLine(line)
		if err != nil {
			continue // Skip invalid lines
		}

		// Filter by catalog prefix if needed
		if d.name == "NGC" && !strings.HasPrefix(obj.ID, "NGC") {
			continue
		}
		if d.name == "IC" && !strings.HasPrefix(obj.ID, "IC") {
			continue
		}
		if d.name == "Messier" && !strings.HasPrefix(obj.ID, "M") {
			continue
		}

		d.objects[obj.ID] = &obj
		d.objectList = append(d.objectList, obj)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read CSV: %w", err)
	}

	d.buildIndex()
	d.buildTypeIndex()
	d.loaded = true

	return nil
}

// loadFromJSONData loads from JSON data (possibly gzip compressed)
func (d *DSOCatalogImpl) loadFromJSONData(data []byte) error {
	var reader io.Reader = bytes.NewReader(data)

	// Check for gzip magic
	if len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b {
		gzr, err := gzip.NewReader(reader)
		if err != nil {
			return fmt.Errorf("decompress catalog: %w", err)
		}
		defer gzr.Close()

		decompressed, err := io.ReadAll(gzr)
		if err != nil {
			return fmt.Errorf("read decompressed data: %w", err)
		}
		data = decompressed
	}

	var objects []DeepSkyObject
	if err := json.Unmarshal(data, &objects); err != nil {
		return fmt.Errorf("parse JSON: %w", err)
	}

	d.objects = make(map[string]*DeepSkyObject, len(objects))
	d.objectList = objects

	for i := range objects {
		d.objects[objects[i].ID] = &d.objectList[i]

		// Build cross-index
		for _, altName := range objects[i].CatalogNames {
			d.crossIndex[normalizeID(altName)] = objects[i].ID
		}
		if objects[i].CommonName != "" {
			d.crossIndex[normalizeID(objects[i].CommonName)] = objects[i].ID
		}
	}

	d.buildIndex()
	d.buildTypeIndex()
	d.loaded = true

	return nil
}

// parseNGCCSVLine parses a line from OpenNGC CSV format
func parseNGCCSVLine(line string) (DeepSkyObject, error) {
	var obj DeepSkyObject

	fields := strings.Split(line, ";")
	if len(fields) < 10 {
		return obj, fmt.Errorf("insufficient fields")
	}

	obj.ID = strings.TrimSpace(fields[0])
	if obj.ID == "" {
		return obj, fmt.Errorf("empty ID")
	}

	// Parse type
	typeStr := strings.TrimSpace(fields[1])
	obj.Type = parseObjectType(typeStr)

	// Parse RA (format: HH:MM:SS.s or decimal hours)
	raStr := strings.TrimSpace(fields[2])
	ra, err := parseRA(raStr)
	if err != nil {
		return obj, fmt.Errorf("parse RA: %w", err)
	}
	obj.RA = ra

	// Parse Dec (format: +/-DD:MM:SS or decimal degrees)
	decStr := strings.TrimSpace(fields[3])
	dec, err := parseDec(decStr)
	if err != nil {
		return obj, fmt.Errorf("parse Dec: %w", err)
	}
	obj.Dec = dec

	// Parse magnitude
	if len(fields) > 4 && fields[4] != "" {
		if mag, err := strconv.ParseFloat(strings.TrimSpace(fields[4]), 64); err == nil {
			obj.VMag = mag
		}
	}

	// Parse size (major axis)
	if len(fields) > 5 && fields[5] != "" {
		if size, err := strconv.ParseFloat(strings.TrimSpace(fields[5]), 64); err == nil {
			obj.MajorAxis = size
		}
	}

	// Parse minor axis
	if len(fields) > 6 && fields[6] != "" {
		if size, err := strconv.ParseFloat(strings.TrimSpace(fields[6]), 64); err == nil {
			obj.MinorAxis = size
		}
	}

	// Parse position angle
	if len(fields) > 7 && fields[7] != "" {
		if pa, err := strconv.ParseFloat(strings.TrimSpace(fields[7]), 64); err == nil {
			obj.PositionAngle = pa
		}
	}

	// Parse common name
	if len(fields) > 24 {
		obj.CommonName = strings.TrimSpace(fields[24])
	}

	// Parse Messier number as alternative name
	if len(fields) > 23 && fields[23] != "" {
		mNum := strings.TrimSpace(fields[23])
		obj.CatalogNames = append(obj.CatalogNames, "M"+mNum)
	}

	return obj, nil
}

// parseObjectType converts string type to ObjectType
func parseObjectType(s string) ObjectType {
	s = strings.ToLower(strings.TrimSpace(s))
	switch {
	case strings.Contains(s, "galaxy"), s == "g", s == "gx":
		return ObjectTypeGalaxy
	case strings.Contains(s, "nebula") || s == "nb" || s == "en" || s == "rn":
		return ObjectTypeNebula
	case s == "pn" || strings.Contains(s, "planetary"):
		return ObjectTypePlanetary
	case s == "oc" || strings.Contains(s, "open cluster"):
		return ObjectTypeOpenCluster
	case s == "gc" || strings.Contains(s, "globular"):
		return ObjectTypeGlobular
	case s == "*" || strings.Contains(s, "star"):
		return ObjectTypeStar
	case strings.Contains(s, "cluster") && strings.Contains(s, "nebula"):
		return ObjectTypeClusterNebula
	default:
		return ObjectTypeUnknown
	}
}

// parseRA parses RA from string (HMS or decimal)
func parseRA(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty RA")
	}

	// Check for HMS format (HH:MM:SS.s or HH MM SS.s)
	if strings.Contains(s, ":") || strings.Contains(s, " ") {
		parts := strings.FieldsFunc(s, func(r rune) bool {
			return r == ':' || r == ' '
		})

		if len(parts) < 2 {
			return 0, fmt.Errorf("invalid HMS format")
		}

		h, err := strconv.ParseFloat(parts[0], 64)
		if err != nil {
			return 0, err
		}
		m, err := strconv.ParseFloat(parts[1], 64)
		if err != nil {
			return 0, err
		}
		var sec float64
		if len(parts) >= 3 {
			sec, _ = strconv.ParseFloat(parts[2], 64)
		}

		// Convert to degrees (1h = 15°)
		ra := (h + m/60.0 + sec/3600.0) * 15.0
		return NormalizeRA(ra), nil
	}

	// Decimal format
	ra, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}

	// Check if already in degrees or hours
	if ra < 24 {
		ra *= 15.0 // Convert hours to degrees
	}

	return NormalizeRA(ra), nil
}

// parseDec parses Dec from string (DMS or decimal)
func parseDec(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty Dec")
	}

	// Check sign
	sign := 1.0
	if strings.HasPrefix(s, "-") {
		sign = -1.0
		s = s[1:]
	} else if strings.HasPrefix(s, "+") {
		s = s[1:]
	}

	// Check for DMS format
	if strings.Contains(s, ":") || strings.Contains(s, " ") || strings.Contains(s, "°") {
		parts := strings.FieldsFunc(s, func(r rune) bool {
			return r == ':' || r == ' ' || r == '°' || r == '\'' || r == '"'
		})

		if len(parts) < 1 {
			return 0, fmt.Errorf("invalid DMS format")
		}

		d, err := strconv.ParseFloat(parts[0], 64)
		if err != nil {
			return 0, err
		}
		var m, sec float64
		if len(parts) >= 2 {
			m, _ = strconv.ParseFloat(parts[1], 64)
		}
		if len(parts) >= 3 {
			sec, _ = strconv.ParseFloat(parts[2], 64)
		}

		dec := sign * (d + m/60.0 + sec/3600.0)
		return NormalizeDec(dec), nil
	}

	// Decimal format
	dec, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}

	return NormalizeDec(sign * dec), nil
}

// normalizeID normalizes an object ID for lookup
func normalizeID(id string) string {
	id = strings.ToUpper(strings.TrimSpace(id))
	// Remove spaces in IDs like "NGC 7000" -> "NGC7000"
	id = strings.ReplaceAll(id, " ", "")
	return id
}

// buildIndex creates the spatial index
func (d *DSOCatalogImpl) buildIndex() {
	// Use larger bands for DSO catalogs (fewer objects, larger structures)
	d.index = NewSpatialIndex(15.0)

	for i, obj := range d.objectList {
		d.index.Add(obj.RA, obj.Dec, i)
	}

	d.index.Compact()
}

// buildTypeIndex groups objects by type
func (d *DSOCatalogImpl) buildTypeIndex() {
	d.byType = make(map[ObjectType][]int)

	for i, obj := range d.objectList {
		d.byType[obj.Type] = append(d.byType[obj.Type], i)
	}
}

// GetObject returns an object by its ID
func (d *DSOCatalogImpl) GetObject(ctx context.Context, id string) (*DeepSkyObject, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return nil, ErrCatalogNotLoaded
	}

	normalID := normalizeID(id)

	// Check direct lookup
	if obj, ok := d.objects[normalID]; ok {
		return obj, nil
	}

	// Check cross-index
	if primaryID, ok := d.crossIndex[normalID]; ok {
		return d.objects[primaryID], nil
	}

	return nil, ErrObjectNotFound
}

// ConeSearch returns DSOs within a cone centered on RA/Dec
func (d *DSOCatalogImpl) ConeSearch(ctx context.Context, query ConeSearchQuery) ([]DeepSkyObject, error) {
	if err := query.Validate(); err != nil {
		return nil, err
	}

	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return nil, ErrCatalogNotLoaded
	}

	// Get candidates from spatial index
	candidates := d.index.Query(query.RA, query.Dec, query.Radius)

	// Filter candidates
	results := make([]DeepSkyObject, 0, len(candidates)/2)

	typeFilter := make(map[ObjectType]bool)
	for _, t := range query.ObjectTypes {
		typeFilter[t] = true
	}

	for _, idx := range candidates {
		obj := d.objectList[idx]

		// Type filter
		if len(typeFilter) > 0 && !typeFilter[obj.Type] {
			continue
		}

		// Magnitude filter
		if query.MagLimit > 0 && obj.VMag > query.MagLimit {
			continue
		}
		if query.MinMag != 0 && obj.VMag < query.MinMag {
			continue
		}

		// Distance check
		dist := AngularDistance(query.RA, query.Dec, obj.RA, obj.Dec)
		if dist > query.Radius {
			continue
		}

		results = append(results, obj)

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

// ByType returns all objects of a specific type
func (d *DSOCatalogImpl) ByType(ctx context.Context, objType ObjectType) ([]DeepSkyObject, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return nil, ErrCatalogNotLoaded
	}

	indices, ok := d.byType[objType]
	if !ok {
		return []DeepSkyObject{}, nil
	}

	results := make([]DeepSkyObject, len(indices))
	for i, idx := range indices {
		results[i] = d.objectList[idx]
	}

	return results, nil
}

// GetAll returns all objects in the catalog
func (d *DSOCatalogImpl) GetAll(ctx context.Context) ([]DeepSkyObject, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return nil, ErrCatalogNotLoaded
	}

	result := make([]DeepSkyObject, len(d.objectList))
	copy(result, d.objectList)
	return result, nil
}

// Add adds an object to the catalog
func (d *DSOCatalogImpl) Add(obj DeepSkyObject) {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.objects[obj.ID] = &obj
	idx := len(d.objectList)
	d.objectList = append(d.objectList, obj)

	// Update cross-index
	for _, altName := range obj.CatalogNames {
		d.crossIndex[normalizeID(altName)] = obj.ID
	}
	if obj.CommonName != "" {
		d.crossIndex[normalizeID(obj.CommonName)] = obj.ID
	}

	// Update type index
	d.byType[obj.Type] = append(d.byType[obj.Type], idx)

	// Update spatial index
	if d.index != nil {
		d.index.Add(obj.RA, obj.Dec, idx)
	}
}

// ExportJSON exports the catalog to JSON
func (d *DSOCatalogImpl) ExportJSON(w io.Writer, compress bool) error {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return ErrCatalogNotLoaded
	}

	var writer io.Writer = w
	var gzw *gzip.Writer

	if compress {
		gzw = gzip.NewWriter(w)
		defer gzw.Close()
		writer = gzw
	}

	encoder := json.NewEncoder(writer)
	encoder.SetIndent("", "  ")

	return encoder.Encode(d.objectList)
}

// ExportBinary exports to binary format
func (d *DSOCatalogImpl) ExportBinary(w io.Writer) error {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return ErrCatalogNotLoaded
	}

	gzw := gzip.NewWriter(w)
	defer gzw.Close()

	// Write count
	numObjects := uint32(len(d.objectList))
	if err := binary.Write(gzw, binary.LittleEndian, numObjects); err != nil {
		return fmt.Errorf("write count: %w", err)
	}

	// Write objects
	for _, obj := range d.objectList {
		if err := writeBinaryDSO(gzw, obj); err != nil {
			return fmt.Errorf("write %s: %w", obj.ID, err)
		}
	}

	return nil
}

// writeBinaryDSO writes a DSO in compact binary format
func writeBinaryDSO(w io.Writer, obj DeepSkyObject) error {
	// Write ID (length-prefixed string)
	idBytes := []byte(obj.ID)
	if err := binary.Write(w, binary.LittleEndian, uint8(len(idBytes))); err != nil {
		return err
	}
	if _, err := w.Write(idBytes); err != nil {
		return err
	}

	// Write coordinates and basic properties
	if err := binary.Write(w, binary.LittleEndian, obj.RA); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, obj.Dec); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, float32(obj.VMag)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, float32(obj.MajorAxis)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, float32(obj.MinorAxis)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, uint8(objectTypeToInt(obj.Type))); err != nil {
		return err
	}

	return nil
}

// objectTypeToInt converts ObjectType to int for binary encoding
func objectTypeToInt(t ObjectType) int {
	switch t {
	case ObjectTypeStar:
		return 0
	case ObjectTypeGalaxy:
		return 1
	case ObjectTypeNebula:
		return 2
	case ObjectTypePlanetary:
		return 3
	case ObjectTypeOpenCluster:
		return 4
	case ObjectTypeGlobular:
		return 5
	case ObjectTypeClusterNebula:
		return 6
	default:
		return 7
	}
}

// Embedded data placeholders
var (
	embeddedMessierData []byte
	embeddedNGCData     []byte
	embeddedICData      []byte
)

// SetEmbeddedMessierData sets the embedded Messier catalog data
func SetEmbeddedMessierData(data []byte) {
	embeddedMessierData = data
}

// SetEmbeddedNGCData sets the embedded NGC catalog data
func SetEmbeddedNGCData(data []byte) {
	embeddedNGCData = data
}

// SetEmbeddedICData sets the embedded IC catalog data
func SetEmbeddedICData(data []byte) {
	embeddedICData = data
}

// GetTypeStats returns object counts by type
func (d *DSOCatalogImpl) GetTypeStats() map[ObjectType]int {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := make(map[ObjectType]int)
	for t, indices := range d.byType {
		stats[t] = len(indices)
	}
	return stats
}

// GetBrightest returns the N brightest objects
func (d *DSOCatalogImpl) GetBrightest(ctx context.Context, n int) ([]DeepSkyObject, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if !d.loaded {
		return nil, ErrCatalogNotLoaded
	}

	// Sort by magnitude
	sorted := make([]DeepSkyObject, len(d.objectList))
	copy(sorted, d.objectList)

	sort.Slice(sorted, func(i, j int) bool {
		// Handle objects without magnitudes
		if sorted[i].VMag == 0 {
			return false
		}
		if sorted[j].VMag == 0 {
			return true
		}
		return sorted[i].VMag < sorted[j].VMag
	})

	if n > len(sorted) {
		n = len(sorted)
	}

	return sorted[:n], nil
}
