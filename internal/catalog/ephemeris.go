package catalog

import (
	"math"
	"time"
)

// SolarSystemBody represents a solar system object
type SolarSystemBody string

const (
	BodySun     SolarSystemBody = "sun"
	BodyMoon    SolarSystemBody = "moon"
	BodyMercury SolarSystemBody = "mercury"
	BodyVenus   SolarSystemBody = "venus"
	BodyMars    SolarSystemBody = "mars"
	BodyJupiter SolarSystemBody = "jupiter"
	BodySaturn  SolarSystemBody = "saturn"
	BodyUranus  SolarSystemBody = "uranus"
	BodyNeptune SolarSystemBody = "neptune"
)

// SolarSystemPosition contains position and visibility info for a solar system body
type SolarSystemPosition struct {
	Body SolarSystemBody `json:"body"`

	// Geocentric equatorial coordinates (J2000)
	RA  float64 `json:"ra"`  // degrees
	Dec float64 `json:"dec"` // degrees

	// Distance from Earth
	Distance float64 `json:"distance"` // AU for planets, km for Moon

	// Phase information
	Phase        float64 `json:"phase"`        // 0-1 (for Moon and inner planets)
	Illumination float64 `json:"illumination"` // 0-100%

	// Angular diameter in arcseconds
	AngularDiameter float64 `json:"angular_diameter"`

	// Magnitude (visual magnitude)
	Magnitude float64 `json:"magnitude"`

	// Constellation the object is currently in
	Constellation string `json:"constellation,omitempty"`
}

// Ephemeris calculates positions of solar system bodies
type Ephemeris struct {
	observer *Observer
}

// NewEphemeris creates a new ephemeris calculator for the given observer location
func NewEphemeris(observer *Observer) *Ephemeris {
	return &Ephemeris{observer: observer}
}

// GetSunPosition calculates the Sun's position at the given time
func (e *Ephemeris) GetSunPosition(t time.Time) SolarSystemPosition {
	ra, dec := approximateSunPosition(t)

	return SolarSystemPosition{
		Body:            BodySun,
		RA:              ra,
		Dec:             dec,
		Distance:        1.0, // 1 AU by definition
		Phase:           0,   // Sun has no phase
		Illumination:    100,
		AngularDiameter: 1920, // ~32 arcminutes = 1920 arcseconds
		Magnitude:       -26.74,
	}
}

// GetMoonPosition calculates the Moon's position at the given time
func (e *Ephemeris) GetMoonPosition(t time.Time) SolarSystemPosition {
	// Low-precision moon position
	// Sufficient for planning and display purposes

	jd := JulianDate(t)
	d := jd - J2000 // Days since J2000.0

	// Moon's orbital elements
	// Mean longitude
	L := math.Mod(218.316+13.176396*d, 360)
	if L < 0 {
		L += 360
	}

	// Mean anomaly
	M := math.Mod(134.963+13.064993*d, 360)
	if M < 0 {
		M += 360
	}
	MRad := M * deg2rad

	// Mean distance from ascending node
	F := math.Mod(93.272+13.229350*d, 360)
	if F < 0 {
		F += 360
	}
	FRad := F * deg2rad

	// Ecliptic longitude
	lambda := L + 6.289*math.Sin(MRad)
	lambdaRad := lambda * deg2rad

	// Ecliptic latitude
	beta := 5.128 * math.Sin(FRad)
	betaRad := beta * deg2rad

	// Distance in Earth radii
	dist := 385001 - 20905*math.Cos(MRad) // km

	// Convert ecliptic to equatorial
	epsRad := obliquity * deg2rad

	// RA
	ra := math.Atan2(
		math.Sin(lambdaRad)*math.Cos(epsRad)-math.Tan(betaRad)*math.Sin(epsRad),
		math.Cos(lambdaRad),
	) * rad2deg
	if ra < 0 {
		ra += 360
	}

	// Dec
	dec := math.Asin(
		math.Sin(betaRad)*math.Cos(epsRad)+
			math.Cos(betaRad)*math.Sin(epsRad)*math.Sin(lambdaRad),
	) * rad2deg

	// Phase (simplified)
	phase := MoonPhase(t)
	illumination := MoonIllumination(phase)

	// Angular diameter varies with distance
	// Mean diameter is about 31.1 arcminutes at mean distance
	angularDiam := 1873200 / dist // arcseconds (approx)

	// Magnitude varies with phase
	// Full moon: -12.7, new moon: undefined
	// Approximate based on illumination
	magnitude := -12.7 + 2.5*math.Log10(1.0/(illumination/100.0+0.01))

	return SolarSystemPosition{
		Body:            BodyMoon,
		RA:              ra,
		Dec:             dec,
		Distance:        dist,
		Phase:           phase,
		Illumination:    illumination,
		AngularDiameter: angularDiam,
		Magnitude:       magnitude,
	}
}

// GetPlanetPosition calculates a planet's approximate position
// Uses simplified orbital elements - suitable for planning, not precise ephemerides
func (e *Ephemeris) GetPlanetPosition(body SolarSystemBody, t time.Time) SolarSystemPosition {
	jd := JulianDate(t)
	d := jd - J2000

	// Orbital elements for each planet (simplified)
	var L, a, ec, inc, omega, perihelion float64

	switch body {
	case BodyMercury:
		L = math.Mod(252.251+149474.0722*d/36525, 360)
		a = 0.38710
		ec = 0.20563
		inc = 7.005
		omega = 48.331
		perihelion = 77.456
	case BodyVenus:
		L = math.Mod(181.980+58519.2130*d/36525, 360)
		a = 0.72333
		ec = 0.00677
		inc = 3.395
		omega = 76.680
		perihelion = 131.533
	case BodyMars:
		L = math.Mod(355.433+19141.6964*d/36525, 360)
		a = 1.52368
		ec = 0.09340
		inc = 1.850
		omega = 49.558
		perihelion = 336.060
	case BodyJupiter:
		L = math.Mod(34.351+3036.3027*d/36525, 360)
		a = 5.20260
		ec = 0.04849
		inc = 1.303
		omega = 100.464
		perihelion = 14.331
	case BodySaturn:
		L = math.Mod(50.077+1223.5110*d/36525, 360)
		a = 9.55491
		ec = 0.05551
		inc = 2.489
		omega = 113.665
		perihelion = 93.057
	case BodyUranus:
		L = math.Mod(314.055+429.8640*d/36525, 360)
		a = 19.21845
		ec = 0.04630
		inc = 0.773
		omega = 74.006
		perihelion = 173.005
	case BodyNeptune:
		L = math.Mod(304.349+219.8833*d/36525, 360)
		a = 30.11039
		ec = 0.00899
		inc = 1.770
		omega = 131.784
		perihelion = 48.124
	default:
		return SolarSystemPosition{Body: body}
	}

	// Calculate position (simplified Kepler solution)
	M := L - perihelion // Mean anomaly
	if M < 0 {
		M += 360
	}
	MRad := M * deg2rad

	// Eccentric anomaly (first approximation)
	E := M + ec*rad2deg*math.Sin(MRad)*(1+ec*math.Cos(MRad))
	ERad := E * deg2rad

	// True anomaly
	xv := a * (math.Cos(ERad) - ec)
	yv := a * math.Sqrt(1-ec*ec) * math.Sin(ERad)
	v := math.Atan2(yv, xv) * rad2deg
	r := math.Sqrt(xv*xv + yv*yv)

	// Heliocentric ecliptic longitude
	lHelio := v + perihelion

	// Convert to geocentric (approximate - assumes circular Earth orbit)
	sunPos := e.GetSunPosition(t)
	sunLong := sunPos.RA // Approximation

	// Simplified geocentric position
	// This is a rough approximation for outer planets
	xg := r*math.Cos(lHelio*deg2rad) + math.Cos(sunLong*deg2rad)
	yg := r*math.Sin(lHelio*deg2rad) + math.Sin(sunLong*deg2rad)
	zg := r * math.Sin(inc*deg2rad) * math.Sin((lHelio-omega)*deg2rad)

	// Geocentric equatorial
	epsRad := obliquity * deg2rad
	xe := xg
	ye := yg*math.Cos(epsRad) - zg*math.Sin(epsRad)
	ze := yg*math.Sin(epsRad) + zg*math.Cos(epsRad)

	ra := math.Atan2(ye, xe) * rad2deg
	if ra < 0 {
		ra += 360
	}
	dec := math.Atan2(ze, math.Sqrt(xe*xe+ye*ye)) * rad2deg

	// Distance from Earth (approximate)
	dist := math.Sqrt(xg*xg + yg*yg + zg*zg)

	// Magnitude (very rough approximation)
	var mag float64
	switch body {
	case BodyMercury:
		mag = -0.4 + 5*math.Log10(dist*a)
	case BodyVenus:
		mag = -4.4 + 5*math.Log10(dist*a)
	case BodyMars:
		mag = -1.5 + 5*math.Log10(dist*a)
	case BodyJupiter:
		mag = -2.9 + 5*math.Log10(dist*a)
	case BodySaturn:
		mag = -0.5 + 5*math.Log10(dist*a)
	case BodyUranus:
		mag = 5.5 + 5*math.Log10(dist*a)
	case BodyNeptune:
		mag = 7.8 + 5*math.Log10(dist*a)
	}

	// Angular diameter
	var baseSize float64 // at 1 AU in arcseconds
	switch body {
	case BodyMercury:
		baseSize = 6.7
	case BodyVenus:
		baseSize = 16.7
	case BodyMars:
		baseSize = 9.4
	case BodyJupiter:
		baseSize = 46.9
	case BodySaturn:
		baseSize = 19.4 // disk only
	case BodyUranus:
		baseSize = 3.9
	case BodyNeptune:
		baseSize = 2.3
	}
	angularDiam := baseSize / dist

	return SolarSystemPosition{
		Body:            body,
		RA:              ra,
		Dec:             dec,
		Distance:        dist,
		AngularDiameter: angularDiam,
		Magnitude:       mag,
	}
}

// GetAllVisiblePlanets returns all planets currently above the horizon
func (e *Ephemeris) GetAllVisiblePlanets(t time.Time, minAltitude float64) []SolarSystemPosition {
	planets := []SolarSystemBody{
		BodyMercury, BodyVenus, BodyMars, BodyJupiter,
		BodySaturn, BodyUranus, BodyNeptune,
	}

	visible := make([]SolarSystemPosition, 0)

	for _, body := range planets {
		pos := e.GetPlanetPosition(body, t)
		coords := EquatorialToHorizontal(pos.RA, pos.Dec, e.observer, t)

		if coords.Altitude > minAltitude {
			visible = append(visible, pos)
		}
	}

	return visible
}

// ImagingConditions assesses overall imaging conditions
type ImagingConditions struct {
	// MoonUp indicates if the moon is above the horizon
	MoonUp bool `json:"moon_up"`

	// MoonAltitude in degrees (negative = below horizon)
	MoonAltitude float64 `json:"moon_altitude"`

	// MoonPhase from 0 (new) to 1 (full)
	MoonPhase float64 `json:"moon_phase"`

	// MoonIllumination percentage
	MoonIllumination float64 `json:"moon_illumination"`

	// IsDark indicates astronomical darkness (sun > 18° below horizon)
	IsDark bool `json:"is_dark"`

	// SunAltitude in degrees (negative = below horizon)
	SunAltitude float64 `json:"sun_altitude"`

	// SkyQuality rough estimate (1=poor/bright, 5=excellent/dark)
	SkyQuality int `json:"sky_quality"`

	// Description human-readable summary
	Description string `json:"description"`
}

// GetImagingConditions assesses the current imaging conditions
func (e *Ephemeris) GetImagingConditions(t time.Time) ImagingConditions {
	cond := ImagingConditions{}

	// Sun position
	sunPos := e.GetSunPosition(t)
	sunCoords := EquatorialToHorizontal(sunPos.RA, sunPos.Dec, e.observer, t)
	cond.SunAltitude = sunCoords.Altitude
	cond.IsDark = sunCoords.Altitude < -18

	// Moon position
	moonPos := e.GetMoonPosition(t)
	moonCoords := EquatorialToHorizontal(moonPos.RA, moonPos.Dec, e.observer, t)
	cond.MoonAltitude = moonCoords.Altitude
	cond.MoonUp = moonCoords.Altitude > 0
	cond.MoonPhase = moonPos.Phase
	cond.MoonIllumination = moonPos.Illumination

	// Assess sky quality (simplified)
	// Based on sun altitude and moon presence/phase
	if !cond.IsDark {
		cond.SkyQuality = 1
		if sunCoords.Altitude > 0 {
			cond.Description = "Daytime - no imaging possible"
		} else if sunCoords.Altitude > -6 {
			cond.Description = "Civil twilight - very limited imaging"
		} else if sunCoords.Altitude > -12 {
			cond.Description = "Nautical twilight - bright targets only"
		} else {
			cond.Description = "Astronomical twilight - limited deep sky"
		}
	} else {
		// Night - check moon
		if cond.MoonUp && cond.MoonIllumination > 80 {
			cond.SkyQuality = 2
			cond.Description = "Bright moon - narrowband or bright targets"
		} else if cond.MoonUp && cond.MoonIllumination > 40 {
			cond.SkyQuality = 3
			cond.Description = "Moon present - some sky glow"
		} else if cond.MoonUp && cond.MoonIllumination > 10 {
			cond.SkyQuality = 4
			cond.Description = "Crescent moon - good conditions"
		} else {
			cond.SkyQuality = 5
			cond.Description = "Dark sky - excellent conditions"
		}
	}

	return cond
}

// GetNextDarkWindow finds the next period of astronomical darkness
// Returns start and end times, or zero times if no darkness tonight
func (e *Ephemeris) GetNextDarkWindow(t time.Time) (start, end time.Time) {
	twilight := CalculateTwilight(e.observer, t)

	// If currently in darkness
	sunPos := e.GetSunPosition(t)
	sunCoords := EquatorialToHorizontal(sunPos.RA, sunPos.Dec, e.observer, t)

	if sunCoords.Altitude < -18 {
		// Already dark - find when it ends
		start = t
		end = twilight.AstronomicalDawn
		return
	}

	// Not dark yet - return tonight's window
	start = twilight.AstronomicalDusk
	end = twilight.AstronomicalDawn

	// If dawn is before dusk, add a day to dawn
	if !end.IsZero() && !start.IsZero() && end.Before(start) {
		end = end.Add(24 * time.Hour)
	}

	return
}
