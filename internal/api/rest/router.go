package rest

import (
	"net/http"

	"github.com/darkdragonsastro/draco-simulator/internal/catalog"
	"github.com/darkdragonsastro/draco-simulator/internal/game"
	"github.com/gin-gonic/gin"
)

// Server holds the HTTP server and its dependencies
type Server struct {
	router       *gin.Engine
	gameService  *game.Service
	starCatalog  catalog.StarCatalog
	dsoCatalog   catalog.DSOCatalog
	skyState     *SkyState
}

// SkyState holds the current sky simulation state
type SkyState struct {
	Observer     catalog.Observer
	TimeOffset   float64 // Hours offset from real time (0 = real time)
	UseRealTime  bool
	Conditions   SkyConditions
}

// SkyConditions holds atmospheric conditions
type SkyConditions struct {
	Seeing       float64 `json:"seeing"`        // arcseconds FWHM
	Transparency float64 `json:"transparency"`  // 0-1 scale
	CloudCover   float64 `json:"cloud_cover"`   // 0-1 scale
	BortleClass  int     `json:"bortle_class"`  // 1-9
	Temperature  float64 `json:"temperature"`   // Celsius
	Humidity     float64 `json:"humidity"`      // 0-100%
	WindSpeed    float64 `json:"wind_speed"`    // m/s
}

// Config holds server configuration
type Config struct {
	Address string
	Debug   bool
}

// NewServer creates a new HTTP server
func NewServer(cfg Config, gameService *game.Service, starCatalog catalog.StarCatalog, dsoCatalog catalog.DSOCatalog) *Server {
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	s := &Server{
		router:      gin.New(),
		gameService: gameService,
		starCatalog: starCatalog,
		dsoCatalog:  dsoCatalog,
		skyState: &SkyState{
			Observer: catalog.Observer{
				Latitude:  34.0522,  // Default: Los Angeles
				Longitude: -118.2437,
				Elevation: 100,
			},
			UseRealTime: true,
			Conditions: SkyConditions{
				Seeing:       2.5,
				Transparency: 0.8,
				CloudCover:   0.0,
				BortleClass:  6,
				Temperature:  15.0,
				Humidity:     50.0,
				WindSpeed:    5.0,
			},
		},
	}

	s.router.Use(gin.Recovery())
	s.router.Use(corsMiddleware())

	s.setupRoutes()

	return s
}

// setupRoutes configures all API routes
func (s *Server) setupRoutes() {
	api := s.router.Group("/api/v1")

	// Health check
	api.GET("/health", s.healthCheck)

	// Game endpoints
	gameGroup := api.Group("/game")
	{
		gameGroup.GET("/progress", s.getProgress)
		gameGroup.POST("/progress/reset", s.resetProgress)

		gameGroup.GET("/tutorials", s.getTutorials)
		gameGroup.POST("/tutorials/:id/start", s.startTutorial)
		gameGroup.POST("/tutorials/:id/complete", s.completeTutorial)

		gameGroup.GET("/challenges", s.getChallenges)
		gameGroup.GET("/challenges/available", s.getAvailableChallenges)
		gameGroup.POST("/challenges/:id/start", s.startChallenge)

		gameGroup.GET("/achievements", s.getAchievements)
		gameGroup.GET("/achievements/unlocked", s.getUnlockedAchievements)

		gameGroup.GET("/store", s.getStore)
		gameGroup.POST("/store/purchase/:id", s.purchaseEquipment)

		gameGroup.GET("/equipment/owned", s.getOwnedEquipment)
		gameGroup.GET("/equipment/loadout", s.getLoadout)
		gameGroup.POST("/equipment/loadout", s.setLoadout)

		gameGroup.GET("/leaderboard", s.getLeaderboard)

		gameGroup.POST("/score", s.scoreImage)
	}

	// Catalog endpoints
	catalogGroup := api.Group("/catalog")
	{
		catalogGroup.GET("/stars", s.searchStars)
		catalogGroup.GET("/stars/:id", s.getStar)

		catalogGroup.GET("/dso", s.searchDSO)
		catalogGroup.GET("/dso/:id", s.getDSO)
		catalogGroup.GET("/dso/messier", s.getMessierCatalog)

		catalogGroup.GET("/visible", s.getVisibleObjects)
		catalogGroup.GET("/suggest", s.suggestTargets)
	}

	// Sky endpoints
	skyGroup := api.Group("/sky")
	{
		skyGroup.GET("/conditions", s.getSkyConditions)
		skyGroup.PUT("/conditions", s.setSkyConditions)

		skyGroup.GET("/time", s.getSkyTime)
		skyGroup.PUT("/time", s.setSkyTime)

		skyGroup.GET("/location", s.getLocation)
		skyGroup.PUT("/location", s.setLocation)

		skyGroup.GET("/twilight", s.getTwilightTimes)
		skyGroup.GET("/moon", s.getMoonInfo)
		skyGroup.GET("/sun", s.getSunInfo)
	}
}

// Handler returns the HTTP handler
func (s *Server) Handler() http.Handler {
	return s.router
}

// Run starts the HTTP server
func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

// corsMiddleware adds CORS headers
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// healthCheck returns server health status
func (s *Server) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"version": "1.0.0",
	})
}
