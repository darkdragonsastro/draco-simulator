package catalog

import (
	"math"
	"time"
)

// Observer represents an observing location
type Observer struct {
	// Latitude in degrees (positive north)
	Latitude float64 `json:"latitude"`

	// Longitude in degrees (positive east)
	Longitude float64 `json:"longitude"`

	// Elevation in meters above sea level
	Elevation float64 `json:"elevation"`

	// Timezone is the local timezone
	Timezone *time.Location `json:"-"`

	// Name is a friendly name for the location
	Name string `json:"name,omitempty"`
}

// NewObserver creates an observer at the given location
func NewObserver(lat, lon, elevation float64) *Observer {
	return &Observer{
		Latitude:  lat,
		Longitude: lon,
		Elevation: elevation,
		Timezone:  time.UTC,
	}
}

// HorizontalCoordinates represents altitude and azimuth
type HorizontalCoordinates struct {
	// Altitude in degrees above horizon (-90 to +90)
	Altitude float64 `json:"altitude"`

	// Azimuth in degrees from north, increasing eastward (0-360)
	Azimuth float64 `json:"azimuth"`
}

// VisibilityInfo contains visibility information for an object
type VisibilityInfo struct {
	// IsVisible indicates if the object is above the horizon
	IsVisible bool `json:"is_visible"`

	// Current horizontal coordinates
	Coords HorizontalCoordinates `json:"coordinates"`

	// HourAngle in hours (-12 to +12)
	HourAngle float64 `json:"hour_angle"`

	// AirMass at current altitude (1.0 at zenith, infinity at horizon)
	AirMass float64 `json:"airmass"`

	// Rise time (if object rises today)
	RiseTime *time.Time `json:"rise_time,omitempty"`

	// Set time (if object sets today)
	SetTime *time.Time `json:"set_time,omitempty"`

	// Transit time (when object crosses meridian)
	TransitTime *time.Time `json:"transit_time,omitempty"`

	// MaxAltitude is the maximum altitude during transit
	MaxAltitude float64 `json:"max_altitude"`

	// IsCircumpolar indicates object never sets
	IsCircumpolar bool `json:"is_circumpolar"`

	// NeverRises indicates object never rises at this location
	NeverRises bool `json:"never_rises"`
}

// TwilightTimes contains twilight timing information
type TwilightTimes struct {
	// Sunset is when the sun's center crosses the horizon
	Sunset time.Time `json:"sunset"`

	// CivilDusk is when sun is 6° below horizon
	CivilDusk time.Time `json:"civil_dusk"`

	// NauticalDusk is when sun is 12° below horizon
	NauticalDusk time.Time `json:"nautical_dusk"`

	// AstronomicalDusk is when sun is 18° below horizon
	AstronomicalDusk time.Time `json:"astronomical_dusk"`

	// AstronomicalDawn is when sun rises to 18° below horizon
	AstronomicalDawn time.Time `json:"astronomical_dawn"`

	// NauticalDawn is when sun rises to 12° below horizon
	NauticalDawn time.Time `json:"nautical_dawn"`

	// CivilDawn is when sun rises to 6° below horizon
	CivilDawn time.Time `json:"civil_dawn"`

	// Sunrise is when the sun's center crosses the horizon
	Sunrise time.Time `json:"sunrise"`

	// DarkHours is the duration of astronomical darkness
	DarkHours float64 `json:"dark_hours"`

	// MidnightLST is the local sidereal time at midnight
	MidnightLST float64 `json:"midnight_lst"`
}

// Constants for astronomical calculations
const (
	// J2000 epoch as Julian Date
	J2000 = 2451545.0

	// Degrees to radians
	deg2rad = math.Pi / 180.0

	// Radians to degrees
	rad2deg = 180.0 / math.Pi

	// Hours to degrees
	hours2deg = 15.0

	// Earth's axial tilt in degrees (J2000)
	obliquity = 23.439291
)

// JulianDate calculates the Julian Date for a given time
func JulianDate(t time.Time) float64 {
	// Convert to UTC
	t = t.UTC()

	y := float64(t.Year())
	m := float64(t.Month())
	d := float64(t.Day()) + float64(t.Hour())/24.0 +
		float64(t.Minute())/1440.0 + float64(t.Second())/86400.0

	if m <= 2 {
		y--
		m += 12
	}

	a := math.Floor(y / 100)
	b := 2 - a + math.Floor(a/4)

	return math.Floor(365.25*(y+4716)) + math.Floor(30.6001*(m+1)) + d + b - 1524.5
}

// LocalSiderealTime calculates the local sidereal time in hours
func LocalSiderealTime(t time.Time, longitude float64) float64 {
	jd := JulianDate(t)
	jd0 := math.Floor(jd-0.5) + 0.5 // JD at 0h UT

	// Days since J2000.0
	_ = jd - J2000 // d used in full algorithm
	d0 := jd0 - J2000

	// Greenwich Mean Sidereal Time at 0h UT (in hours)
	gmst0 := 6.697374558 + 0.06570982441908*d0

	// Hours since 0h UT
	h := (jd - jd0) * 24.0

	// GMST at time t
	gmst := gmst0 + 1.00273790935*h

	// Local Sidereal Time
	lst := gmst + longitude/15.0

	// Normalize to 0-24 range
	for lst < 0 {
		lst += 24
	}
	for lst >= 24 {
		lst -= 24
	}

	return lst
}

// EquatorialToHorizontal converts RA/Dec to Altitude/Azimuth
func EquatorialToHorizontal(ra, dec float64, observer *Observer, t time.Time) HorizontalCoordinates {
	// Local sidereal time in hours
	lst := LocalSiderealTime(t, observer.Longitude)

	// Hour angle in degrees
	ha := (lst - ra/15.0) * 15.0

	// Convert to radians
	haRad := ha * deg2rad
	decRad := dec * deg2rad
	latRad := observer.Latitude * deg2rad

	// Calculate altitude
	sinAlt := math.Sin(decRad)*math.Sin(latRad) +
		math.Cos(decRad)*math.Cos(latRad)*math.Cos(haRad)
	altitude := math.Asin(sinAlt) * rad2deg

	// Calculate azimuth
	cosAz := (math.Sin(decRad) - math.Sin(latRad)*sinAlt) /
		(math.Cos(latRad) * math.Cos(altitude*deg2rad))

	// Clamp cosAz to valid range
	if cosAz > 1 {
		cosAz = 1
	}
	if cosAz < -1 {
		cosAz = -1
	}

	azimuth := math.Acos(cosAz) * rad2deg

	// Correct azimuth quadrant
	if math.Sin(haRad) > 0 {
		azimuth = 360 - azimuth
	}

	return HorizontalCoordinates{
		Altitude: altitude,
		Azimuth:  azimuth,
	}
}

// CalculateVisibility calculates visibility info for an object
func CalculateVisibility(ra, dec float64, observer *Observer, t time.Time, minAltitude float64) VisibilityInfo {
	info := VisibilityInfo{}

	// Current position
	info.Coords = EquatorialToHorizontal(ra, dec, observer, t)
	info.IsVisible = info.Coords.Altitude > minAltitude

	// Hour angle
	lst := LocalSiderealTime(t, observer.Longitude)
	info.HourAngle = lst - ra/15.0
	if info.HourAngle > 12 {
		info.HourAngle -= 24
	}
	if info.HourAngle < -12 {
		info.HourAngle += 24
	}

	// Air mass (Kasten & Young formula)
	if info.Coords.Altitude > 0 {
		zenithAngle := 90 - info.Coords.Altitude
		zenithRad := zenithAngle * deg2rad
		cosZ := math.Cos(zenithRad)
		info.AirMass = 1.0 / (cosZ + 0.50572*math.Pow(96.07995-zenithAngle, -1.6364))
	} else {
		info.AirMass = math.Inf(1)
	}

	// Maximum altitude during transit (when HA = 0)
	latRad := observer.Latitude * deg2rad
	decRad := dec * deg2rad
	_ = latRad // used for circumpolar check
	_ = decRad
	info.MaxAltitude = 90 - math.Abs(observer.Latitude-dec)

	// Check circumpolar/never rises conditions
	// Object is circumpolar if dec > 90 - lat (northern) or dec < lat - 90 (southern)
	if observer.Latitude >= 0 {
		// Northern hemisphere
		info.IsCircumpolar = dec > (90 - observer.Latitude)
		info.NeverRises = dec < (observer.Latitude - 90)
	} else {
		// Southern hemisphere
		info.IsCircumpolar = dec < (-90 - observer.Latitude)
		info.NeverRises = dec > (90 + observer.Latitude)
	}

	// Calculate rise/set/transit times if object rises and sets
	if !info.IsCircumpolar && !info.NeverRises {
		// Hour angle at rise/set (when altitude = minAltitude)
		cosHA := (math.Sin(minAltitude*deg2rad) - math.Sin(latRad)*math.Sin(decRad)) /
			(math.Cos(latRad) * math.Cos(decRad))

		if cosHA >= -1 && cosHA <= 1 {
			haRiseSet := math.Acos(cosHA) * rad2deg / 15.0 // in hours

			// Transit time (when HA = 0)
			transitLST := ra / 15.0
			transitOffset := transitLST - lst
			if transitOffset < -12 {
				transitOffset += 24
			}
			if transitOffset > 12 {
				transitOffset -= 24
			}
			transitTime := t.Add(time.Duration(transitOffset * float64(time.Hour)))
			info.TransitTime = &transitTime

			// Rise time (HA = -haRiseSet)
			riseOffset := transitOffset - haRiseSet
			if riseOffset < -12 {
				riseOffset += 24
			}
			riseTime := t.Add(time.Duration(riseOffset * float64(time.Hour)))
			info.RiseTime = &riseTime

			// Set time (HA = +haRiseSet)
			setOffset := transitOffset + haRiseSet
			if setOffset > 12 {
				setOffset -= 24
			}
			setTime := t.Add(time.Duration(setOffset * float64(time.Hour)))
			info.SetTime = &setTime
		}
	} else if info.IsCircumpolar {
		// Transit time still applies for circumpolar objects
		transitLST := ra / 15.0
		transitOffset := transitLST - lst
		if transitOffset < -12 {
			transitOffset += 24
		}
		if transitOffset > 12 {
			transitOffset -= 24
		}
		transitTime := t.Add(time.Duration(transitOffset * float64(time.Hour)))
		info.TransitTime = &transitTime
	}

	return info
}

// CalculateTwilight calculates twilight times for a given date and location
func CalculateTwilight(observer *Observer, date time.Time) TwilightTimes {
	times := TwilightTimes{}

	// Use noon local time as starting point
	noon := time.Date(date.Year(), date.Month(), date.Day(), 12, 0, 0, 0, time.UTC)
	noon = noon.Add(-time.Duration(observer.Longitude/15.0) * time.Hour)

	// Calculate sun's position iteratively to find times
	// This is a simplified calculation

	// Approximate sun's RA/Dec for this date
	sunRA, sunDec := approximateSunPosition(noon)

	// Find sunset/sunrise (altitude = -0.833° for refraction)
	times.Sunset = findSunEvent(sunRA, sunDec, observer, noon, -0.833, false)
	times.Sunrise = findSunEvent(sunRA, sunDec, observer, noon, -0.833, true)

	// Civil twilight (-6°)
	times.CivilDusk = findSunEvent(sunRA, sunDec, observer, noon, -6.0, false)
	times.CivilDawn = findSunEvent(sunRA, sunDec, observer, noon, -6.0, true)

	// Nautical twilight (-12°)
	times.NauticalDusk = findSunEvent(sunRA, sunDec, observer, noon, -12.0, false)
	times.NauticalDawn = findSunEvent(sunRA, sunDec, observer, noon, -12.0, true)

	// Astronomical twilight (-18°)
	times.AstronomicalDusk = findSunEvent(sunRA, sunDec, observer, noon, -18.0, false)
	times.AstronomicalDawn = findSunEvent(sunRA, sunDec, observer, noon, -18.0, true)

	// Calculate dark hours
	if !times.AstronomicalDusk.IsZero() && !times.AstronomicalDawn.IsZero() {
		duration := times.AstronomicalDawn.Sub(times.AstronomicalDusk)
		if duration < 0 {
			duration += 24 * time.Hour
		}
		times.DarkHours = duration.Hours()
	}

	// LST at midnight
	midnight := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	midnight = midnight.Add(-time.Duration(observer.Longitude/15.0) * time.Hour)
	times.MidnightLST = LocalSiderealTime(midnight, observer.Longitude)

	return times
}

// approximateSunPosition calculates approximate sun RA/Dec for a date
// This is a low-precision algorithm suitable for twilight calculations
func approximateSunPosition(t time.Time) (ra, dec float64) {
	// Days since J2000.0
	jd := JulianDate(t)
	n := jd - J2000

	// Mean longitude of the Sun (degrees)
	L := math.Mod(280.460+0.9856474*n, 360)
	if L < 0 {
		L += 360
	}

	// Mean anomaly (degrees)
	g := math.Mod(357.528+0.9856003*n, 360)
	if g < 0 {
		g += 360
	}

	gRad := g * deg2rad

	// Ecliptic longitude (degrees)
	lambda := L + 1.915*math.Sin(gRad) + 0.020*math.Sin(2*gRad)
	lambdaRad := lambda * deg2rad

	// Obliquity of the ecliptic (degrees)
	eps := obliquity
	epsRad := eps * deg2rad

	// Right ascension
	ra = math.Atan2(math.Cos(epsRad)*math.Sin(lambdaRad), math.Cos(lambdaRad)) * rad2deg
	if ra < 0 {
		ra += 360
	}

	// Declination
	dec = math.Asin(math.Sin(epsRad)*math.Sin(lambdaRad)) * rad2deg

	return ra, dec
}

// findSunEvent finds when the sun reaches a given altitude
// morning=true finds morning event, false finds evening event
func findSunEvent(sunRA, sunDec float64, observer *Observer, startTime time.Time, altitude float64, morning bool) time.Time {
	latRad := observer.Latitude * deg2rad
	decRad := sunDec * deg2rad
	altRad := altitude * deg2rad

	// Calculate hour angle at given altitude
	cosHA := (math.Sin(altRad) - math.Sin(latRad)*math.Sin(decRad)) /
		(math.Cos(latRad) * math.Cos(decRad))

	// Check if sun reaches this altitude
	if cosHA < -1 || cosHA > 1 {
		return time.Time{} // Sun doesn't reach this altitude
	}

	haRad := math.Acos(cosHA)
	ha := haRad * rad2deg / 15.0 // Convert to hours

	// Sun's transit time
	lst := LocalSiderealTime(startTime, observer.Longitude)
	transitOffset := (sunRA / 15.0) - lst

	if transitOffset < -12 {
		transitOffset += 24
	}
	if transitOffset > 12 {
		transitOffset -= 24
	}

	var eventOffset float64
	if morning {
		eventOffset = transitOffset - ha
	} else {
		eventOffset = transitOffset + ha
	}

	return startTime.Add(time.Duration(eventOffset * float64(time.Hour)))
}

// SuggestTargets returns DSOs that are well-positioned for imaging
func SuggestTargets(dso DSOCatalog, observer *Observer, t time.Time, minAltitude float64, maxAirmass float64) ([]DeepSkyObject, error) {
	// Get all objects
	all, err := dso.ConeSearch(nil, ConeSearchQuery{
		RA:     180, // Center of sky
		Dec:    0,
		Radius: 180, // Entire sky
	})
	if err != nil {
		return nil, err
	}

	// Filter by visibility
	suggestions := make([]DeepSkyObject, 0)

	for _, obj := range all {
		vis := CalculateVisibility(obj.RA, obj.Dec, observer, t, minAltitude)

		if !vis.IsVisible {
			continue
		}

		if vis.AirMass > maxAirmass {
			continue
		}

		// Prefer objects near transit
		if math.Abs(vis.HourAngle) < 4 {
			suggestions = append(suggestions, obj)
		}
	}

	return suggestions, nil
}

// MoonPhase calculates the approximate moon phase (0-1, 0=new, 0.5=full)
func MoonPhase(t time.Time) float64 {
	// Known new moon: Jan 6, 2000 18:14 UT
	newMoonRef := time.Date(2000, 1, 6, 18, 14, 0, 0, time.UTC)

	// Synodic month = 29.530588853 days
	synodicMonth := 29.530588853

	days := t.Sub(newMoonRef).Hours() / 24.0
	phase := math.Mod(days, synodicMonth) / synodicMonth

	if phase < 0 {
		phase += 1
	}

	return phase
}

// MoonIllumination returns the percentage illumination (0-100)
func MoonIllumination(phase float64) float64 {
	// Illumination follows a cosine curve
	return 50 * (1 - math.Cos(2*math.Pi*phase))
}

// MoonPhaseName returns a human-readable moon phase name
func MoonPhaseName(phase float64) string {
	switch {
	case phase < 0.03 || phase > 0.97:
		return "New Moon"
	case phase < 0.22:
		return "Waxing Crescent"
	case phase < 0.28:
		return "First Quarter"
	case phase < 0.47:
		return "Waxing Gibbous"
	case phase < 0.53:
		return "Full Moon"
	case phase < 0.72:
		return "Waning Gibbous"
	case phase < 0.78:
		return "Last Quarter"
	default:
		return "Waning Crescent"
	}
}
