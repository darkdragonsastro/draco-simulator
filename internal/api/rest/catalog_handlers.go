package rest

import (
	"net/http"
	"strconv"
	"time"

	"github.com/darkdragonsastro/draco-simulator/internal/catalog"
	"github.com/gin-gonic/gin"
)

func (s *Server) searchStars(c *gin.Context) {
	if s.starCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "star catalog not available"})
		return
	}

	// Parse query parameters
	raStr := c.Query("ra")
	decStr := c.Query("dec")
	radiusStr := c.DefaultQuery("radius", "1.0")
	limitStr := c.DefaultQuery("limit", "100")
	minMagStr := c.DefaultQuery("min_mag", "-2")
	maxMagStr := c.DefaultQuery("max_mag", "12")

	ra, err := strconv.ParseFloat(raStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ra parameter"})
		return
	}

	dec, err := strconv.ParseFloat(decStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dec parameter"})
		return
	}

	radius, _ := strconv.ParseFloat(radiusStr, 64)
	limit, _ := strconv.Atoi(limitStr)
	minMag, _ := strconv.ParseFloat(minMagStr, 64)
	maxMag, _ := strconv.ParseFloat(maxMagStr, 64)

	query := catalog.ConeSearchQuery{
		RA:         ra,
		Dec:        dec,
		Radius:     radius,
		MinMag:     minMag,
		MagLimit:   maxMag,
		MaxResults: limit,
	}

	stars, err := s.starCatalog.ConeSearch(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(stars),
		"stars": stars,
	})
}

func (s *Server) getStar(c *gin.Context) {
	if s.starCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "star catalog not available"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid star id"})
		return
	}

	star, err := s.starCatalog.GetStar(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "star not found"})
		return
	}

	c.JSON(http.StatusOK, star)
}

func (s *Server) searchDSO(c *gin.Context) {
	if s.dsoCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DSO catalog not available"})
		return
	}

	// Check for name search first
	name := c.Query("name")
	if name != "" {
		dso, err := s.dsoCatalog.GetObject(c.Request.Context(), name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "DSO not found"})
			return
		}
		c.JSON(http.StatusOK, dso)
		return
	}

	// Check for type filter
	dsoType := c.Query("type")
	if dsoType != "" {
		objects, err := s.dsoCatalog.ByType(c.Request.Context(), catalog.ObjectType(dsoType))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"count":   len(objects),
			"objects": objects,
		})
		return
	}

	// Cone search
	raStr := c.Query("ra")
	decStr := c.Query("dec")
	radiusStr := c.DefaultQuery("radius", "5.0")
	limitStr := c.DefaultQuery("limit", "50")

	if raStr == "" || decStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ra and dec required for cone search, or use name/type filter"})
		return
	}

	ra, err := strconv.ParseFloat(raStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ra parameter"})
		return
	}

	dec, err := strconv.ParseFloat(decStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dec parameter"})
		return
	}

	radius, _ := strconv.ParseFloat(radiusStr, 64)
	limit, _ := strconv.Atoi(limitStr)

	query := catalog.ConeSearchQuery{
		RA:         ra,
		Dec:        dec,
		Radius:     radius,
		MaxResults: limit,
	}

	objects, err := s.dsoCatalog.ConeSearch(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(objects),
		"objects": objects,
	})
}

func (s *Server) getDSO(c *gin.Context) {
	if s.dsoCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DSO catalog not available"})
		return
	}

	id := c.Param("id")
	dso, err := s.dsoCatalog.GetObject(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "DSO not found"})
		return
	}

	c.JSON(http.StatusOK, dso)
}

func (s *Server) getMessierCatalog(c *gin.Context) {
	if s.dsoCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DSO catalog not available"})
		return
	}

	// Get all objects via full-sky cone search
	query := catalog.ConeSearchQuery{
		RA:         180,
		Dec:        0,
		Radius:     180,
		MaxResults: 200,
	}
	objects, err := s.dsoCatalog.ConeSearch(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Filter to only Messier objects (ID starts with "M")
	var messier []catalog.DeepSkyObject
	for _, obj := range objects {
		if len(obj.ID) > 0 && obj.ID[0] == 'M' {
			messier = append(messier, obj)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(messier),
		"objects": messier,
	})
}

// VisibleObjectsResponse contains visible objects with visibility info
type VisibleObjectsResponse struct {
	Objects  []VisibleObject  `json:"objects"`
	Time     time.Time        `json:"time"`
	Observer catalog.Observer `json:"observer"`
}

// VisibleObject combines DSO with visibility info
type VisibleObject struct {
	Object     catalog.DeepSkyObject  `json:"object"`
	Visibility catalog.VisibilityInfo `json:"visibility"`
}

func (s *Server) getVisibleObjects(c *gin.Context) {
	if s.dsoCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DSO catalog not available"})
		return
	}

	minAltStr := c.DefaultQuery("min_alt", "30")
	maxMagStr := c.DefaultQuery("max_mag", "12")
	limitStr := c.DefaultQuery("limit", "20")

	minAlt, _ := strconv.ParseFloat(minAltStr, 64)
	maxMag, _ := strconv.ParseFloat(maxMagStr, 64)
	limit, _ := strconv.Atoi(limitStr)

	now := time.Now().UTC()
	observer := s.skyState.Observer

	// Get all DSOs via a full-sky cone search
	query := catalog.ConeSearchQuery{
		RA:         180,
		Dec:        0,
		Radius:     180,
		MagLimit:   maxMag,
		MaxResults: 500,
	}

	allObjects, err := s.dsoCatalog.ConeSearch(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var visible []VisibleObject
	for _, obj := range allObjects {
		vis := catalog.CalculateVisibility(obj.RA, obj.Dec, &observer, now, minAlt)
		if vis.Coords.Altitude >= minAlt && vis.IsVisible {
			visible = append(visible, VisibleObject{
				Object:     obj,
				Visibility: vis,
			})
		}

		if len(visible) >= limit {
			break
		}
	}

	c.JSON(http.StatusOK, VisibleObjectsResponse{
		Objects:  visible,
		Time:     now,
		Observer: observer,
	})
}

// TargetSuggestion provides a suggested imaging target
type TargetSuggestion struct {
	Object      catalog.DeepSkyObject  `json:"object"`
	Visibility  catalog.VisibilityInfo `json:"visibility"`
	Score       float64                `json:"score"`
	Reason      string                 `json:"reason"`
	BestTime    time.Time              `json:"best_time"`
	WindowHours float64                `json:"window_hours"`
}

func (s *Server) getBrightStars(c *gin.Context) {
	if s.starCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "star catalog not available"})
		return
	}

	maxMagStr := c.DefaultQuery("max_mag", "6.5")
	maxMag, _ := strconv.ParseFloat(maxMagStr, 64)

	// GetBrightStars requires a concrete *HipparcosCatalog
	hipCat, ok := s.starCatalog.(*catalog.HipparcosCatalog)
	if !ok {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "bright star lookup not available"})
		return
	}

	stars, err := hipCat.GetBrightStars(c.Request.Context(), maxMag)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return compact format for planetarium rendering
	type BrightStar struct {
		HIP  int     `json:"hip"`
		RA   float64 `json:"ra"`
		Dec  float64 `json:"dec"`
		VMag float64 `json:"vmag"`
		BV   float64 `json:"bv"`
		Name string  `json:"name,omitempty"`
	}

	result := make([]BrightStar, len(stars))
	for i, star := range stars {
		result[i] = BrightStar{
			HIP:  star.HIP,
			RA:   star.RA,
			Dec:  star.Dec,
			VMag: star.VMag,
			BV:   star.BV,
			Name: star.Name,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(result),
		"stars": result,
	})
}

func (s *Server) getConstellations(c *gin.Context) {
	c.JSON(http.StatusOK, catalog.AllConstellations)
}

func (s *Server) suggestTargets(c *gin.Context) {
	if s.dsoCatalog == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DSO catalog not available"})
		return
	}

	limitStr := c.DefaultQuery("limit", "5")
	limit, _ := strconv.Atoi(limitStr)

	now := time.Now().UTC()
	observer := s.skyState.Observer

	// Get bright DSOs
	query := catalog.ConeSearchQuery{
		RA:         180,
		Dec:        0,
		Radius:     180,
		MagLimit:   10,
		MaxResults: 200,
	}

	objects, err := s.dsoCatalog.ConeSearch(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var suggestions []TargetSuggestion
	for _, obj := range objects {
		vis := catalog.CalculateVisibility(obj.RA, obj.Dec, &observer, now, 20)

		if !vis.IsVisible || vis.Coords.Altitude < 20 {
			continue
		}

		// Score based on altitude, magnitude, and type
		score := vis.Coords.Altitude / 90.0 * 50 // 0-50 for altitude

		// Brighter objects get higher scores
		if obj.VMag < 6 {
			score += 30
		} else if obj.VMag < 8 {
			score += 20
		} else if obj.VMag < 10 {
			score += 10
		}

		// Bonus for certain types
		switch obj.Type {
		case catalog.ObjectTypeGalaxy:
			score += 10
		case catalog.ObjectTypeNebula:
			score += 15
		case catalog.ObjectTypeOpenCluster, catalog.ObjectTypeGlobular:
			score += 5
		}

		reason := "Good visibility"
		if vis.Coords.Altitude > 60 {
			reason = "Excellent altitude for imaging"
		} else if vis.Coords.Altitude > 45 {
			reason = "Good altitude, minimal atmosphere"
		}

		suggestions = append(suggestions, TargetSuggestion{
			Object:      obj,
			Visibility:  vis,
			Score:       score,
			Reason:      reason,
			BestTime:    now,
			WindowHours: 4.0, // Simplified
		})
	}

	// Sort by score (simple bubble sort for small lists)
	for i := 0; i < len(suggestions)-1; i++ {
		for j := i + 1; j < len(suggestions); j++ {
			if suggestions[j].Score > suggestions[i].Score {
				suggestions[i], suggestions[j] = suggestions[j], suggestions[i]
			}
		}
	}

	if len(suggestions) > limit {
		suggestions = suggestions[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"suggestions": suggestions,
		"time":        now,
		"observer":    observer,
	})
}
