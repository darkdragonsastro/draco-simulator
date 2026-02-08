package mount

import (
	"context"
	"math"
	"sync"
	"time"
)

// MountStatus represents the current state of the mount.
type MountStatus struct {
	RA       float64 `json:"ra"`        // hours (0-24)
	Dec      float64 `json:"dec"`       // degrees (-90 to +90)
	Alt      float64 `json:"alt"`       // degrees
	Az       float64 `json:"az"`        // degrees
	TargetRA  float64 `json:"target_ra"`
	TargetDec float64 `json:"target_dec"`

	IsSlewing  bool `json:"is_slewing"`
	IsTracking bool `json:"is_tracking"`
	IsParked   bool `json:"is_parked"`

	TrackingMode string `json:"tracking_mode"` // "off"|"sidereal"|"lunar"|"solar"
	PierSide     string `json:"pier_side"`     // "east"|"west"
	SlewRate     float64 `json:"slew_rate"`    // deg/sec

	HourAngle float64 `json:"hour_angle"` // hours
	LST       float64 `json:"lst"`        // hours

	RAAxisDeg  float64 `json:"ra_axis_deg"`  // physical RA axis angle for 3D model
	DecAxisDeg float64 `json:"dec_axis_deg"` // physical Dec axis angle for 3D model

	Connected bool `json:"connected"`
}

// Config holds mount simulator configuration.
type Config struct {
	Latitude  float64 // observer latitude in degrees
	Longitude float64 // observer longitude in degrees
	SlewRate  float64 // degrees per second (default 8)
}

// DefaultConfig returns default LA observatory config.
func DefaultConfig() Config {
	return Config{
		Latitude:  34.0522,
		Longitude: -118.2437,
		SlewRate:  8.0,
	}
}

// Simulator is a simulated German Equatorial Mount.
type Simulator struct {
	mu     sync.RWMutex
	config Config

	ra, dec       float64 // current position (hours, degrees)
	targetRA      float64
	targetDec     float64
	isSlewing     bool
	isTracking    bool
	isParked      bool
	trackingMode  string
	connected     bool

	slewCancel context.CancelFunc

	onStatusChanged func(MountStatus)
	trackingDone    chan struct{}
}

// NewSimulator creates a new mount simulator.
func NewSimulator(config Config, onStatusChanged func(MountStatus)) *Simulator {
	if config.SlewRate <= 0 {
		config.SlewRate = 8.0
	}
	return &Simulator{
		config:          config,
		ra:              0,
		dec:             90, // parked at pole
		isParked:        true,
		trackingMode:    "off",
		onStatusChanged: onStatusChanged,
	}
}

// Connect sets the mount as connected.
func (s *Simulator) Connect() {
	s.mu.Lock()
	s.connected = true
	s.mu.Unlock()
	s.broadcast()
}

// Disconnect disconnects the mount, stopping everything.
func (s *Simulator) Disconnect() {
	s.StopSlew()
	s.stopTracking()

	s.mu.Lock()
	s.connected = false
	s.mu.Unlock()
	s.broadcast()
}

// GetStatus returns the current mount status.
func (s *Simulator) GetStatus() MountStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.buildStatus()
}

// SlewTo asynchronously slews the mount to the given RA/Dec.
func (s *Simulator) SlewTo(_ context.Context, ra, dec float64) error {
	s.mu.Lock()
	if !s.connected {
		s.mu.Unlock()
		return errNotConnected
	}
	if s.isParked {
		s.mu.Unlock()
		return errParked
	}

	// Cancel any existing slew
	if s.slewCancel != nil {
		s.slewCancel()
	}

	s.targetRA = ra
	s.targetDec = dec
	s.isSlewing = true

	// Use background context so the goroutine outlives the HTTP request
	slewCtx, cancel := context.WithCancel(context.Background())
	s.slewCancel = cancel
	s.mu.Unlock()

	s.broadcast()

	go s.runSlew(slewCtx, ra, dec)
	return nil
}

// StopSlew cancels any active slew.
func (s *Simulator) StopSlew() {
	s.mu.Lock()
	if s.slewCancel != nil {
		s.slewCancel()
		s.slewCancel = nil
	}
	s.isSlewing = false
	s.mu.Unlock()
	s.broadcast()
}

// SetTracking sets the tracking mode.
func (s *Simulator) SetTracking(mode string) {
	s.mu.Lock()
	if !s.connected || s.isParked {
		s.mu.Unlock()
		return
	}

	oldMode := s.trackingMode
	s.trackingMode = mode

	if mode == "off" {
		s.isTracking = false
	} else {
		s.isTracking = true
	}
	s.mu.Unlock()

	// Stop old tracking goroutine
	if oldMode != "off" && oldMode != mode {
		s.stopTracking()
	}

	// Start tracking goroutine if needed
	if mode != "off" {
		s.startTracking()
	}

	s.broadcast()
}

// Jog nudges the mount in a direction at the given rate (deg/sec).
func (s *Simulator) Jog(direction string, rate float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.connected || s.isParked {
		return
	}

	// Apply a small nudge (equivalent to 0.5 seconds of motion)
	nudge := rate * 0.5

	switch direction {
	case "north":
		s.dec = clampDec(s.dec + nudge)
	case "south":
		s.dec = clampDec(s.dec - nudge)
	case "east":
		s.ra = wrapRA(s.ra + nudge/15.0) // convert deg to hours
	case "west":
		s.ra = wrapRA(s.ra - nudge/15.0)
	}

	// broadcast without holding lock
	status := s.buildStatus()
	go s.onStatusChanged(status)
}

// Park moves the mount to park position.
func (s *Simulator) Park() {
	s.StopSlew()
	s.stopTracking()

	s.mu.Lock()
	s.ra = 0
	s.dec = 90
	s.isParked = true
	s.isTracking = false
	s.trackingMode = "off"
	s.mu.Unlock()
	s.broadcast()
}

// Unpark enables the mount for use.
func (s *Simulator) Unpark() {
	s.mu.Lock()
	if !s.connected {
		s.mu.Unlock()
		return
	}
	s.isParked = false
	s.mu.Unlock()
	s.broadcast()
}

// runSlew interpolates the mount along a great-circle arc to the target.
func (s *Simulator) runSlew(ctx context.Context, targetRA, targetDec float64) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.mu.Lock()
			// Calculate angular distance remaining
			dist := angularDistance(s.ra*15.0, s.dec, targetRA*15.0, targetDec) // convert RA hours to degrees

			if dist < 0.01 { // close enough
				s.ra = targetRA
				s.dec = targetDec
				s.isSlewing = false
				s.slewCancel = nil
				s.mu.Unlock()
				s.broadcast()
				return
			}

			// Move along great circle at slew rate
			step := s.config.SlewRate * 0.1 // degrees per tick (100ms)
			frac := step / dist
			if frac > 1.0 {
				frac = 1.0
			}

			// Interpolate RA (in hours) and Dec (in degrees)
			s.ra = lerpRA(s.ra, targetRA, frac)
			s.dec = lerp(s.dec, targetDec, frac)
			s.mu.Unlock()

			s.broadcast()
		}
	}
}

func (s *Simulator) startTracking() {
	s.stopTracking() // ensure no duplicate goroutine

	s.mu.Lock()
	done := make(chan struct{})
	s.trackingDone = done
	s.mu.Unlock()

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				s.mu.Lock()
				if !s.isTracking || !s.connected {
					s.mu.Unlock()
					return
				}
				// Advance RA at sidereal rate: 15.041"/sec = 15.041/3600 deg/sec
				// In hours: 15.041/(3600*15) hours/sec = ~0.000278 hours/sec
				rate := s.trackingRate()
				s.ra = wrapRA(s.ra + rate)
				s.mu.Unlock()
				s.broadcast()
			}
		}
	}()
}

func (s *Simulator) stopTracking() {
	s.mu.Lock()
	if s.trackingDone != nil {
		close(s.trackingDone)
		s.trackingDone = nil
	}
	s.mu.Unlock()
}

// trackingRate returns RA advance per second in hours for the current mode.
func (s *Simulator) trackingRate() float64 {
	switch s.trackingMode {
	case "sidereal":
		return 15.041 / (3600.0 * 15.0) // sidereal rate in hours/sec
	case "lunar":
		return 14.685 / (3600.0 * 15.0)
	case "solar":
		return 15.0 / (3600.0 * 15.0)
	default:
		return 0
	}
}

// buildStatus creates a MountStatus snapshot. Must be called with at least a read lock.
func (s *Simulator) buildStatus() MountStatus {
	lst := computeLST(s.config.Longitude)
	ha := lst - s.ra
	if ha < -12 {
		ha += 24
	}
	if ha > 12 {
		ha -= 24
	}

	alt, az := equatorialToHorizontal(s.ra, s.dec, s.config.Latitude, lst)

	pierSide := "east"
	if ha < 0 {
		pierSide = "west"
	}

	// Axis angles for 3D model
	raAxisDeg := ha * 15.0 // HA in hours to degrees
	decAxisDeg := 90.0 - s.dec

	if pierSide == "west" {
		raAxisDeg += 180
		decAxisDeg = 180 - decAxisDeg
	}

	return MountStatus{
		RA:           s.ra,
		Dec:          s.dec,
		Alt:          alt,
		Az:           az,
		TargetRA:     s.targetRA,
		TargetDec:    s.targetDec,
		IsSlewing:    s.isSlewing,
		IsTracking:   s.isTracking,
		IsParked:     s.isParked,
		TrackingMode: s.trackingMode,
		PierSide:     pierSide,
		SlewRate:     s.config.SlewRate,
		HourAngle:    ha,
		LST:          lst,
		RAAxisDeg:    raAxisDeg,
		DecAxisDeg:   decAxisDeg,
		Connected:    s.connected,
	}
}

func (s *Simulator) broadcast() {
	if s.onStatusChanged == nil {
		return
	}
	status := s.GetStatus()
	s.onStatusChanged(status)
}

// --- Astronomy helpers ---

const deg2rad = math.Pi / 180.0
const rad2deg = 180.0 / math.Pi

// computeLST computes approximate Local Sidereal Time in hours for the given longitude.
func computeLST(longitude float64) float64 {
	now := time.Now().UTC()
	// Julian date
	y, m, d := now.Year(), int(now.Month()), now.Day()
	if m <= 2 {
		y--
		m += 12
	}
	a := y / 100
	b := 2 - a + a/4
	jd := float64(int(365.25*float64(y+4716))) + float64(int(30.6001*float64(m+1))) + float64(d) + float64(b) - 1524.5
	jd += (float64(now.Hour()) + float64(now.Minute())/60.0 + float64(now.Second())/3600.0) / 24.0

	// Greenwich Mean Sidereal Time
	t := (jd - 2451545.0) / 36525.0
	gmst := 280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*t*t - t*t*t/38710000.0
	gmst = math.Mod(gmst, 360.0)
	if gmst < 0 {
		gmst += 360.0
	}

	lst := gmst + longitude
	lst = math.Mod(lst, 360.0)
	if lst < 0 {
		lst += 360.0
	}

	return lst / 15.0 // convert degrees to hours
}

// equatorialToHorizontal converts RA/Dec to Alt/Az.
func equatorialToHorizontal(ra, dec, lat, lst float64) (alt, az float64) {
	ha := (lst - ra) * 15.0 * deg2rad // hour angle in radians
	decRad := dec * deg2rad
	latRad := lat * deg2rad

	sinAlt := math.Sin(decRad)*math.Sin(latRad) + math.Cos(decRad)*math.Cos(latRad)*math.Cos(ha)
	alt = math.Asin(sinAlt) * rad2deg

	cosA := (math.Sin(decRad) - math.Sin(alt*deg2rad)*math.Sin(latRad)) / (math.Cos(alt*deg2rad) * math.Cos(latRad))
	cosA = math.Max(-1, math.Min(1, cosA)) // clamp for acos
	az = math.Acos(cosA) * rad2deg

	if math.Sin(ha) > 0 {
		az = 360.0 - az
	}

	return alt, az
}

// angularDistance computes great-circle distance in degrees between two points (all in degrees).
func angularDistance(ra1, dec1, ra2, dec2 float64) float64 {
	ra1r, dec1r := ra1*deg2rad, dec1*deg2rad
	ra2r, dec2r := ra2*deg2rad, dec2*deg2rad
	dra := ra2r - ra1r
	ddec := dec2r - dec1r
	a := math.Sin(ddec/2)*math.Sin(ddec/2) + math.Cos(dec1r)*math.Cos(dec2r)*math.Sin(dra/2)*math.Sin(dra/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return c * rad2deg
}

func lerp(a, b, t float64) float64 {
	return a + (b-a)*t
}

// lerpRA interpolates RA in hours, handling the 0/24 wrap.
func lerpRA(a, b, t float64) float64 {
	diff := b - a
	if diff > 12 {
		diff -= 24
	}
	if diff < -12 {
		diff += 24
	}
	result := a + diff*t
	return wrapRA(result)
}

func wrapRA(ra float64) float64 {
	for ra < 0 {
		ra += 24
	}
	for ra >= 24 {
		ra -= 24
	}
	return ra
}

func clampDec(dec float64) float64 {
	if dec > 90 {
		return 90
	}
	if dec < -90 {
		return -90
	}
	return dec
}
