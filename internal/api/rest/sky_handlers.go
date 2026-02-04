package rest

import (
	"net/http"
	"time"

	"github.com/darkdragonsastro/draco-simulator/internal/catalog"
	"github.com/gin-gonic/gin"
)

func (s *Server) getSkyConditions(c *gin.Context) {
	c.JSON(http.StatusOK, s.skyState.Conditions)
}

// SetConditionsRequest for updating sky conditions
type SetConditionsRequest struct {
	Seeing       *float64 `json:"seeing"`
	Transparency *float64 `json:"transparency"`
	CloudCover   *float64 `json:"cloud_cover"`
	BortleClass  *int     `json:"bortle_class"`
	Temperature  *float64 `json:"temperature"`
	Humidity     *float64 `json:"humidity"`
	WindSpeed    *float64 `json:"wind_speed"`
}

func (s *Server) setSkyConditions(c *gin.Context) {
	var req SetConditionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update only provided fields
	if req.Seeing != nil {
		s.skyState.Conditions.Seeing = *req.Seeing
	}
	if req.Transparency != nil {
		s.skyState.Conditions.Transparency = *req.Transparency
	}
	if req.CloudCover != nil {
		s.skyState.Conditions.CloudCover = *req.CloudCover
	}
	if req.BortleClass != nil {
		s.skyState.Conditions.BortleClass = *req.BortleClass
	}
	if req.Temperature != nil {
		s.skyState.Conditions.Temperature = *req.Temperature
	}
	if req.Humidity != nil {
		s.skyState.Conditions.Humidity = *req.Humidity
	}
	if req.WindSpeed != nil {
		s.skyState.Conditions.WindSpeed = *req.WindSpeed
	}

	c.JSON(http.StatusOK, s.skyState.Conditions)
}

// TimeResponse contains simulation time info
type TimeResponse struct {
	UTC         time.Time `json:"utc"`
	Local       time.Time `json:"local"`
	JulianDate  float64   `json:"julian_date"`
	LST         float64   `json:"lst"` // Local Sidereal Time in hours
	UseRealTime bool      `json:"use_real_time"`
	TimeOffset  float64   `json:"time_offset"` // Hours
}

func (s *Server) getSkyTime(c *gin.Context) {
	now := time.Now().UTC()
	if !s.skyState.UseRealTime {
		now = now.Add(time.Duration(s.skyState.TimeOffset * float64(time.Hour)))
	}

	jd := catalog.JulianDate(now)
	lst := catalog.LocalSiderealTime(now, s.skyState.Observer.Longitude)

	c.JSON(http.StatusOK, TimeResponse{
		UTC:         now,
		Local:       now.Local(),
		JulianDate:  jd,
		LST:         lst,
		UseRealTime: s.skyState.UseRealTime,
		TimeOffset:  s.skyState.TimeOffset,
	})
}

// SetTimeRequest for updating simulation time
type SetTimeRequest struct {
	UseRealTime *bool    `json:"use_real_time"`
	TimeOffset  *float64 `json:"time_offset"` // Hours offset from real time
	SetTime     *string  `json:"set_time"`    // ISO 8601 time to set
}

func (s *Server) setSkyTime(c *gin.Context) {
	var req SetTimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UseRealTime != nil {
		s.skyState.UseRealTime = *req.UseRealTime
	}

	if req.TimeOffset != nil {
		s.skyState.TimeOffset = *req.TimeOffset
	}

	if req.SetTime != nil {
		t, err := time.Parse(time.RFC3339, *req.SetTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid time format, use RFC3339"})
			return
		}
		// Calculate offset from now
		s.skyState.TimeOffset = t.Sub(time.Now().UTC()).Hours()
		s.skyState.UseRealTime = false
	}

	// Return updated time info
	s.getSkyTime(c)
}

func (s *Server) getLocation(c *gin.Context) {
	c.JSON(http.StatusOK, s.skyState.Observer)
}

// SetLocationRequest for updating observer location
type SetLocationRequest struct {
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	Elevation *float64 `json:"elevation"`
	Name      *string  `json:"name"`
}

func (s *Server) setLocation(c *gin.Context) {
	var req SetLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Latitude != nil {
		if *req.Latitude < -90 || *req.Latitude > 90 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "latitude must be between -90 and 90"})
			return
		}
		s.skyState.Observer.Latitude = *req.Latitude
	}

	if req.Longitude != nil {
		if *req.Longitude < -180 || *req.Longitude > 180 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "longitude must be between -180 and 180"})
			return
		}
		s.skyState.Observer.Longitude = *req.Longitude
	}

	if req.Elevation != nil {
		s.skyState.Observer.Elevation = *req.Elevation
	}

	c.JSON(http.StatusOK, s.skyState.Observer)
}

// TwilightResponse contains twilight times
type TwilightResponse struct {
	Date                string    `json:"date"`
	SunsetCivil         time.Time `json:"sunset_civil"`
	SunsetNautical      time.Time `json:"sunset_nautical"`
	SunsetAstronomical  time.Time `json:"sunset_astronomical"`
	SunriseCivil        time.Time `json:"sunrise_civil"`
	SunriseNautical     time.Time `json:"sunrise_nautical"`
	SunriseAstronomical time.Time `json:"sunrise_astronomical"`
	IsDark              bool      `json:"is_dark"`
	DarkHoursRemaining  float64   `json:"dark_hours_remaining"`
}

func (s *Server) getTwilightTimes(c *gin.Context) {
	now := time.Now().UTC()
	if !s.skyState.UseRealTime {
		now = now.Add(time.Duration(s.skyState.TimeOffset * float64(time.Hour)))
	}

	twilight := catalog.CalculateTwilight(&s.skyState.Observer, now)

	// Calculate if currently dark
	isDark := now.After(twilight.AstronomicalDusk) || now.Before(twilight.AstronomicalDawn)

	var darkHoursRemaining float64
	if isDark {
		if now.Before(twilight.AstronomicalDawn) {
			darkHoursRemaining = twilight.AstronomicalDawn.Sub(now).Hours()
		} else {
			// After dusk, calculate to next dawn
			darkHoursRemaining = twilight.AstronomicalDawn.Add(24 * time.Hour).Sub(now).Hours()
		}
	}

	c.JSON(http.StatusOK, TwilightResponse{
		Date:                now.Format("2006-01-02"),
		SunsetCivil:         twilight.CivilDusk,
		SunsetNautical:      twilight.NauticalDusk,
		SunsetAstronomical:  twilight.AstronomicalDusk,
		SunriseCivil:        twilight.CivilDawn,
		SunriseNautical:     twilight.NauticalDawn,
		SunriseAstronomical: twilight.AstronomicalDawn,
		IsDark:              isDark,
		DarkHoursRemaining:  darkHoursRemaining,
	})
}

// MoonInfoResponse contains moon information
type MoonInfoResponse struct {
	RA           float64 `json:"ra"`
	Dec          float64 `json:"dec"`
	Altitude     float64 `json:"altitude"`
	Azimuth      float64 `json:"azimuth"`
	Phase        float64 `json:"phase"`        // 0-1 (0=new, 0.5=full, 1=new)
	Illumination float64 `json:"illumination"` // 0-100%
	IsUp         bool    `json:"is_up"`
	PhaseName    string  `json:"phase_name"`
}

func (s *Server) getMoonInfo(c *gin.Context) {
	now := time.Now().UTC()
	if !s.skyState.UseRealTime {
		now = now.Add(time.Duration(s.skyState.TimeOffset * float64(time.Hour)))
	}

	// Use Ephemeris to get moon position
	ephemeris := catalog.NewEphemeris(&s.skyState.Observer)
	moonPos := ephemeris.GetMoonPosition(now)

	vis := catalog.CalculateVisibility(moonPos.RA, moonPos.Dec, &s.skyState.Observer, now, 0)
	phase := catalog.MoonPhase(now)
	illumination := catalog.MoonIllumination(phase) * 100

	phaseName := catalog.MoonPhaseName(phase)

	c.JSON(http.StatusOK, MoonInfoResponse{
		RA:           moonPos.RA,
		Dec:          moonPos.Dec,
		Altitude:     vis.Coords.Altitude,
		Azimuth:      vis.Coords.Azimuth,
		Phase:        phase,
		Illumination: illumination,
		IsUp:         vis.IsVisible,
		PhaseName:    phaseName,
	})
}

// SunInfoResponse contains sun information
type SunInfoResponse struct {
	RA       float64 `json:"ra"`
	Dec      float64 `json:"dec"`
	Altitude float64 `json:"altitude"`
	Azimuth  float64 `json:"azimuth"`
	IsUp     bool    `json:"is_up"`
}

func (s *Server) getSunInfo(c *gin.Context) {
	now := time.Now().UTC()
	if !s.skyState.UseRealTime {
		now = now.Add(time.Duration(s.skyState.TimeOffset * float64(time.Hour)))
	}

	// Use Ephemeris to get sun position
	ephemeris := catalog.NewEphemeris(&s.skyState.Observer)
	sunPos := ephemeris.GetSunPosition(now)

	vis := catalog.CalculateVisibility(sunPos.RA, sunPos.Dec, &s.skyState.Observer, now, 0)

	c.JSON(http.StatusOK, SunInfoResponse{
		RA:       sunPos.RA,
		Dec:      sunPos.Dec,
		Altitude: vis.Coords.Altitude,
		Azimuth:  vis.Coords.Azimuth,
		IsUp:     vis.Coords.Altitude > 0,
	})
}
