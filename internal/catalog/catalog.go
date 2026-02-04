// Package catalog provides astronomical object catalogs for sky simulation.
//
// This package includes:
//   - Hipparcos star catalog (~118K stars with positions and magnitudes)
//   - Deep Sky Object catalogs (Messier, NGC, IC)
//   - Spatial indexing for efficient cone searches
//   - Time/location-based visibility calculations
//
// All catalogs can be embedded into the binary for zero-dependency deployment.
package catalog

import (
	"context"
	"errors"
	"math"
)

// Sentinel errors for catalog operations
var (
	// ErrCatalogNotLoaded is returned when querying a catalog that hasn't been loaded
	ErrCatalogNotLoaded = errors.New("catalog not loaded")

	// ErrObjectNotFound is returned when an object is not found in the catalog
	ErrObjectNotFound = errors.New("object not found")

	// ErrInvalidCoordinates is returned when coordinates are out of range
	ErrInvalidCoordinates = errors.New("invalid coordinates")

	// ErrInvalidQuery is returned when query parameters are invalid
	ErrInvalidQuery = errors.New("invalid query parameters")
)

// CatalogType identifies different astronomical catalogs
type CatalogType string

const (
	CatalogTypeHipparcos CatalogType = "hipparcos"
	CatalogTypeMessier   CatalogType = "messier"
	CatalogTypeNGC       CatalogType = "ngc"
	CatalogTypeIC        CatalogType = "ic"
)

// ObjectType identifies the type of astronomical object
type ObjectType string

const (
	ObjectTypeStar          ObjectType = "star"
	ObjectTypeGalaxy        ObjectType = "galaxy"
	ObjectTypeNebula        ObjectType = "nebula"
	ObjectTypePlanetary     ObjectType = "planetary_nebula"
	ObjectTypeOpenCluster   ObjectType = "open_cluster"
	ObjectTypeGlobular      ObjectType = "globular_cluster"
	ObjectTypeClusterNebula ObjectType = "cluster_nebula" // Combined cluster and nebula
	ObjectTypeUnknown       ObjectType = "unknown"
)

// GalaxyMorphology describes galaxy types
type GalaxyMorphology string

const (
	GalaxySpiral     GalaxyMorphology = "spiral"
	GalaxyElliptical GalaxyMorphology = "elliptical"
	GalaxyLenticular GalaxyMorphology = "lenticular"
	GalaxyIrregular  GalaxyMorphology = "irregular"
	GalaxyBarred     GalaxyMorphology = "barred_spiral"
)

// Star represents a star from the Hipparcos catalog
type Star struct {
	// HIP is the Hipparcos catalog number
	HIP int `json:"hip"`

	// RA is the right ascension in degrees (J2000)
	RA float64 `json:"ra"`

	// Dec is the declination in degrees (J2000)
	Dec float64 `json:"dec"`

	// VMag is the visual magnitude
	VMag float64 `json:"vmag"`

	// BV is the B-V color index
	BV float64 `json:"bv"`

	// Parallax in milliarcseconds
	Parallax float64 `json:"parallax,omitempty"`

	// ProperMotionRA in milliarcseconds/year
	ProperMotionRA float64 `json:"pm_ra,omitempty"`

	// ProperMotionDec in milliarcseconds/year
	ProperMotionDec float64 `json:"pm_dec,omitempty"`

	// SpectralType is the spectral classification (e.g., "G2V")
	SpectralType string `json:"spectral_type,omitempty"`

	// Name is the common name if any (e.g., "Vega", "Polaris")
	Name string `json:"name,omitempty"`

	// Bayer is the Bayer designation (e.g., "Alpha Lyrae")
	Bayer string `json:"bayer,omitempty"`
}

// Distance returns the distance in parsecs based on parallax
// Returns 0 if parallax is not available or invalid
func (s *Star) Distance() float64 {
	if s.Parallax <= 0 {
		return 0
	}
	return 1000.0 / s.Parallax
}

// AbsoluteMagnitude calculates the absolute magnitude
// Returns 0 if distance cannot be calculated
func (s *Star) AbsoluteMagnitude() float64 {
	d := s.Distance()
	if d <= 0 {
		return 0
	}
	return s.VMag - 5*math.Log10(d) + 5
}

// DeepSkyObject represents a deep sky object (galaxy, nebula, cluster)
type DeepSkyObject struct {
	// ID is the primary catalog identifier (e.g., "M31", "NGC224")
	ID string `json:"id"`

	// CommonName is the popular name (e.g., "Andromeda Galaxy")
	CommonName string `json:"common_name,omitempty"`

	// CatalogNames contains alternative identifiers
	// e.g., M31 is also NGC224 and UGC454
	CatalogNames []string `json:"catalog_names,omitempty"`

	// RA is the right ascension in degrees (J2000)
	RA float64 `json:"ra"`

	// Dec is the declination in degrees (J2000)
	Dec float64 `json:"dec"`

	// Type identifies what kind of object this is
	Type ObjectType `json:"type"`

	// VMag is the integrated visual magnitude
	VMag float64 `json:"vmag"`

	// SurfaceBrightness in magnitudes per square arcminute
	SurfaceBrightness float64 `json:"surface_brightness,omitempty"`

	// MajorAxis is the apparent size in arcminutes (major axis)
	MajorAxis float64 `json:"major_axis,omitempty"`

	// MinorAxis is the apparent size in arcminutes (minor axis)
	MinorAxis float64 `json:"minor_axis,omitempty"`

	// PositionAngle in degrees (N through E)
	PositionAngle float64 `json:"position_angle,omitempty"`

	// Distance in megaparsecs (for extragalactic objects)
	Distance float64 `json:"distance,omitempty"`

	// Morphology for galaxies
	Morphology GalaxyMorphology `json:"morphology,omitempty"`

	// Constellation is the constellation containing the object
	Constellation string `json:"constellation,omitempty"`

	// Description is a brief description of the object
	Description string `json:"description,omitempty"`

	// Difficulty is a 1-5 rating of imaging difficulty
	// 1=easy (M42), 5=difficult (faint NGC objects)
	Difficulty int `json:"difficulty,omitempty"`

	// MinExposure is the recommended minimum total exposure in seconds
	MinExposure float64 `json:"min_exposure,omitempty"`
}

// ApparentArea returns the apparent area in square arcminutes
func (d *DeepSkyObject) ApparentArea() float64 {
	if d.MajorAxis <= 0 {
		return 0
	}
	minor := d.MinorAxis
	if minor <= 0 {
		minor = d.MajorAxis
	}
	return math.Pi * d.MajorAxis * minor / 4.0
}

// ConeSearchQuery defines parameters for a cone search
type ConeSearchQuery struct {
	// RA is the center right ascension in degrees
	RA float64

	// Dec is the center declination in degrees
	Dec float64

	// Radius is the search radius in degrees
	Radius float64

	// MagLimit is the limiting magnitude (faintest stars to include)
	// Use 0 or negative for no limit
	MagLimit float64

	// MinMag is the brightest magnitude to include (for filtering out bright stars)
	// Use 0 or negative for no limit
	MinMag float64

	// ObjectTypes filters to specific object types (empty = all types)
	ObjectTypes []ObjectType

	// MaxResults limits the number of results (0 = unlimited)
	MaxResults int
}

// Validate checks if the query parameters are valid
func (q *ConeSearchQuery) Validate() error {
	if q.RA < 0 || q.RA >= 360 {
		return ErrInvalidCoordinates
	}
	if q.Dec < -90 || q.Dec > 90 {
		return ErrInvalidCoordinates
	}
	if q.Radius <= 0 || q.Radius > 180 {
		return ErrInvalidQuery
	}
	return nil
}

// StarCatalog provides access to star catalogs
type StarCatalog interface {
	// Load loads the catalog data
	Load(ctx context.Context) error

	// IsLoaded returns true if the catalog has been loaded
	IsLoaded() bool

	// GetStar returns a star by its catalog ID
	GetStar(ctx context.Context, id int) (*Star, error)

	// ConeSearch returns stars within a cone centered on RA/Dec
	ConeSearch(ctx context.Context, query ConeSearchQuery) ([]Star, error)

	// Count returns the total number of stars in the catalog
	Count() int

	// Name returns the catalog name
	Name() string
}

// DSOCatalog provides access to deep sky object catalogs
type DSOCatalog interface {
	// Load loads the catalog data
	Load(ctx context.Context) error

	// IsLoaded returns true if the catalog has been loaded
	IsLoaded() bool

	// GetObject returns an object by its ID (e.g., "M31", "NGC224")
	GetObject(ctx context.Context, id string) (*DeepSkyObject, error)

	// ConeSearch returns DSOs within a cone centered on RA/Dec
	ConeSearch(ctx context.Context, query ConeSearchQuery) ([]DeepSkyObject, error)

	// ByType returns all objects of a specific type
	ByType(ctx context.Context, objType ObjectType) ([]DeepSkyObject, error)

	// Count returns the total number of objects in the catalog
	Count() int

	// Name returns the catalog name
	Name() string
}

// AngularDistance calculates the angular distance between two points on the sky
// using the Haversine formula. All inputs and output are in degrees.
func AngularDistance(ra1, dec1, ra2, dec2 float64) float64 {
	// Convert to radians
	ra1Rad := ra1 * math.Pi / 180.0
	dec1Rad := dec1 * math.Pi / 180.0
	ra2Rad := ra2 * math.Pi / 180.0
	dec2Rad := dec2 * math.Pi / 180.0

	// Haversine formula
	dra := ra2Rad - ra1Rad
	ddec := dec2Rad - dec1Rad

	a := math.Pow(math.Sin(ddec/2), 2) +
		math.Cos(dec1Rad)*math.Cos(dec2Rad)*math.Pow(math.Sin(dra/2), 2)

	c := 2 * math.Asin(math.Sqrt(a))

	// Convert back to degrees
	return c * 180.0 / math.Pi
}

// NormalizeRA normalizes a right ascension value to [0, 360) degrees
func NormalizeRA(ra float64) float64 {
	for ra < 0 {
		ra += 360
	}
	for ra >= 360 {
		ra -= 360
	}
	return ra
}

// NormalizeDec clamps declination to [-90, 90] degrees
func NormalizeDec(dec float64) float64 {
	if dec > 90 {
		return 90
	}
	if dec < -90 {
		return -90
	}
	return dec
}
