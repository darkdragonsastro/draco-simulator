package catalog

import (
	"math"
	"sort"
)

// SpatialIndex provides efficient spatial indexing for astronomical coordinates.
// It uses a simple zone-based scheme that divides the sky into declination bands
// with adaptive RA zones based on latitude. This provides O(1) access to nearby
// objects for typical cone search sizes.
//
// The index is optimized for read-heavy workloads after initial construction.
type SpatialIndex struct {
	// zones contains objects grouped by sky region
	// zones[decBand][raZone] = list of object indices
	zones [][][]int

	// decBandSize is the height of each declination band in degrees
	decBandSize float64

	// numDecBands is the number of declination bands
	numDecBands int

	// raZonesPerBand is the number of RA zones in each dec band
	// Polar bands have fewer zones since they cover less area
	raZonesPerBand []int
}

// NewSpatialIndex creates a new spatial index.
// decBandSize controls the granularity - smaller values use more memory
// but provide faster queries for small search radii.
// Recommended: 5.0-15.0 degrees depending on catalog size.
func NewSpatialIndex(decBandSize float64) *SpatialIndex {
	if decBandSize <= 0 {
		decBandSize = 10.0
	}

	numDecBands := int(math.Ceil(180.0 / decBandSize))

	// Calculate RA zones per band based on declination
	// Near poles, use fewer zones since area is smaller
	raZonesPerBand := make([]int, numDecBands)
	for i := 0; i < numDecBands; i++ {
		// Calculate center declination of this band
		decCenter := -90.0 + (float64(i)+0.5)*decBandSize
		// Zones proportional to cos(dec) - fewer zones near poles
		cosWeight := math.Abs(math.Cos(decCenter * math.Pi / 180.0))
		// Minimum 4 zones, maximum 36 zones (10° each at equator)
		numZones := int(math.Max(4, math.Round(36.0*cosWeight)))
		raZonesPerBand[i] = numZones
	}

	// Initialize zone arrays
	zones := make([][][]int, numDecBands)
	for i := 0; i < numDecBands; i++ {
		zones[i] = make([][]int, raZonesPerBand[i])
		for j := 0; j < raZonesPerBand[i]; j++ {
			zones[i][j] = make([]int, 0)
		}
	}

	return &SpatialIndex{
		zones:          zones,
		decBandSize:    decBandSize,
		numDecBands:    numDecBands,
		raZonesPerBand: raZonesPerBand,
	}
}

// getDecBand returns the declination band index for a declination
func (si *SpatialIndex) getDecBand(dec float64) int {
	// Clamp to valid range
	if dec < -90 {
		dec = -90
	}
	if dec > 90 {
		dec = 90
	}

	band := int((dec + 90) / si.decBandSize)
	if band >= si.numDecBands {
		band = si.numDecBands - 1
	}
	return band
}

// getRAZone returns the RA zone index for a given RA and dec band
func (si *SpatialIndex) getRAZone(ra float64, decBand int) int {
	// Normalize RA to [0, 360)
	ra = NormalizeRA(ra)

	numZones := si.raZonesPerBand[decBand]
	zone := int(ra * float64(numZones) / 360.0)
	if zone >= numZones {
		zone = numZones - 1
	}
	return zone
}

// Add adds an object at the given coordinates with the specified index
func (si *SpatialIndex) Add(ra, dec float64, index int) {
	decBand := si.getDecBand(dec)
	raZone := si.getRAZone(ra, decBand)
	si.zones[decBand][raZone] = append(si.zones[decBand][raZone], index)
}

// Query returns indices of objects that might be within the search cone.
// This performs a coarse filter - the caller should do fine-grained
// distance checks on the returned candidates.
func (si *SpatialIndex) Query(ra, dec, radius float64) []int {
	// Determine dec band range
	minDec := dec - radius
	maxDec := dec + radius

	minDecBand := si.getDecBand(minDec)
	maxDecBand := si.getDecBand(maxDec)

	// Collect unique candidates
	seen := make(map[int]bool)
	candidates := make([]int, 0)

	for decBand := minDecBand; decBand <= maxDecBand; decBand++ {
		// Calculate RA range at this declination
		// RA extent increases near poles due to spherical geometry
		decCenter := -90.0 + (float64(decBand)+0.5)*si.decBandSize
		cosDec := math.Cos(decCenter * math.Pi / 180.0)

		var raExtent float64
		if cosDec < 0.001 {
			// Near pole - search all RA zones
			raExtent = 180.0
		} else {
			// Expand RA range based on cos(dec)
			raExtent = radius / cosDec
		}

		// Get RA zone range
		numZones := si.raZonesPerBand[decBand]
		zoneWidth := 360.0 / float64(numZones)

		minRA := NormalizeRA(ra - raExtent)
		maxRA := NormalizeRA(ra + raExtent)

		// Handle RA wrap-around
		if raExtent >= 180 || maxRA < minRA {
			// Search all zones in this band
			for zone := 0; zone < numZones; zone++ {
				for _, idx := range si.zones[decBand][zone] {
					if !seen[idx] {
						seen[idx] = true
						candidates = append(candidates, idx)
					}
				}
			}
		} else {
			// Search specific zone range
			minZone := int(minRA / zoneWidth)
			maxZone := int(maxRA / zoneWidth)
			if minZone >= numZones {
				minZone = numZones - 1
			}
			if maxZone >= numZones {
				maxZone = numZones - 1
			}

			for zone := minZone; zone <= maxZone; zone++ {
				for _, idx := range si.zones[decBand][zone] {
					if !seen[idx] {
						seen[idx] = true
						candidates = append(candidates, idx)
					}
				}
			}
		}
	}

	return candidates
}

// Compact optimizes memory usage after all additions are complete.
// Should be called after building the index.
func (si *SpatialIndex) Compact() {
	for i := range si.zones {
		for j := range si.zones[i] {
			// Sort indices for better cache locality
			sort.Ints(si.zones[i][j])
		}
	}
}

// Stats returns statistics about the index for debugging
func (si *SpatialIndex) Stats() SpatialIndexStats {
	stats := SpatialIndexStats{
		DecBandSize: si.decBandSize,
		NumDecBands: si.numDecBands,
	}

	var totalZones int
	var totalObjects int
	var maxZoneSize int

	for i := range si.zones {
		for j := range si.zones[i] {
			totalZones++
			size := len(si.zones[i][j])
			totalObjects += size
			if size > maxZoneSize {
				maxZoneSize = size
			}
		}
	}

	stats.TotalZones = totalZones
	stats.TotalObjects = totalObjects
	stats.MaxZoneSize = maxZoneSize
	if totalZones > 0 {
		stats.AvgZoneSize = float64(totalObjects) / float64(totalZones)
	}

	return stats
}

// SpatialIndexStats contains statistics about the spatial index
type SpatialIndexStats struct {
	DecBandSize  float64 `json:"dec_band_size"`
	NumDecBands  int     `json:"num_dec_bands"`
	TotalZones   int     `json:"total_zones"`
	TotalObjects int     `json:"total_objects"`
	MaxZoneSize  int     `json:"max_zone_size"`
	AvgZoneSize  float64 `json:"avg_zone_size"`
}
