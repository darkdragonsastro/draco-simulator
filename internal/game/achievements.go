package game

// AchievementRarity represents how rare/difficult an achievement is
type AchievementRarity string

const (
	RarityCommon    AchievementRarity = "common"
	RarityUncommon  AchievementRarity = "uncommon"
	RarityRare      AchievementRarity = "rare"
	RarityEpic      AchievementRarity = "epic"
	RarityLegendary AchievementRarity = "legendary"
)

// Achievement defines an unlockable achievement
type Achievement struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Description   string            `json:"description"`
	Rarity        AchievementRarity `json:"rarity"`
	XPReward      int               `json:"xp_reward"`
	CreditsReward int               `json:"credits_reward"`
	Icon          string            `json:"icon,omitempty"`
	Hidden        bool              `json:"hidden"` // Hidden until unlocked
	Category      string            `json:"category"`
}

// AchievementCategory groups related achievements
type AchievementCategory string

const (
	CategoryFirstSteps AchievementCategory = "first_steps"
	CategoryImaging    AchievementCategory = "imaging"
	CategoryFocus      AchievementCategory = "focus"
	CategoryGuiding    AchievementCategory = "guiding"
	CategoryTargets    AchievementCategory = "targets"
	CategoryMastery    AchievementCategory = "mastery"
	CategoryEquipment  AchievementCategory = "equipment"
	CategorySpecial    AchievementCategory = "special"
)

// AllAchievements contains all defined achievements
var AllAchievements = []Achievement{
	// First Steps
	{
		ID:            "first_light",
		Name:          "First Light",
		Description:   "Take your first exposure",
		Rarity:        RarityCommon,
		XPReward:      100,
		CreditsReward: 200,
		Category:      string(CategoryFirstSteps),
	},
	{
		ID:            "camera_connected",
		Name:          "Camera Ready",
		Description:   "Connect your first camera",
		Rarity:        RarityCommon,
		XPReward:      50,
		CreditsReward: 100,
		Category:      string(CategoryFirstSteps),
	},
	{
		ID:            "mount_connected",
		Name:          "Mount Up",
		Description:   "Connect your first mount",
		Rarity:        RarityCommon,
		XPReward:      50,
		CreditsReward: 100,
		Category:      string(CategoryFirstSteps),
	},
	{
		ID:            "first_sequence",
		Name:          "Sequence Complete",
		Description:   "Complete your first imaging sequence",
		Rarity:        RarityCommon,
		XPReward:      150,
		CreditsReward: 300,
		Category:      string(CategoryFirstSteps),
	},
	{
		ID:            "first_platesolve",
		Name:          "Where Am I?",
		Description:   "Successfully plate solve an image",
		Rarity:        RarityCommon,
		XPReward:      75,
		CreditsReward: 150,
		Category:      string(CategoryFirstSteps),
	},

	// Focus Achievements
	{
		ID:            "sharp_focus",
		Name:          "Sharp Focus",
		Description:   "Achieve HFR below 2.0 arcseconds",
		Rarity:        RarityUncommon,
		XPReward:      200,
		CreditsReward: 400,
		Category:      string(CategoryFocus),
	},
	{
		ID:            "pinpoint_stars",
		Name:          "Pinpoint Stars",
		Description:   "Achieve HFR below 1.5 arcseconds",
		Rarity:        RarityRare,
		XPReward:      500,
		CreditsReward: 1000,
		Category:      string(CategoryFocus),
	},
	{
		ID:            "focus_master",
		Name:          "Focus Master",
		Description:   "Achieve HFR below 1.0 arcsecond",
		Rarity:        RarityEpic,
		XPReward:      1000,
		CreditsReward: 2500,
		Category:      string(CategoryFocus),
	},
	{
		ID:            "autofocus_100",
		Name:          "Autofocus Addict",
		Description:   "Run autofocus 100 times",
		Rarity:        RarityUncommon,
		XPReward:      300,
		CreditsReward: 500,
		Category:      string(CategoryFocus),
	},

	// Guiding Achievements
	{
		ID:            "guide_calibrated",
		Name:          "Calibrated",
		Description:   "Complete guide calibration",
		Rarity:        RarityCommon,
		XPReward:      100,
		CreditsReward: 200,
		Category:      string(CategoryGuiding),
	},
	{
		ID:            "guide_sub_1",
		Name:          "Steady Tracking",
		Description:   "Achieve guiding RMS below 1 arcsecond",
		Rarity:        RarityUncommon,
		XPReward:      250,
		CreditsReward: 500,
		Category:      string(CategoryGuiding),
	},
	{
		ID:            "guide_sub_05",
		Name:          "Guide Master",
		Description:   "Achieve guiding RMS below 0.5 arcseconds",
		Rarity:        RarityRare,
		XPReward:      600,
		CreditsReward: 1500,
		Category:      string(CategoryGuiding),
	},
	{
		ID:            "guide_1_hour",
		Name:          "Steady Hand",
		Description:   "Guide continuously for 1 hour",
		Rarity:        RarityUncommon,
		XPReward:      200,
		CreditsReward: 400,
		Category:      string(CategoryGuiding),
	},

	// Imaging Achievements
	{
		ID:            "100_frames",
		Name:          "Century",
		Description:   "Capture 100 light frames",
		Rarity:        RarityUncommon,
		XPReward:      300,
		CreditsReward: 500,
		Category:      string(CategoryImaging),
	},
	{
		ID:            "1000_frames",
		Name:          "Thousand Suns",
		Description:   "Capture 1000 light frames",
		Rarity:        RarityRare,
		XPReward:      800,
		CreditsReward: 2000,
		Category:      string(CategoryImaging),
	},
	{
		ID:            "night_owl",
		Name:          "Night Owl",
		Description:   "Image for more than 4 hours in one session",
		Rarity:        RarityUncommon,
		XPReward:      400,
		CreditsReward: 800,
		Category:      string(CategoryImaging),
	},
	{
		ID:            "marathon",
		Name:          "Marathon",
		Description:   "Image for more than 8 hours in one session",
		Rarity:        RarityRare,
		XPReward:      800,
		CreditsReward: 2000,
		Category:      string(CategoryImaging),
	},
	{
		ID:            "long_exposure",
		Name:          "Long Haul",
		Description:   "Complete a single 10+ minute exposure",
		Rarity:        RarityUncommon,
		XPReward:      200,
		CreditsReward: 400,
		Category:      string(CategoryImaging),
	},

	// Target Achievements
	{
		ID:            "messier_beginner",
		Name:          "Messier Beginner",
		Description:   "Image 10 unique Messier objects",
		Rarity:        RarityUncommon,
		XPReward:      500,
		CreditsReward: 1000,
		Category:      string(CategoryTargets),
	},
	{
		ID:            "messier_enthusiast",
		Name:          "Messier Enthusiast",
		Description:   "Image 50 unique Messier objects",
		Rarity:        RarityRare,
		XPReward:      1500,
		CreditsReward: 3000,
		Category:      string(CategoryTargets),
	},
	{
		ID:            "messier_complete",
		Name:          "Messier Marathon",
		Description:   "Image all 110 Messier objects",
		Rarity:        RarityLegendary,
		XPReward:      5000,
		CreditsReward: 10000,
		Category:      string(CategoryTargets),
	},
	{
		ID:            "m42_imaged",
		Name:          "Orion's Jewel",
		Description:   "Image the Orion Nebula (M42)",
		Rarity:        RarityCommon,
		XPReward:      100,
		CreditsReward: 200,
		Category:      string(CategoryTargets),
	},
	{
		ID:            "m31_imaged",
		Name:          "Andromeda's Call",
		Description:   "Image the Andromeda Galaxy (M31)",
		Rarity:        RarityCommon,
		XPReward:      100,
		CreditsReward: 200,
		Category:      string(CategoryTargets),
	},
	{
		ID:            "galaxy_hunter",
		Name:          "Galaxy Hunter",
		Description:   "Image 20 different galaxies",
		Rarity:        RarityRare,
		XPReward:      1000,
		CreditsReward: 2500,
		Category:      string(CategoryTargets),
	},

	// Mastery Achievements
	{
		ID:            "level_10",
		Name:          "Apprentice Astronomer",
		Description:   "Reach level 10",
		Rarity:        RarityUncommon,
		XPReward:      200,
		CreditsReward: 500,
		Category:      string(CategoryMastery),
	},
	{
		ID:            "level_25",
		Name:          "Journeyman Astronomer",
		Description:   "Reach level 25",
		Rarity:        RarityRare,
		XPReward:      500,
		CreditsReward: 1500,
		Category:      string(CategoryMastery),
	},
	{
		ID:            "level_50",
		Name:          "Expert Astronomer",
		Description:   "Reach level 50",
		Rarity:        RarityEpic,
		XPReward:      1500,
		CreditsReward: 5000,
		Category:      string(CategoryMastery),
	},
	{
		ID:            "intermediate_tier",
		Name:          "Rising Star",
		Description:   "Reach Intermediate tier",
		Rarity:        RarityUncommon,
		XPReward:      250,
		CreditsReward: 750,
		Category:      string(CategoryMastery),
	},
	{
		ID:            "advanced_tier",
		Name:          "Seasoned Imager",
		Description:   "Reach Advanced tier",
		Rarity:        RarityRare,
		XPReward:      750,
		CreditsReward: 2500,
		Category:      string(CategoryMastery),
	},
	{
		ID:            "expert_tier",
		Name:          "Master of the Night Sky",
		Description:   "Reach Expert tier",
		Rarity:        RarityLegendary,
		XPReward:      2500,
		CreditsReward: 10000,
		Category:      string(CategoryMastery),
	},

	// Special Achievements
	{
		ID:            "hardware_owner",
		Name:          "Hardware Owner",
		Description:   "Connect your first real device",
		Rarity:        RarityRare,
		XPReward:      500,
		CreditsReward: 1000,
		Hidden:        true,
		Category:      string(CategorySpecial),
	},
	{
		ID:            "full_observatory",
		Name:          "Full Observatory",
		Description:   "Connect camera, mount, focuser, and filter wheel",
		Rarity:        RarityRare,
		XPReward:      750,
		CreditsReward: 2000,
		Category:      string(CategorySpecial),
	},
	{
		ID:            "perfect_night",
		Name:          "Perfect Night",
		Description:   "Complete a session with no aborted exposures",
		Rarity:        RarityEpic,
		XPReward:      1000,
		CreditsReward: 3000,
		Category:      string(CategorySpecial),
	},
}

// achievementMap provides O(1) lookup by ID
var achievementMap = make(map[string]*Achievement)

func init() {
	for i := range AllAchievements {
		achievementMap[AllAchievements[i].ID] = &AllAchievements[i]
	}
}

// GetAchievement returns an achievement by ID
func GetAchievement(id string) *Achievement {
	return achievementMap[id]
}

// GetAchievementsByCategory returns all achievements in a category
func GetAchievementsByCategory(category AchievementCategory) []Achievement {
	var result []Achievement
	for _, a := range AllAchievements {
		if a.Category == string(category) {
			result = append(result, a)
		}
	}
	return result
}

// GetAchievementsByRarity returns all achievements of a given rarity
func GetAchievementsByRarity(rarity AchievementRarity) []Achievement {
	var result []Achievement
	for _, a := range AllAchievements {
		if a.Rarity == rarity {
			result = append(result, a)
		}
	}
	return result
}

// GetVisibleAchievements returns achievements that should be shown (not hidden)
func GetVisibleAchievements(unlockedIDs []string) []Achievement {
	unlocked := make(map[string]bool)
	for _, id := range unlockedIDs {
		unlocked[id] = true
	}

	var result []Achievement
	for _, a := range AllAchievements {
		// Show if not hidden OR if already unlocked
		if !a.Hidden || unlocked[a.ID] {
			result = append(result, a)
		}
	}
	return result
}

// GetTotalAchievementCount returns the total number of achievements
func GetTotalAchievementCount() int {
	return len(AllAchievements)
}

// CalculateAchievementProgress returns completion percentage
func CalculateAchievementProgress(unlockedIDs []string) float64 {
	if len(AllAchievements) == 0 {
		return 0
	}
	return float64(len(unlockedIDs)) / float64(len(AllAchievements)) * 100
}
