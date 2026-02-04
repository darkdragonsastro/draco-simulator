// Package game provides gamification features for the Draco astrophotography simulator.
//
// This package implements:
//   - User progression (XP, levels, tiers)
//   - Virtual currency (credits)
//   - Achievements and badges
//   - Challenges and tutorials
//   - Image quality scoring
//   - Leaderboards
//
// The game service integrates with the capture and equipment services to track
// user activities and award progress.
package game

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/darkdragonsastro/draco-simulator/internal/database"
	"github.com/darkdragonsastro/draco-simulator/internal/eventbus"
)

// PlayerTier represents the player's progression tier
type PlayerTier string

const (
	TierBeginner     PlayerTier = "beginner"
	TierIntermediate PlayerTier = "intermediate"
	TierAdvanced     PlayerTier = "advanced"
	TierExpert       PlayerTier = "expert"
)

// Service implements the game/gamification service
type Service struct {
	mu sync.RWMutex

	// Dependencies
	bus eventbus.EventBus
	db  database.Database

	// State
	subscriptions []eventbus.SubscriptionID
	playerState   *PlayerState
	running       bool
}

// Config holds configuration for the game service
type Config struct {
	// XP multipliers for different activities
	XPMultiplier float64 `json:"xp_multiplier"`

	// Enable tutorial mode for new players
	TutorialEnabled bool `json:"tutorial_enabled"`

	// Enable achievements
	AchievementsEnabled bool `json:"achievements_enabled"`

	// Enable leaderboards
	LeaderboardsEnabled bool `json:"leaderboards_enabled"`
}

// DefaultConfig returns default game configuration
func DefaultConfig() Config {
	return Config{
		XPMultiplier:        1.0,
		TutorialEnabled:     true,
		AchievementsEnabled: true,
		LeaderboardsEnabled: true,
	}
}

// PlayerState tracks the current player's progress
type PlayerState struct {
	// Identity
	PlayerID string `json:"player_id"`
	Username string `json:"username"`

	// Progression
	XP      int        `json:"xp"`
	Level   int        `json:"level"`
	Tier    PlayerTier `json:"tier"`
	Credits int        `json:"credits"`

	// Statistics
	TotalExposureTime float64   `json:"total_exposure_time"` // seconds
	TotalImages       int       `json:"total_images"`
	TotalSessions     int       `json:"total_sessions"`
	BestHFR           float64   `json:"best_hfr"`      // lowest HFR achieved
	BestGuideRMS      float64   `json:"best_guide_rms"` // lowest guide RMS
	ObjectsImaged     []string  `json:"objects_imaged"` // DSO IDs
	FirstLightDate    time.Time `json:"first_light_date"`

	// Achievements
	UnlockedAchievements []string `json:"unlocked_achievements"`

	// Current session
	SessionStartTime time.Time `json:"session_start_time"`
	SessionXPEarned  int       `json:"session_xp_earned"`

	// Equipment
	OwnedEquipment []string `json:"owned_equipment"`
	CurrentLoadout string   `json:"current_loadout"`
}

// NewService creates a new game service
func NewService(bus eventbus.EventBus, db database.Database) *Service {
	return &Service{
		bus:           bus,
		db:            db,
		subscriptions: make([]eventbus.SubscriptionID, 0),
	}
}

// Initialize prepares the service
func (s *Service) Initialize(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Println("Initializing game service")

	// Load or create player state
	if err := s.loadPlayerState(ctx); err != nil {
		log.Printf("Could not load player state, creating new: %v", err)
		s.playerState = s.createNewPlayerState()
	}

	return nil
}

// Start begins the service
func (s *Service) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Println("Starting game service")

	// Subscribe to relevant events
	if err := s.subscribeToEvents(ctx); err != nil {
		return fmt.Errorf("subscribe to events: %w", err)
	}

	// Start session
	s.playerState.SessionStartTime = time.Now()
	s.playerState.SessionXPEarned = 0
	s.playerState.TotalSessions++
	s.running = true

	return nil
}

// Stop gracefully stops the service
func (s *Service) Stop(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Println("Stopping game service")

	// Unsubscribe from events
	for _, subID := range s.subscriptions {
		if err := s.bus.Unsubscribe(ctx, subID); err != nil {
			log.Printf("Failed to unsubscribe %s: %v", subID, err)
		}
	}
	s.subscriptions = nil

	// Save player state
	if err := s.savePlayerState(ctx); err != nil {
		log.Printf("Failed to save player state: %v", err)
	}

	s.running = false
	return nil
}

// subscribeToEvents sets up event subscriptions
func (s *Service) subscribeToEvents(ctx context.Context) error {
	events := []struct {
		event   string
		handler func(eventbus.Event)
	}{
		{"capture.exposure.complete", s.handleExposureComplete},
		{"capture.sequence.complete", s.handleSequenceComplete},
		{"focus.autofocus.complete", s.handleAutofocusComplete},
		{"guide.calibration.complete", s.handleGuideCalibrationComplete},
		{"equipment.device.connected", s.handleDeviceConnected},
		{"align.platesolve.complete", s.handlePlateSolveComplete},
	}

	for _, e := range events {
		subID, err := s.bus.Subscribe(ctx, e.event, e.handler)
		if err != nil {
			return fmt.Errorf("subscribe to %s: %w", e.event, err)
		}
		s.subscriptions = append(s.subscriptions, subID)
	}

	return nil
}

// Event handlers

func (s *Service) handleExposureComplete(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Extract exposure data
	data, ok := e.Data.(map[string]any)
	if !ok {
		return
	}

	duration, _ := data["duration"].(float64)
	imageType, _ := data["image_type"].(string)

	// Award XP for taking exposures
	if imageType == "light" || imageType == "Light" {
		xp := int(duration * 0.1) // 0.1 XP per second of exposure
		if xp < 1 {
			xp = 1
		}
		s.awardXP(xp, "exposure")

		// Track statistics
		s.playerState.TotalExposureTime += duration
		s.playerState.TotalImages++

		// Check for first light
		if s.playerState.FirstLightDate.IsZero() {
			s.playerState.FirstLightDate = time.Now()
			s.unlockAchievement("first_light")
		}
	}
}

func (s *Service) handleSequenceComplete(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, ok := e.Data.(map[string]any)
	if !ok {
		return
	}

	// Award XP for completing sequences
	totalFrames, _ := data["total_frames"].(int)
	xp := totalFrames * 5 // 5 XP per frame in a completed sequence
	s.awardXP(xp, "sequence_complete")

	// Award credits
	credits := totalFrames * 10
	s.awardCredits(credits, "sequence_complete")

	// Check achievements
	if target, ok := data["target"].(string); ok {
		s.recordObjectImaged(target)
	}
}

func (s *Service) handleAutofocusComplete(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, ok := e.Data.(map[string]any)
	if !ok {
		return
	}

	// Award XP for successful autofocus
	if success, _ := data["success"].(bool); success {
		s.awardXP(25, "autofocus")

		// Track best HFR
		if hfr, ok := data["hfr"].(float64); ok {
			if s.playerState.BestHFR == 0 || hfr < s.playerState.BestHFR {
				s.playerState.BestHFR = hfr

				// Achievement for sharp focus
				if hfr < 2.0 {
					s.unlockAchievement("sharp_focus")
				}
				if hfr < 1.5 {
					s.unlockAchievement("pinpoint_stars")
				}
			}
		}
	}
}

func (s *Service) handleGuideCalibrationComplete(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.awardXP(50, "guide_calibration")
}

func (s *Service) handleDeviceConnected(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, ok := e.Data.(map[string]any)
	if !ok {
		return
	}

	deviceType, _ := data["device_type"].(string)

	// Small XP for connecting devices (encourages setup)
	s.awardXP(5, "device_connect")

	// Track device types for achievements
	if deviceType == "camera" {
		s.checkAchievement("camera_connected")
	} else if deviceType == "mount" {
		s.checkAchievement("mount_connected")
	}
}

func (s *Service) handlePlateSolveComplete(e eventbus.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, ok := e.Data.(map[string]any)
	if !ok {
		return
	}

	if success, _ := data["success"].(bool); success {
		s.awardXP(30, "plate_solve")
	}
}

// Core progression methods

// awardXP adds XP and handles level up
func (s *Service) awardXP(amount int, source string) {
	s.playerState.XP += amount
	s.playerState.SessionXPEarned += amount

	oldLevel := s.playerState.Level
	s.playerState.Level = s.calculateLevel(s.playerState.XP)

	if s.playerState.Level > oldLevel {
		s.handleLevelUp(oldLevel, s.playerState.Level)
	}

	s.updateTier()

	// Publish event
	go s.bus.Publish(context.Background(), "game.xp.earned", map[string]any{
		"amount":   amount,
		"source":   source,
		"total_xp": s.playerState.XP,
		"level":    s.playerState.Level,
	})

	log.Printf("XP awarded: %d from %s (total: %d, level: %d)", amount, source, s.playerState.XP, s.playerState.Level)
}

// awardCredits adds credits
func (s *Service) awardCredits(amount int, source string) {
	s.playerState.Credits += amount

	go s.bus.Publish(context.Background(), "game.credits.earned", map[string]any{
		"amount": amount,
		"source": source,
		"total":  s.playerState.Credits,
	})

	log.Printf("Credits awarded: %d from %s (total: %d)", amount, source, s.playerState.Credits)
}

// calculateLevel determines level from XP
func (s *Service) calculateLevel(xp int) int {
	// XP thresholds: 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, ...
	// Formula: level = floor(sqrt(xp / 50))
	if xp <= 0 {
		return 1
	}
	level := int(float64(xp) / 50.0)
	level = int(level / level) // sqrt approximation
	if level < 1 {
		level = 1
	}
	return level
}

// xpForLevel returns XP needed to reach a level
func xpForLevel(level int) int {
	if level <= 1 {
		return 0
	}
	// Quadratic progression
	return 50 * level * level
}

// updateTier updates the player's tier based on level
func (s *Service) updateTier() {
	oldTier := s.playerState.Tier

	switch {
	case s.playerState.Level >= 50:
		s.playerState.Tier = TierExpert
	case s.playerState.Level >= 20:
		s.playerState.Tier = TierAdvanced
	case s.playerState.Level >= 5:
		s.playerState.Tier = TierIntermediate
	default:
		s.playerState.Tier = TierBeginner
	}

	if s.playerState.Tier != oldTier && oldTier != "" {
		s.handleTierUp(oldTier, s.playerState.Tier)
	}
}

// handleLevelUp processes a level up
func (s *Service) handleLevelUp(oldLevel, newLevel int) {
	// Award credits for leveling up
	credits := newLevel * 100
	s.playerState.Credits += credits

	go s.bus.Publish(context.Background(), "game.level.up", map[string]any{
		"old_level":       oldLevel,
		"new_level":       newLevel,
		"credits_awarded": credits,
	})

	log.Printf("Level up! %d -> %d (credits: %d)", oldLevel, newLevel, credits)
}

// handleTierUp processes a tier upgrade
func (s *Service) handleTierUp(oldTier, newTier PlayerTier) {
	go s.bus.Publish(context.Background(), "game.tier.up", map[string]any{
		"old_tier": oldTier,
		"new_tier": newTier,
	})

	log.Printf("Tier up! %s -> %s", oldTier, newTier)
}

// Achievement methods

func (s *Service) unlockAchievement(achievementID string) {
	// Check if already unlocked
	for _, a := range s.playerState.UnlockedAchievements {
		if a == achievementID {
			return
		}
	}

	s.playerState.UnlockedAchievements = append(s.playerState.UnlockedAchievements, achievementID)

	// Award XP and credits for achievement
	achievement := GetAchievement(achievementID)
	if achievement != nil {
		s.playerState.XP += achievement.XPReward
		s.playerState.Credits += achievement.CreditsReward
	}

	go s.bus.Publish(context.Background(), "game.achievement.unlocked", map[string]any{
		"achievement_id": achievementID,
	})

	log.Printf("Achievement unlocked: %s", achievementID)
}

func (s *Service) checkAchievement(achievementID string) {
	// Check conditions for the achievement
	// This is called by event handlers to check if conditions are met
	// For simple achievements, just unlock them
	s.unlockAchievement(achievementID)
}

func (s *Service) recordObjectImaged(objectID string) {
	// Check if already imaged
	for _, obj := range s.playerState.ObjectsImaged {
		if obj == objectID {
			return
		}
	}

	s.playerState.ObjectsImaged = append(s.playerState.ObjectsImaged, objectID)

	// Check Messier marathon achievement
	if len(s.playerState.ObjectsImaged) >= 10 {
		s.unlockAchievement("messier_beginner")
	}
	if len(s.playerState.ObjectsImaged) >= 50 {
		s.unlockAchievement("messier_enthusiast")
	}
	if len(s.playerState.ObjectsImaged) >= 110 {
		s.unlockAchievement("messier_complete")
	}
}

// State persistence

func (s *Service) loadPlayerState(ctx context.Context) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}

	var state PlayerState
	if err := s.db.GetJSON(ctx, "game/v1/player/state", &state); err != nil {
		return err
	}

	s.playerState = &state
	return nil
}

func (s *Service) savePlayerState(ctx context.Context) error {
	if s.db == nil || s.playerState == nil {
		return nil
	}

	return s.db.SetJSON(ctx, "game/v1/player/state", s.playerState)
}

func (s *Service) createNewPlayerState() *PlayerState {
	return &PlayerState{
		PlayerID:             fmt.Sprintf("player_%d", time.Now().UnixNano()),
		Username:             "Astronomer",
		XP:                   0,
		Level:                1,
		Tier:                 TierBeginner,
		Credits:              1000, // Starting credits
		UnlockedAchievements: []string{},
		OwnedEquipment:       []string{"starter_camera", "starter_mount"},
		ObjectsImaged:        []string{},
	}
}

// Public API methods

// GetPlayerState returns the current player state (read-only copy)
func (s *Service) GetPlayerState() PlayerState {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.playerState == nil {
		return PlayerState{}
	}
	return *s.playerState
}

// GetProgress returns progression information
func (s *Service) GetProgress() ProgressInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.playerState == nil {
		return ProgressInfo{}
	}

	currentLevelXP := xpForLevel(s.playerState.Level)
	nextLevelXP := xpForLevel(s.playerState.Level + 1)
	xpInLevel := s.playerState.XP - currentLevelXP
	xpNeeded := nextLevelXP - currentLevelXP

	return ProgressInfo{
		Level:            s.playerState.Level,
		Tier:             s.playerState.Tier,
		TotalXP:          s.playerState.XP,
		XPInCurrentLevel: xpInLevel,
		XPToNextLevel:    xpNeeded,
		LevelProgress:    float64(xpInLevel) / float64(xpNeeded),
		Credits:          s.playerState.Credits,
	}
}

// ProgressInfo contains progression summary
type ProgressInfo struct {
	Level            int        `json:"level"`
	Tier             PlayerTier `json:"tier"`
	TotalXP          int        `json:"total_xp"`
	XPInCurrentLevel int        `json:"xp_in_level"`
	XPToNextLevel    int        `json:"xp_to_next_level"`
	LevelProgress    float64    `json:"level_progress"`
	Credits          int        `json:"credits"`
}

// SpendCredits attempts to spend credits, returns false if insufficient
func (s *Service) SpendCredits(amount int, reason string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.playerState.Credits < amount {
		return false
	}

	s.playerState.Credits -= amount

	go s.bus.Publish(context.Background(), "game.credits.spent", map[string]any{
		"amount":    amount,
		"reason":    reason,
		"remaining": s.playerState.Credits,
	})

	return true
}
