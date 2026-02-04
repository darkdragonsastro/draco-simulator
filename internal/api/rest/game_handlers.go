package rest

import (
	"net/http"

	"github.com/darkdragonsastro/draco-simulator/internal/game"
	"github.com/gin-gonic/gin"
)

// ProgressResponse contains player progress data
type ProgressResponse struct {
	Level                int             `json:"level"`
	XP                   int             `json:"xp"`
	XPToNextLevel        int             `json:"xp_to_next_level"`
	Tier                 game.PlayerTier `json:"tier"`
	Credits              int             `json:"credits"`
	TotalExposureTime    float64         `json:"total_exposure_time"`
	TotalImages          int             `json:"total_images"`
	UnlockedAchievements []string        `json:"unlocked_achievements"`
	AchievementProgress  float64         `json:"achievement_progress"`
}

func (s *Server) getProgress(c *gin.Context) {
	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	state := s.gameService.GetPlayerState()
	progressInfo := s.gameService.GetProgress()

	response := ProgressResponse{
		Level:                state.Level,
		XP:                   state.XP,
		XPToNextLevel:        progressInfo.XPToNextLevel,
		Tier:                 state.Tier,
		Credits:              state.Credits,
		TotalExposureTime:    state.TotalExposureTime,
		TotalImages:          state.TotalImages,
		UnlockedAchievements: state.UnlockedAchievements,
		AchievementProgress:  game.CalculateAchievementProgress(state.UnlockedAchievements),
	}

	c.JSON(http.StatusOK, response)
}

func (s *Server) resetProgress(c *gin.Context) {
	// Not implemented - would need to add method to service
	c.JSON(http.StatusNotImplemented, gin.H{"error": "reset not implemented"})
}

func (s *Server) getTutorials(c *gin.Context) {
	tutorials := game.GetTutorialSequence()
	c.JSON(http.StatusOK, tutorials)
}

func (s *Server) startTutorial(c *gin.Context) {
	id := c.Param("id")
	challenge := game.GetChallenge(id)
	if challenge == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tutorial not found"})
		return
	}

	if challenge.Type != game.ChallengeTypeTutorial {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not a tutorial"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "started",
		"challenge": challenge,
	})
}

func (s *Server) completeTutorial(c *gin.Context) {
	id := c.Param("id")
	challenge := game.GetChallenge(id)
	if challenge == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tutorial not found"})
		return
	}

	// Tutorial completion would need to be tracked by the service
	// For now, just return success with the rewards
	c.JSON(http.StatusOK, gin.H{
		"status":         "completed",
		"xp_earned":      challenge.XPReward,
		"credits_earned": challenge.Credits,
	})
}

func (s *Server) getChallenges(c *gin.Context) {
	challenges := game.AllChallenges
	c.JSON(http.StatusOK, challenges)
}

func (s *Server) getAvailableChallenges(c *gin.Context) {
	if s.gameService == nil {
		// Return all beginner challenges if no service
		available := game.GetChallengesByDifficulty(game.DifficultyBeginner)
		c.JSON(http.StatusOK, available)
		return
	}

	state := s.gameService.GetPlayerState()
	// Use empty completed list since PlayerState doesn't track challenges
	available := game.GetAvailableChallenges([]string{}, state.Tier)
	c.JSON(http.StatusOK, available)
}

func (s *Server) startChallenge(c *gin.Context) {
	id := c.Param("id")
	challenge := game.GetChallenge(id)
	if challenge == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "challenge not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "started",
		"challenge": challenge,
	})
}

func (s *Server) getAchievements(c *gin.Context) {
	if s.gameService == nil {
		achievements := game.AllAchievements
		c.JSON(http.StatusOK, achievements)
		return
	}

	state := s.gameService.GetPlayerState()
	achievements := game.GetVisibleAchievements(state.UnlockedAchievements)
	c.JSON(http.StatusOK, achievements)
}

func (s *Server) getUnlockedAchievements(c *gin.Context) {
	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	state := s.gameService.GetPlayerState()

	var unlocked []game.Achievement
	for _, id := range state.UnlockedAchievements {
		if a := game.GetAchievement(id); a != nil {
			unlocked = append(unlocked, *a)
		}
	}

	c.JSON(http.StatusOK, unlocked)
}

func (s *Server) getStore(c *gin.Context) {
	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	state := s.gameService.GetPlayerState()

	// Build a simple shop inventory
	inventory := gin.H{
		"equipment":      game.AllEquipment,
		"player_credits": state.Credits,
		"player_tier":    state.Tier,
		"owned":          state.OwnedEquipment,
	}

	c.JSON(http.StatusOK, inventory)
}

func (s *Server) purchaseEquipment(c *gin.Context) {
	id := c.Param("id")

	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	equipment := game.GetEquipment(id)
	if equipment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "equipment not found"})
		return
	}

	// Use SpendCredits to attempt purchase
	if !s.gameService.SpendCredits(equipment.Price, "purchase:"+id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient credits"})
		return
	}

	// Note: This doesn't actually add the equipment to owned list
	// That would require additional service method
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"equipment":  equipment,
		"new_balance": s.gameService.GetProgress().Credits,
	})
}

func (s *Server) getOwnedEquipment(c *gin.Context) {
	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	state := s.gameService.GetPlayerState()

	var owned []game.Equipment
	for _, id := range state.OwnedEquipment {
		if e := game.GetEquipment(id); e != nil {
			owned = append(owned, *e)
		}
	}

	c.JSON(http.StatusOK, owned)
}

func (s *Server) getLoadout(c *gin.Context) {
	if s.gameService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "game service not available"})
		return
	}

	state := s.gameService.GetPlayerState()
	c.JSON(http.StatusOK, gin.H{
		"loadout_id": state.CurrentLoadout,
	})
}

func (s *Server) setLoadout(c *gin.Context) {
	// Not implemented - would need to add method to service
	c.JSON(http.StatusNotImplemented, gin.H{"error": "set loadout not implemented"})
}

func (s *Server) getLeaderboard(c *gin.Context) {
	// Placeholder - would need persistent storage for real leaderboard
	c.JSON(http.StatusOK, gin.H{
		"leaderboard": []gin.H{},
		"message":     "leaderboard not yet implemented",
	})
}

// ScoreRequest contains image data for scoring
type ScoreRequest struct {
	HFR          float64 `json:"hfr"`
	FWHM         float64 `json:"fwhm"`
	StarCount    int     `json:"star_count"`
	Elongation   float64 `json:"elongation"`
	GuideRMS     float64 `json:"guide_rms"`
	ExposureTime float64 `json:"exposure_time"`
	Gain         int     `json:"gain"`
	MeanADU      float64 `json:"mean_adu"`
	MaxADU       float64 `json:"max_adu"`
}

func (s *Server) scoreImage(c *gin.Context) {
	var req ScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	scorer := game.NewImageScorer()
	metrics := game.ImageMetrics{
		HFR:          req.HFR,
		FWHM:         req.FWHM,
		StarCount:    req.StarCount,
		Elongation:   req.Elongation,
		GuideRMS:     req.GuideRMS,
		ExposureTime: req.ExposureTime,
		Gain:         req.Gain,
		MeanADU:      req.MeanADU,
		MaxADU:       req.MaxADU,
	}

	result := scorer.ScoreImage(metrics)
	c.JSON(http.StatusOK, result)
}
