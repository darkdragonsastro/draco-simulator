package game

// EquipmentType categorizes equipment
type EquipmentType string

const (
	EquipmentTypeCamera      EquipmentType = "camera"
	EquipmentTypeMount       EquipmentType = "mount"
	EquipmentTypeFocuser     EquipmentType = "focuser"
	EquipmentTypeFilterWheel EquipmentType = "filter_wheel"
	EquipmentTypeTelescope   EquipmentType = "telescope"
	EquipmentTypeGuider      EquipmentType = "guider"
	EquipmentTypeRotator     EquipmentType = "rotator"
)

// EquipmentTier represents the quality tier of equipment
type EquipmentTier string

const (
	TierStarter      EquipmentTier = "starter"
	TierMidRange     EquipmentTier = "mid_range"
	TierProfessional EquipmentTier = "professional"
	TierPremium      EquipmentTier = "premium"
)

// Equipment represents a piece of virtual equipment
type Equipment struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Type         EquipmentType `json:"type"`
	Tier         EquipmentTier `json:"tier"`
	Price        int           `json:"price"`         // Cost in credits
	RequiredTier PlayerTier    `json:"required_tier"` // Player tier required to purchase

	// Equipment-specific stats (varies by type)
	Stats EquipmentStats `json:"stats"`

	// Icon/image reference
	Icon string `json:"icon,omitempty"`
}

// EquipmentStats holds performance characteristics
type EquipmentStats struct {
	// Camera stats
	SensorWidth      int     `json:"sensor_width,omitempty"`       // pixels
	SensorHeight     int     `json:"sensor_height,omitempty"`      // pixels
	PixelSize        float64 `json:"pixel_size,omitempty"`         // microns
	ReadNoise        float64 `json:"read_noise,omitempty"`         // electrons
	FullWellCapacity int     `json:"full_well_capacity,omitempty"` // electrons
	BitDepth         int     `json:"bit_depth,omitempty"`
	HasCooling       bool    `json:"has_cooling,omitempty"`
	CoolingDelta     float64 `json:"cooling_delta,omitempty"` // degrees below ambient
	QE               float64 `json:"qe,omitempty"`            // quantum efficiency %

	// Mount stats
	TrackingAccuracy float64 `json:"tracking_accuracy,omitempty"` // arcsec/sec periodic error
	SlewSpeed        float64 `json:"slew_speed,omitempty"`        // degrees/sec
	PayloadCapacity  float64 `json:"payload_capacity,omitempty"`  // kg
	HasGOTO          bool    `json:"has_goto,omitempty"`
	HasGuidePort     bool    `json:"has_guide_port,omitempty"`
	MountType        string  `json:"mount_type,omitempty"` // "eq", "altaz", "gem"

	// Focuser stats
	MaxTravel   int     `json:"max_travel,omitempty"`   // steps
	StepSize    float64 `json:"step_size,omitempty"`    // microns per step
	HasTempComp bool    `json:"has_temp_comp,omitempty"`
	Backlash    int     `json:"backlash,omitempty"` // steps

	// Telescope stats
	Aperture    float64 `json:"aperture,omitempty"`     // mm
	FocalLength float64 `json:"focal_length,omitempty"` // mm
	FocalRatio  float64 `json:"focal_ratio,omitempty"`
	OpticsType  string  `json:"optics_type,omitempty"` // "refractor", "reflector", "catadioptric"

	// Filter wheel stats
	FilterCount      int     `json:"filter_count,omitempty"`
	FilterChangeTime float64 `json:"filter_change_time,omitempty"` // seconds

	// Guider stats
	GuiderSensitivity float64 `json:"guider_sensitivity,omitempty"` // relative sensitivity
}

// EquipmentLoadout represents a complete equipment setup
type EquipmentLoadout struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Camera      string `json:"camera"`       // Equipment ID
	Mount       string `json:"mount"`        // Equipment ID
	Focuser     string `json:"focuser"`      // Equipment ID
	FilterWheel string `json:"filter_wheel"` // Equipment ID (optional)
	Telescope   string `json:"telescope"`    // Equipment ID
	Guider      string `json:"guider"`       // Equipment ID (optional)
	Rotator     string `json:"rotator"`      // Equipment ID (optional)
}

// AllEquipment contains all available equipment
var AllEquipment = []Equipment{
	// === CAMERAS ===

	// Starter Cameras
	{
		ID:          "camera_starter_mono",
		Name:        "NovaCam 8M Mono",
		Description: "Entry-level monochrome camera for learning the basics. High read noise but affordable.",
		Type:        EquipmentTypeCamera,
		Tier:        TierStarter,
		Price:       0, // Included in starter kit
		Stats: EquipmentStats{
			SensorWidth:      3096,
			SensorHeight:     2080,
			PixelSize:        5.86,
			ReadNoise:        8.5,
			FullWellCapacity: 30000,
			BitDepth:         12,
			HasCooling:       false,
			QE:               50,
		},
	},
	{
		ID:          "camera_starter_color",
		Name:        "NovaCam 8M Color",
		Description: "Entry-level one-shot color camera. Easy to use but limited sensitivity.",
		Type:        EquipmentTypeCamera,
		Tier:        TierStarter,
		Price:       500,
		Stats: EquipmentStats{
			SensorWidth:      3096,
			SensorHeight:     2080,
			PixelSize:        5.86,
			ReadNoise:        9.0,
			FullWellCapacity: 28000,
			BitDepth:         12,
			HasCooling:       false,
			QE:               45,
		},
	},

	// Mid-Range Cameras
	{
		ID:           "camera_mid_mono",
		Name:         "AstroCam 16M Mono",
		Description:  "Cooled monochrome camera with excellent sensitivity. A significant upgrade.",
		Type:         EquipmentTypeCamera,
		Tier:         TierMidRange,
		Price:        8000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			SensorWidth:      4656,
			SensorHeight:     3520,
			PixelSize:        3.76,
			ReadNoise:        3.5,
			FullWellCapacity: 45000,
			BitDepth:         14,
			HasCooling:       true,
			CoolingDelta:     35,
			QE:               75,
		},
	},
	{
		ID:           "camera_mid_color",
		Name:         "AstroCam 16M Color",
		Description:  "Cooled one-shot color camera with good sensitivity and low noise.",
		Type:         EquipmentTypeCamera,
		Tier:         TierMidRange,
		Price:        7000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			SensorWidth:      4656,
			SensorHeight:     3520,
			PixelSize:        3.76,
			ReadNoise:        4.0,
			FullWellCapacity: 42000,
			BitDepth:         14,
			HasCooling:       true,
			CoolingDelta:     35,
			QE:               60,
		},
	},

	// Professional Cameras
	{
		ID:           "camera_pro_mono",
		Name:         "DeepSky Pro 26M",
		Description:  "Professional-grade cooled camera with exceptional low noise and sensitivity.",
		Type:         EquipmentTypeCamera,
		Tier:         TierProfessional,
		Price:        25000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			SensorWidth:      6248,
			SensorHeight:     4176,
			PixelSize:        3.76,
			ReadNoise:        1.2,
			FullWellCapacity: 51000,
			BitDepth:         16,
			HasCooling:       true,
			CoolingDelta:     45,
			QE:               91,
		},
	},

	// Premium Camera
	{
		ID:           "camera_premium_mono",
		Name:         "UltraDeep 61M",
		Description:  "Ultimate full-frame back-illuminated sensor. The pinnacle of imaging performance.",
		Type:         EquipmentTypeCamera,
		Tier:         TierPremium,
		Price:        75000,
		RequiredTier: TierExpert,
		Stats: EquipmentStats{
			SensorWidth:      9576,
			SensorHeight:     6388,
			PixelSize:        3.76,
			ReadNoise:        0.7,
			FullWellCapacity: 51000,
			BitDepth:         16,
			HasCooling:       true,
			CoolingDelta:     50,
			QE:               95,
		},
	},

	// === MOUNTS ===

	// Starter Mount
	{
		ID:          "mount_starter_altaz",
		Name:        "StarTrack AZ",
		Description: "Basic alt-azimuth mount with motorized tracking. Good for visual and short exposures.",
		Type:        EquipmentTypeMount,
		Tier:        TierStarter,
		Price:       0,
		Stats: EquipmentStats{
			TrackingAccuracy: 15.0, // arcsec/sec PE
			SlewSpeed:        3.0,
			PayloadCapacity:  5.0,
			HasGOTO:          true,
			HasGuidePort:     false,
			MountType:        "altaz",
		},
	},
	{
		ID:          "mount_starter_eq",
		Name:        "StarTrack EQ",
		Description: "Entry-level equatorial mount. Better for imaging than alt-az but still basic.",
		Type:        EquipmentTypeMount,
		Tier:        TierStarter,
		Price:       2000,
		Stats: EquipmentStats{
			TrackingAccuracy: 8.0,
			SlewSpeed:        4.0,
			PayloadCapacity:  8.0,
			HasGOTO:          true,
			HasGuidePort:     true,
			MountType:        "eq",
		},
	},

	// Mid-Range Mounts
	{
		ID:           "mount_mid_eq",
		Name:         "PrecisionStar GEM",
		Description:  "Solid German equatorial mount with good tracking. Suitable for most imaging.",
		Type:         EquipmentTypeMount,
		Tier:         TierMidRange,
		Price:        12000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			TrackingAccuracy: 3.0,
			SlewSpeed:        6.0,
			PayloadCapacity:  18.0,
			HasGOTO:          true,
			HasGuidePort:     true,
			MountType:        "gem",
		},
	},

	// Professional Mounts
	{
		ID:           "mount_pro_gem",
		Name:         "Observatory GEM Pro",
		Description:  "High-precision mount with excellent tracking. Minimal guiding required.",
		Type:         EquipmentTypeMount,
		Tier:         TierProfessional,
		Price:        35000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			TrackingAccuracy: 0.8,
			SlewSpeed:        8.0,
			PayloadCapacity:  35.0,
			HasGOTO:          true,
			HasGuidePort:     true,
			MountType:        "gem",
		},
	},

	// Premium Mount
	{
		ID:           "mount_premium_gem",
		Name:         "UltraMount Direct Drive",
		Description:  "Direct drive mount with virtually no periodic error. Professional observatory quality.",
		Type:         EquipmentTypeMount,
		Tier:         TierPremium,
		Price:        100000,
		RequiredTier: TierExpert,
		Stats: EquipmentStats{
			TrackingAccuracy: 0.2,
			SlewSpeed:        12.0,
			PayloadCapacity:  50.0,
			HasGOTO:          true,
			HasGuidePort:     true,
			MountType:        "gem",
		},
	},

	// === FOCUSERS ===

	// Starter Focuser
	{
		ID:          "focuser_starter",
		Name:        "ManualFocus Basic",
		Description: "Manual focuser with coarse adjustment. Requires patience to achieve focus.",
		Type:        EquipmentTypeFocuser,
		Tier:        TierStarter,
		Price:       0,
		Stats: EquipmentStats{
			MaxTravel:   10000,
			StepSize:    10.0,
			HasTempComp: false,
			Backlash:    50,
		},
	},

	// Mid-Range Focuser
	{
		ID:           "focuser_mid",
		Name:         "MotorFocus Plus",
		Description:  "Motorized focuser with fine control. Makes autofocus practical.",
		Type:         EquipmentTypeFocuser,
		Tier:         TierMidRange,
		Price:        3000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			MaxTravel:   50000,
			StepSize:    2.0,
			HasTempComp: true,
			Backlash:    20,
		},
	},

	// Professional Focuser
	{
		ID:           "focuser_pro",
		Name:         "PrecisionFocus Ultra",
		Description:  "High-precision stepper focuser with minimal backlash and excellent repeatability.",
		Type:         EquipmentTypeFocuser,
		Tier:         TierProfessional,
		Price:        8000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			MaxTravel:   100000,
			StepSize:    0.5,
			HasTempComp: true,
			Backlash:    5,
		},
	},

	// === TELESCOPES ===

	// Starter Telescopes
	{
		ID:          "scope_starter_refractor",
		Name:        "StarView 60mm f/7",
		Description: "Compact achromatic refractor. Good for learning but shows some chromatic aberration.",
		Type:        EquipmentTypeTelescope,
		Tier:        TierStarter,
		Price:       0,
		Stats: EquipmentStats{
			Aperture:    60,
			FocalLength: 420,
			FocalRatio:  7.0,
			OpticsType:  "refractor",
		},
	},

	// Mid-Range Telescopes
	{
		ID:           "scope_mid_apo",
		Name:         "APO 80mm f/6",
		Description:  "Apochromatic triplet refractor with excellent color correction.",
		Type:         EquipmentTypeTelescope,
		Tier:         TierMidRange,
		Price:        10000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			Aperture:    80,
			FocalLength: 480,
			FocalRatio:  6.0,
			OpticsType:  "refractor",
		},
	},
	{
		ID:           "scope_mid_newt",
		Name:         "DeepView 8\" f/4",
		Description:  "Fast Newtonian reflector. Great light gathering for faint objects.",
		Type:         EquipmentTypeTelescope,
		Tier:         TierMidRange,
		Price:        8000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			Aperture:    200,
			FocalLength: 800,
			FocalRatio:  4.0,
			OpticsType:  "reflector",
		},
	},

	// Professional Telescopes
	{
		ID:           "scope_pro_apo",
		Name:         "APO 130mm f/7",
		Description:  "Large apochromatic refractor with superb optics and flat field.",
		Type:         EquipmentTypeTelescope,
		Tier:         TierProfessional,
		Price:        35000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			Aperture:    130,
			FocalLength: 910,
			FocalRatio:  7.0,
			OpticsType:  "refractor",
		},
	},
	{
		ID:           "scope_pro_rcos",
		Name:         "RC 12\" f/8",
		Description:  "Ritchey-Chretien design eliminates coma for sharp stars across the field.",
		Type:         EquipmentTypeTelescope,
		Tier:         TierProfessional,
		Price:        50000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			Aperture:    305,
			FocalLength: 2440,
			FocalRatio:  8.0,
			OpticsType:  "catadioptric",
		},
	},

	// === FILTER WHEELS ===

	// Starter (none - manual filters)

	// Mid-Range Filter Wheel
	{
		ID:           "filterwheel_mid",
		Name:         "FilterSwitch 5",
		Description:  "5-position motorized filter wheel. Enables LRGB and narrowband imaging.",
		Type:         EquipmentTypeFilterWheel,
		Tier:         TierMidRange,
		Price:        4000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			FilterCount:      5,
			FilterChangeTime: 3.0,
		},
	},

	// Professional Filter Wheel
	{
		ID:           "filterwheel_pro",
		Name:         "FilterSwitch 7 Pro",
		Description:  "7-position filter wheel with fast, precise positioning.",
		Type:         EquipmentTypeFilterWheel,
		Tier:         TierProfessional,
		Price:        8000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			FilterCount:      7,
			FilterChangeTime: 1.5,
		},
	},

	// === GUIDERS ===

	// Starter Guider
	{
		ID:          "guider_starter",
		Name:        "GuideScope Basic",
		Description: "Simple guide scope with basic sensitivity. Works for brighter guide stars.",
		Type:        EquipmentTypeGuider,
		Tier:        TierStarter,
		Price:       1500,
		Stats: EquipmentStats{
			GuiderSensitivity: 0.5,
		},
	},

	// Mid-Range Guider
	{
		ID:           "guider_mid",
		Name:         "GuideScope Plus",
		Description:  "Sensitive guide camera finds fainter stars for more reliable guiding.",
		Type:         EquipmentTypeGuider,
		Tier:         TierMidRange,
		Price:        5000,
		RequiredTier: TierIntermediate,
		Stats: EquipmentStats{
			GuiderSensitivity: 1.0,
		},
	},

	// Professional Guider
	{
		ID:           "guider_pro",
		Name:         "OAG Pro",
		Description:  "Off-axis guider eliminates differential flexure for perfect tracking.",
		Type:         EquipmentTypeGuider,
		Tier:         TierProfessional,
		Price:        12000,
		RequiredTier: TierAdvanced,
		Stats: EquipmentStats{
			GuiderSensitivity: 1.5,
		},
	},
}

// equipmentMap provides O(1) lookup by ID
var equipmentMap = make(map[string]*Equipment)

func init() {
	for i := range AllEquipment {
		equipmentMap[AllEquipment[i].ID] = &AllEquipment[i]
	}
}

// GetEquipment returns equipment by ID
func GetEquipment(id string) *Equipment {
	return equipmentMap[id]
}

// GetEquipmentByType returns all equipment of a given type
func GetEquipmentByType(equipType EquipmentType) []Equipment {
	var result []Equipment
	for _, e := range AllEquipment {
		if e.Type == equipType {
			result = append(result, e)
		}
	}
	return result
}

// GetEquipmentByTier returns all equipment of a given tier
func GetEquipmentByTier(tier EquipmentTier) []Equipment {
	var result []Equipment
	for _, e := range AllEquipment {
		if e.Tier == tier {
			result = append(result, e)
		}
	}
	return result
}

// GetAvailableEquipment returns equipment the player can purchase
func GetAvailableEquipment(playerTier PlayerTier, ownedIDs []string) []Equipment {
	owned := make(map[string]bool)
	for _, id := range ownedIDs {
		owned[id] = true
	}

	tierRank := getTierRank(playerTier)

	var result []Equipment
	for _, e := range AllEquipment {
		// Skip if already owned
		if owned[e.ID] {
			continue
		}

		// Check tier requirement
		if e.RequiredTier != "" {
			requiredRank := getTierRank(e.RequiredTier)
			if tierRank < requiredRank {
				continue
			}
		}

		result = append(result, e)
	}

	return result
}

// GetStarterKit returns the default equipment for new players
func GetStarterKit() []string {
	return []string{
		"camera_starter_mono",
		"mount_starter_altaz",
		"focuser_starter",
		"scope_starter_refractor",
	}
}

// StarterLoadout represents the default loadout for new players
var StarterLoadout = EquipmentLoadout{
	ID:          "starter_loadout",
	Name:        "Starter Setup",
	Description: "Basic equipment to begin your astrophotography journey",
	Camera:      "camera_starter_mono",
	Mount:       "mount_starter_altaz",
	Focuser:     "focuser_starter",
	Telescope:   "scope_starter_refractor",
}

// CalculateImageScale returns the image scale in arcsec/pixel
func CalculateImageScale(telescope, camera *Equipment) float64 {
	if telescope == nil || camera == nil {
		return 0
	}

	focalLength := telescope.Stats.FocalLength
	pixelSize := camera.Stats.PixelSize

	if focalLength <= 0 || pixelSize <= 0 {
		return 0
	}

	// Image scale = 206.265 * pixel_size(um) / focal_length(mm)
	return 206.265 * pixelSize / focalLength
}

// CalculateFieldOfView returns the FOV in arcmin (width, height)
func CalculateFieldOfView(telescope, camera *Equipment) (width, height float64) {
	if telescope == nil || camera == nil {
		return 0, 0
	}

	scale := CalculateImageScale(telescope, camera)
	if scale <= 0 {
		return 0, 0
	}

	// FOV in arcmin
	width = float64(camera.Stats.SensorWidth) * scale / 60.0
	height = float64(camera.Stats.SensorHeight) * scale / 60.0

	return width, height
}
