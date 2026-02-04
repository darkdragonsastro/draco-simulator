package game

// VirtualCameraConfig holds configuration for the virtual camera based on equipment
type VirtualCameraConfig struct {
	// Sensor dimensions
	SensorWidth  int `json:"sensor_width"`
	SensorHeight int `json:"sensor_height"`

	// Pixel characteristics
	PixelSize        float64 `json:"pixel_size"`         // microns
	BitDepth         int     `json:"bit_depth"`
	FullWellCapacity int     `json:"full_well_capacity"` // electrons

	// Noise characteristics
	ReadNoise      float64 `json:"read_noise"`       // electrons RMS
	DarkCurrent    float64 `json:"dark_current"`     // electrons/pixel/sec at 20C
	QE             float64 `json:"qe"`               // quantum efficiency (0-1)

	// Cooling
	HasCooling     bool    `json:"has_cooling"`
	CoolingDelta   float64 `json:"cooling_delta"`    // max degrees below ambient
	CoolingPower   float64 `json:"cooling_power"`    // watts at max cooling

	// Additional characteristics
	GainRange      [2]float64 `json:"gain_range"`     // min, max gain
	OffsetRange    [2]int     `json:"offset_range"`   // min, max offset
}

// VirtualMountConfig holds configuration for the virtual mount based on equipment
type VirtualMountConfig struct {
	// Mount type
	MountType      string  `json:"mount_type"`       // "altaz", "eq", "gem"

	// Tracking
	PeriodicError  float64 `json:"periodic_error"`   // arcsec peak-to-peak
	DriftRate      float64 `json:"drift_rate"`       // arcsec/hour polar misalignment
	TrackingJitter float64 `json:"tracking_jitter"`  // arcsec RMS random error

	// Slewing
	MaxSlewSpeed   float64 `json:"max_slew_speed"`   // degrees/sec
	SlewAccel      float64 `json:"slew_accel"`       // degrees/sec^2

	// Limits
	PayloadCapacity float64 `json:"payload_capacity"` // kg
	AltitudeMin     float64 `json:"altitude_min"`     // degrees
	AltitudeMax     float64 `json:"altitude_max"`     // degrees

	// Features
	HasGOTO        bool `json:"has_goto"`
	HasGuidePort   bool `json:"has_guide_port"`
	HasPEC         bool `json:"has_pec"`            // periodic error correction
}

// VirtualFocuserConfig holds configuration for the virtual focuser based on equipment
type VirtualFocuserConfig struct {
	// Travel
	MaxPosition    int     `json:"max_position"`     // steps
	StepSize       float64 `json:"step_size"`        // microns per step

	// Movement
	MaxSpeed       int     `json:"max_speed"`        // steps/sec
	Backlash       int     `json:"backlash"`         // steps

	// Temperature compensation
	HasTempComp    bool    `json:"has_temp_comp"`
	TempCoeff      float64 `json:"temp_coeff"`       // steps per degree C

	// Accuracy
	Repeatability  int     `json:"repeatability"`    // steps
}

// VirtualTelescopeConfig holds optical configuration based on equipment
type VirtualTelescopeConfig struct {
	Aperture       float64 `json:"aperture"`         // mm
	FocalLength    float64 `json:"focal_length"`     // mm
	FocalRatio     float64 `json:"focal_ratio"`
	OpticsType     string  `json:"optics_type"`      // "refractor", "reflector", "catadioptric"

	// Optical quality
	SpotSize       float64 `json:"spot_size"`        // microns RMS at center
	FieldCurvature float64 `json:"field_curvature"`  // mm
	Vignetting     float64 `json:"vignetting"`       // % light loss at edge

	// Aberrations
	ChromaticAberr float64 `json:"chromatic_aberr"`  // 0 = none, 1 = severe
	ComaAmount     float64 `json:"coma_amount"`      // 0 = none, 1 = severe at edge
}

// LoadoutToVirtualConfig converts a loadout to virtual device configurations
func LoadoutToVirtualConfig(loadout EquipmentLoadout) *VirtualLoadoutConfig {
	config := &VirtualLoadoutConfig{}

	// Camera configuration
	if camera := GetEquipment(loadout.Camera); camera != nil {
		config.Camera = equipmentToCameraConfig(camera)
	}

	// Mount configuration
	if mount := GetEquipment(loadout.Mount); mount != nil {
		config.Mount = equipmentToMountConfig(mount)
	}

	// Focuser configuration
	if focuser := GetEquipment(loadout.Focuser); focuser != nil {
		config.Focuser = equipmentToFocuserConfig(focuser)
	}

	// Telescope configuration
	if telescope := GetEquipment(loadout.Telescope); telescope != nil {
		config.Telescope = equipmentToTelescopeConfig(telescope)
	}

	return config
}

// VirtualLoadoutConfig contains all virtual device configurations
type VirtualLoadoutConfig struct {
	Camera    VirtualCameraConfig    `json:"camera"`
	Mount     VirtualMountConfig     `json:"mount"`
	Focuser   VirtualFocuserConfig   `json:"focuser"`
	Telescope VirtualTelescopeConfig `json:"telescope"`
}

// equipmentToCameraConfig converts camera equipment to virtual config
func equipmentToCameraConfig(equip *Equipment) VirtualCameraConfig {
	config := VirtualCameraConfig{
		SensorWidth:      equip.Stats.SensorWidth,
		SensorHeight:     equip.Stats.SensorHeight,
		PixelSize:        equip.Stats.PixelSize,
		BitDepth:         equip.Stats.BitDepth,
		FullWellCapacity: equip.Stats.FullWellCapacity,
		ReadNoise:        equip.Stats.ReadNoise,
		QE:               equip.Stats.QE / 100.0, // Convert percentage to fraction
		HasCooling:       equip.Stats.HasCooling,
		CoolingDelta:     equip.Stats.CoolingDelta,
	}

	// Set defaults based on tier
	switch equip.Tier {
	case TierStarter:
		config.DarkCurrent = 0.5      // Higher dark current
		config.GainRange = [2]float64{0, 100}
		config.OffsetRange = [2]int{0, 50}
		config.CoolingPower = 0

	case TierMidRange:
		config.DarkCurrent = 0.1
		config.GainRange = [2]float64{0, 200}
		config.OffsetRange = [2]int{0, 100}
		config.CoolingPower = 30

	case TierProfessional:
		config.DarkCurrent = 0.01
		config.GainRange = [2]float64{0, 300}
		config.OffsetRange = [2]int{0, 200}
		config.CoolingPower = 50

	case TierPremium:
		config.DarkCurrent = 0.001
		config.GainRange = [2]float64{0, 500}
		config.OffsetRange = [2]int{0, 300}
		config.CoolingPower = 80
	}

	return config
}

// equipmentToMountConfig converts mount equipment to virtual config
func equipmentToMountConfig(equip *Equipment) VirtualMountConfig {
	config := VirtualMountConfig{
		MountType:       equip.Stats.MountType,
		PayloadCapacity: equip.Stats.PayloadCapacity,
		MaxSlewSpeed:    equip.Stats.SlewSpeed,
		HasGOTO:         equip.Stats.HasGOTO,
		HasGuidePort:    equip.Stats.HasGuidePort,
	}

	// Periodic error is the tracking accuracy * 2 (peak-to-peak vs RMS)
	config.PeriodicError = equip.Stats.TrackingAccuracy * 2

	// Set defaults based on tier
	switch equip.Tier {
	case TierStarter:
		config.DriftRate = 30.0       // Poor polar alignment tolerance
		config.TrackingJitter = 2.0   // High random error
		config.SlewAccel = 0.5
		config.AltitudeMin = 10.0
		config.AltitudeMax = 85.0
		config.HasPEC = false

	case TierMidRange:
		config.DriftRate = 10.0
		config.TrackingJitter = 0.5
		config.SlewAccel = 1.0
		config.AltitudeMin = 5.0
		config.AltitudeMax = 88.0
		config.HasPEC = true

	case TierProfessional:
		config.DriftRate = 3.0
		config.TrackingJitter = 0.2
		config.SlewAccel = 2.0
		config.AltitudeMin = 2.0
		config.AltitudeMax = 89.0
		config.HasPEC = true

	case TierPremium:
		config.DriftRate = 1.0
		config.TrackingJitter = 0.05
		config.SlewAccel = 3.0
		config.AltitudeMin = 0.0
		config.AltitudeMax = 90.0
		config.HasPEC = true
	}

	return config
}

// equipmentToFocuserConfig converts focuser equipment to virtual config
func equipmentToFocuserConfig(equip *Equipment) VirtualFocuserConfig {
	config := VirtualFocuserConfig{
		MaxPosition: equip.Stats.MaxTravel,
		StepSize:    equip.Stats.StepSize,
		Backlash:    equip.Stats.Backlash,
		HasTempComp: equip.Stats.HasTempComp,
	}

	// Set defaults based on tier
	switch equip.Tier {
	case TierStarter:
		config.MaxSpeed = 100
		config.Repeatability = 20
		config.TempCoeff = 0 // No temp comp

	case TierMidRange:
		config.MaxSpeed = 500
		config.Repeatability = 5
		config.TempCoeff = 2.5 // steps per degree

	case TierProfessional:
		config.MaxSpeed = 1000
		config.Repeatability = 1
		config.TempCoeff = 2.0

	case TierPremium:
		config.MaxSpeed = 2000
		config.Repeatability = 0
		config.TempCoeff = 1.5
	}

	return config
}

// equipmentToTelescopeConfig converts telescope equipment to virtual config
func equipmentToTelescopeConfig(equip *Equipment) VirtualTelescopeConfig {
	config := VirtualTelescopeConfig{
		Aperture:    equip.Stats.Aperture,
		FocalLength: equip.Stats.FocalLength,
		FocalRatio:  equip.Stats.FocalRatio,
		OpticsType:  equip.Stats.OpticsType,
	}

	// Set optical quality based on type and tier
	switch equip.Stats.OpticsType {
	case "refractor":
		switch equip.Tier {
		case TierStarter:
			config.SpotSize = 15.0
			config.ChromaticAberr = 0.4 // Achromatic has CA
			config.ComaAmount = 0.0
			config.Vignetting = 20.0
			config.FieldCurvature = 2.0

		case TierMidRange, TierProfessional:
			config.SpotSize = 5.0
			config.ChromaticAberr = 0.02 // APO minimal CA
			config.ComaAmount = 0.0
			config.Vignetting = 5.0
			config.FieldCurvature = 0.5

		case TierPremium:
			config.SpotSize = 2.0
			config.ChromaticAberr = 0.01
			config.ComaAmount = 0.0
			config.Vignetting = 2.0
			config.FieldCurvature = 0.1
		}

	case "reflector":
		switch equip.Tier {
		case TierStarter, TierMidRange:
			config.SpotSize = 8.0
			config.ChromaticAberr = 0.0 // Mirrors have no CA
			config.ComaAmount = 0.3     // Newtonian has coma
			config.Vignetting = 15.0
			config.FieldCurvature = 1.5

		case TierProfessional, TierPremium:
			config.SpotSize = 4.0
			config.ChromaticAberr = 0.0
			config.ComaAmount = 0.15
			config.Vignetting = 8.0
			config.FieldCurvature = 0.8
		}

	case "catadioptric":
		switch equip.Tier {
		case TierStarter, TierMidRange:
			config.SpotSize = 6.0
			config.ChromaticAberr = 0.05
			config.ComaAmount = 0.1
			config.Vignetting = 10.0
			config.FieldCurvature = 1.0

		case TierProfessional:
			config.SpotSize = 3.0
			config.ChromaticAberr = 0.02
			config.ComaAmount = 0.0 // RC eliminates coma
			config.Vignetting = 5.0
			config.FieldCurvature = 0.3

		case TierPremium:
			config.SpotSize = 1.5
			config.ChromaticAberr = 0.01
			config.ComaAmount = 0.0
			config.Vignetting = 2.0
			config.FieldCurvature = 0.1
		}
	}

	return config
}

// CalculateExpectedHFR estimates the minimum achievable HFR for a loadout
func CalculateExpectedHFR(config *VirtualLoadoutConfig) float64 {
	if config == nil {
		return 5.0
	}

	// Base HFR from seeing (assume 2" typical)
	hfr := 2.0

	// Add contribution from optics spot size
	if config.Telescope.SpotSize > 0 && config.Camera.PixelSize > 0 {
		// Spot size in pixels
		spotPixels := config.Telescope.SpotSize / config.Camera.PixelSize
		if spotPixels > hfr {
			hfr = spotPixels
		}
	}

	// Add contribution from tracking
	if config.Mount.TrackingJitter > 0 {
		// Tracking adds quadratically
		trackingHFR := config.Mount.TrackingJitter * 0.5
		hfr = sqrt(hfr*hfr + trackingHFR*trackingHFR)
	}

	return hfr
}

// CalculateExpectedSNR estimates achievable SNR for given conditions
func CalculateExpectedSNR(config *VirtualLoadoutConfig, exposureTime float64, targetMag float64) float64 {
	if config == nil || exposureTime <= 0 {
		return 0
	}

	// Simplified SNR calculation
	// Signal = exposure_time * QE * aperture^2 * 10^(-0.4 * magnitude)
	signal := exposureTime * config.Camera.QE *
		(config.Telescope.Aperture * config.Telescope.Aperture / 10000) *
		pow(10, -0.4*targetMag) * 1000000 // arbitrary scaling

	// Noise sources
	readNoise := config.Camera.ReadNoise
	darkNoise := sqrt(config.Camera.DarkCurrent * exposureTime)
	shotNoise := sqrt(signal)
	skyNoise := sqrt(exposureTime * 10) // Simplified sky background

	totalNoise := sqrt(readNoise*readNoise + darkNoise*darkNoise +
		shotNoise*shotNoise + skyNoise*skyNoise)

	if totalNoise <= 0 {
		return 0
	}

	return signal / totalNoise
}

// sqrt is a simple square root approximation
func sqrt(x float64) float64 {
	if x <= 0 {
		return 0
	}
	// Newton's method
	guess := x / 2
	for i := 0; i < 10; i++ {
		guess = (guess + x/guess) / 2
	}
	return guess
}

// pow calculates x^y for positive x
func pow(x, y float64) float64 {
	if x <= 0 {
		return 0
	}
	// Using exp(y * ln(x))
	return exp(y * ln(x))
}

// ln calculates natural log using Taylor series
func ln(x float64) float64 {
	if x <= 0 {
		return 0
	}
	// Normalize to [0.5, 1.5] range
	k := 0
	for x > 1.5 {
		x /= 2.718281828
		k++
	}
	for x < 0.5 {
		x *= 2.718281828
		k--
	}
	// Taylor series around 1
	t := (x - 1) / (x + 1)
	t2 := t * t
	result := 0.0
	term := t
	for i := 1; i < 20; i += 2 {
		result += term / float64(i)
		term *= t2
	}
	return 2*result + float64(k)
}

// exp calculates e^x using Taylor series
func exp(x float64) float64 {
	// Limit range
	if x > 100 {
		return 1e43
	}
	if x < -100 {
		return 0
	}
	result := 1.0
	term := 1.0
	for i := 1; i < 50; i++ {
		term *= x / float64(i)
		result += term
		if term < 1e-15 && term > -1e-15 {
			break
		}
	}
	return result
}
