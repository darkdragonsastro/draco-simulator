package game

import "time"

// ChallengeType categorizes challenges
type ChallengeType string

const (
	ChallengeTypeTutorial ChallengeType = "tutorial"
	ChallengeTypeDaily    ChallengeType = "daily"
	ChallengeTypeWeekly   ChallengeType = "weekly"
	ChallengeTypeTarget   ChallengeType = "target"
	ChallengeTypeSkill    ChallengeType = "skill"
)

// ChallengeDifficulty indicates challenge difficulty
type ChallengeDifficulty string

const (
	DifficultyBeginner     ChallengeDifficulty = "beginner"
	DifficultyIntermediate ChallengeDifficulty = "intermediate"
	DifficultyAdvanced     ChallengeDifficulty = "advanced"
	DifficultyExpert       ChallengeDifficulty = "expert"
)

// Challenge represents a challenge or tutorial
type Challenge struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Type        ChallengeType       `json:"type"`
	Difficulty  ChallengeDifficulty `json:"difficulty"`
	XPReward    int                 `json:"xp_reward"`
	Credits     int                 `json:"credits_reward"`

	// Requirements
	Requirements []ChallengeRequirement `json:"requirements"`

	// Optional target object (for target challenges)
	TargetID string `json:"target_id,omitempty"`

	// Prerequisites (challenges that must be completed first)
	Prerequisites []string `json:"prerequisites,omitempty"`

	// Time limit (0 = no limit)
	TimeLimitMinutes int `json:"time_limit_minutes,omitempty"`

	// Tier required to unlock
	RequiredTier PlayerTier `json:"required_tier,omitempty"`
}

// ChallengeRequirement defines a single requirement for a challenge
type ChallengeRequirement struct {
	Type        string `json:"type"`        // e.g., "exposure_count", "hfr_below", "total_exposure"
	Description string `json:"description"`
	Target      any    `json:"target"`    // Target value
	Current     any    `json:"current"`   // Current progress
	Completed   bool   `json:"completed"`
}

// ChallengeProgress tracks progress on a challenge
type ChallengeProgress struct {
	ChallengeID  string                 `json:"challenge_id"`
	StartTime    time.Time              `json:"start_time"`
	Requirements []ChallengeRequirement `json:"requirements"`
	Completed    bool                   `json:"completed"`
	CompletedAt  time.Time              `json:"completed_at,omitempty"`
}

// AllChallenges contains all defined challenges
var AllChallenges = []Challenge{
	// Tutorial Challenges (Beginner)
	{
		ID:          "tutorial_connect",
		Name:        "Getting Started",
		Description: "Connect your camera and mount to begin your astrophotography journey.",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyBeginner,
		XPReward:    50,
		Credits:     100,
		Requirements: []ChallengeRequirement{
			{Type: "device_connected", Description: "Connect a camera", Target: "camera"},
			{Type: "device_connected", Description: "Connect a mount", Target: "mount"},
		},
	},
	{
		ID:          "tutorial_first_exposure",
		Name:        "First Light",
		Description: "Take your first astronomical exposure. Any duration will do!",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyBeginner,
		XPReward:    100,
		Credits:     200,
		Requirements: []ChallengeRequirement{
			{Type: "exposure_count", Description: "Take 1 exposure", Target: 1},
		},
		Prerequisites: []string{"tutorial_connect"},
	},
	{
		ID:          "tutorial_focus",
		Name:        "Sharp Focus",
		Description: "Use autofocus to achieve sharp stars. Try to get HFR below 3.0.",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyBeginner,
		XPReward:    150,
		Credits:     300,
		Requirements: []ChallengeRequirement{
			{Type: "autofocus_complete", Description: "Run autofocus", Target: 1},
			{Type: "hfr_below", Description: "Achieve HFR < 3.0", Target: 3.0},
		},
		Prerequisites: []string{"tutorial_first_exposure"},
	},
	{
		ID:          "tutorial_sequence",
		Name:        "Your First Sequence",
		Description: "Set up and run an imaging sequence with at least 5 frames.",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyBeginner,
		XPReward:    200,
		Credits:     500,
		Requirements: []ChallengeRequirement{
			{Type: "sequence_frames", Description: "Complete 5 frames in a sequence", Target: 5},
		},
		Prerequisites: []string{"tutorial_focus"},
	},

	// Intermediate Tutorials
	{
		ID:          "tutorial_guiding",
		Name:        "Guide Star",
		Description: "Learn to use autoguiding for better tracking. Calibrate and guide for 5 minutes.",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyIntermediate,
		XPReward:    300,
		Credits:     600,
		Requirements: []ChallengeRequirement{
			{Type: "guide_calibrate", Description: "Complete guide calibration", Target: 1},
			{Type: "guide_duration", Description: "Guide for 5 minutes", Target: 300},
		},
		Prerequisites: []string{"tutorial_sequence"},
		RequiredTier:  TierIntermediate,
	},
	{
		ID:          "tutorial_filters",
		Name:        "Multi-Filter Imaging",
		Description: "Capture images through different filters for color or narrowband imaging.",
		Type:        ChallengeTypeTutorial,
		Difficulty:  DifficultyIntermediate,
		XPReward:    250,
		Credits:     500,
		Requirements: []ChallengeRequirement{
			{Type: "filter_count", Description: "Use 3 different filters", Target: 3},
		},
		RequiredTier: TierIntermediate,
	},

	// Target Challenges
	{
		ID:          "challenge_m42",
		Name:        "The Orion Nebula",
		Description: "Image the magnificent Orion Nebula (M42). Capture at least 30 minutes total exposure.",
		Type:        ChallengeTypeTarget,
		Difficulty:  DifficultyBeginner,
		XPReward:    500,
		Credits:     1000,
		TargetID:    "M42",
		Requirements: []ChallengeRequirement{
			{Type: "target_exposure", Description: "30 minutes on M42", Target: 1800},
			{Type: "hfr_below", Description: "HFR < 2.5", Target: 2.5},
		},
	},
	{
		ID:          "challenge_m31",
		Name:        "Andromeda Rising",
		Description: "Capture the Andromeda Galaxy (M31). Use at least 60 minutes total exposure for detail.",
		Type:        ChallengeTypeTarget,
		Difficulty:  DifficultyIntermediate,
		XPReward:    750,
		Credits:     1500,
		TargetID:    "M31",
		Requirements: []ChallengeRequirement{
			{Type: "target_exposure", Description: "60 minutes on M31", Target: 3600},
			{Type: "hfr_below", Description: "HFR < 2.0", Target: 2.0},
		},
		RequiredTier: TierIntermediate,
	},
	{
		ID:          "challenge_m51",
		Name:        "Whirlpool Challenge",
		Description: "Image the Whirlpool Galaxy (M51). Bring out its spiral structure with 2+ hours of data.",
		Type:        ChallengeTypeTarget,
		Difficulty:  DifficultyAdvanced,
		XPReward:    1000,
		Credits:     2500,
		TargetID:    "M51",
		Requirements: []ChallengeRequirement{
			{Type: "target_exposure", Description: "2 hours on M51", Target: 7200},
			{Type: "hfr_below", Description: "HFR < 1.8", Target: 1.8},
			{Type: "guide_rms_below", Description: "Guide RMS < 1.0\"", Target: 1.0},
		},
		RequiredTier: TierAdvanced,
	},
	{
		ID:          "challenge_m101",
		Name:        "Pinwheel Pursuit",
		Description: "The faint Pinwheel Galaxy (M101) requires patience. Capture 4+ hours of data.",
		Type:        ChallengeTypeTarget,
		Difficulty:  DifficultyExpert,
		XPReward:    2000,
		Credits:     5000,
		TargetID:    "M101",
		Requirements: []ChallengeRequirement{
			{Type: "target_exposure", Description: "4 hours on M101", Target: 14400},
			{Type: "hfr_below", Description: "HFR < 1.5", Target: 1.5},
			{Type: "guide_rms_below", Description: "Guide RMS < 0.7\"", Target: 0.7},
		},
		RequiredTier: TierExpert,
	},

	// Skill Challenges
	{
		ID:          "challenge_perfect_focus",
		Name:        "Perfect Focus",
		Description: "Achieve excellent focus with HFR below 1.2 arcseconds.",
		Type:        ChallengeTypeSkill,
		Difficulty:  DifficultyAdvanced,
		XPReward:    500,
		Credits:     1000,
		Requirements: []ChallengeRequirement{
			{Type: "hfr_below", Description: "HFR < 1.2\"", Target: 1.2},
		},
		RequiredTier: TierAdvanced,
	},
	{
		ID:          "challenge_guide_master",
		Name:        "Guide Master",
		Description: "Maintain sub-arcsecond guiding for a full hour.",
		Type:        ChallengeTypeSkill,
		Difficulty:  DifficultyAdvanced,
		XPReward:    750,
		Credits:     1500,
		Requirements: []ChallengeRequirement{
			{Type: "guide_rms_below", Description: "RMS < 0.8\" for 1 hour", Target: 0.8},
			{Type: "guide_duration", Description: "Guide for 1 hour", Target: 3600},
		},
		RequiredTier: TierAdvanced,
	},
	{
		ID:               "challenge_marathon_session",
		Name:             "Night Marathon",
		Description:      "Complete an 8-hour imaging session with no major issues.",
		Type:             ChallengeTypeSkill,
		Difficulty:       DifficultyExpert,
		XPReward:         1500,
		Credits:          3500,
		TimeLimitMinutes: 480, // 8 hours
		Requirements: []ChallengeRequirement{
			{Type: "session_duration", Description: "8 hour session", Target: 28800},
			{Type: "exposure_count", Description: "At least 100 frames", Target: 100},
			{Type: "abort_count", Description: "No aborted frames", Target: 0},
		},
		RequiredTier: TierExpert,
	},
}

// challengeMap provides O(1) lookup by ID
var challengeMap = make(map[string]*Challenge)

func init() {
	for i := range AllChallenges {
		challengeMap[AllChallenges[i].ID] = &AllChallenges[i]
	}
}

// GetChallenge returns a challenge by ID
func GetChallenge(id string) *Challenge {
	return challengeMap[id]
}

// GetChallengesByType returns all challenges of a given type
func GetChallengesByType(ctype ChallengeType) []Challenge {
	var result []Challenge
	for _, c := range AllChallenges {
		if c.Type == ctype {
			result = append(result, c)
		}
	}
	return result
}

// GetChallengesByDifficulty returns all challenges of a given difficulty
func GetChallengesByDifficulty(difficulty ChallengeDifficulty) []Challenge {
	var result []Challenge
	for _, c := range AllChallenges {
		if c.Difficulty == difficulty {
			result = append(result, c)
		}
	}
	return result
}

// GetAvailableChallenges returns challenges available to a player
func GetAvailableChallenges(completedIDs []string, tier PlayerTier) []Challenge {
	completed := make(map[string]bool)
	for _, id := range completedIDs {
		completed[id] = true
	}

	tierRank := getTierRank(tier)

	var result []Challenge
	for _, c := range AllChallenges {
		// Skip if already completed
		if completed[c.ID] {
			continue
		}

		// Check tier requirement
		if c.RequiredTier != "" {
			requiredRank := getTierRank(c.RequiredTier)
			if tierRank < requiredRank {
				continue
			}
		}

		// Check prerequisites
		prereqsMet := true
		for _, prereq := range c.Prerequisites {
			if !completed[prereq] {
				prereqsMet = false
				break
			}
		}
		if !prereqsMet {
			continue
		}

		result = append(result, c)
	}

	return result
}

// GetTutorialSequence returns tutorials in order
func GetTutorialSequence() []Challenge {
	tutorials := GetChallengesByType(ChallengeTypeTutorial)

	// Sort by prerequisites (topological sort)
	// For simplicity, just return them in definition order
	// (they're already defined in order in AllChallenges)
	return tutorials
}

// getTierRank returns numeric rank for tier comparison
func getTierRank(tier PlayerTier) int {
	switch tier {
	case TierBeginner:
		return 1
	case TierIntermediate:
		return 2
	case TierAdvanced:
		return 3
	case TierExpert:
		return 4
	default:
		return 0
	}
}

// GetTotalChallengeCount returns the total number of challenges
func GetTotalChallengeCount() int {
	return len(AllChallenges)
}

// CalculateChallengeProgress returns completion percentage
func CalculateChallengeProgress(completedIDs []string) float64 {
	if len(AllChallenges) == 0 {
		return 0
	}
	return float64(len(completedIDs)) / float64(len(AllChallenges)) * 100
}
