package game

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/darkdragonsastro/draco-simulator/internal/database"
	"github.com/darkdragonsastro/draco-simulator/internal/eventbus"
)

// Store manages equipment purchasing and inventory
type Store struct {
	mu     sync.RWMutex
	bus    eventbus.EventBus
	db     database.Database
}

// NewStore creates a new equipment store
func NewStore(bus eventbus.EventBus, db database.Database) *Store {
	return &Store{
		bus:    bus,
		db:     db,
	}
}

// PurchaseResult contains the result of a purchase attempt
type PurchaseResult struct {
	Success      bool   `json:"success"`
	ErrorMessage string `json:"error_message,omitempty"`
	Equipment    *Equipment `json:"equipment,omitempty"`
	NewBalance   int    `json:"new_balance"`
}

// Purchase attempts to purchase equipment for a player
func (s *Store) Purchase(ctx context.Context, state *PlayerState, equipmentID string) PurchaseResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get the equipment
	equipment := GetEquipment(equipmentID)
	if equipment == nil {
		return PurchaseResult{
			Success:      false,
			ErrorMessage: "Equipment not found",
			NewBalance:   state.Credits,
		}
	}

	// Check if already owned
	for _, owned := range state.OwnedEquipment {
		if owned == equipmentID {
			return PurchaseResult{
				Success:      false,
				ErrorMessage: "You already own this equipment",
				NewBalance:   state.Credits,
			}
		}
	}

	// Check tier requirement
	if equipment.RequiredTier != "" {
		playerRank := getTierRank(state.Tier)
		requiredRank := getTierRank(equipment.RequiredTier)
		if playerRank < requiredRank {
			return PurchaseResult{
				Success:      false,
				ErrorMessage: fmt.Sprintf("Requires %s tier to purchase", equipment.RequiredTier),
				NewBalance:   state.Credits,
			}
		}
	}

	// Check credits
	if state.Credits < equipment.Price {
		return PurchaseResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("Insufficient credits. Need %d, have %d", equipment.Price, state.Credits),
			NewBalance:   state.Credits,
		}
	}

	// Make the purchase
	state.Credits -= equipment.Price
	state.OwnedEquipment = append(state.OwnedEquipment, equipmentID)

	// Publish purchase event
	if s.bus != nil {
		go s.bus.Publish(ctx, "game.equipment.purchased", map[string]any{
			"equipment_id":   equipmentID,
			"equipment_name": equipment.Name,
			"price":          equipment.Price,
			"new_balance":    state.Credits,
		})
	}

	log.Printf("Equipment purchased: id=%s name=%s price=%d new_balance=%d",
		equipmentID, equipment.Name, equipment.Price, state.Credits)

	// Check for equipment-related achievements
	s.checkEquipmentAchievements(ctx, state)

	return PurchaseResult{
		Success:    true,
		Equipment:  equipment,
		NewBalance: state.Credits,
	}
}

// checkEquipmentAchievements checks for equipment-related achievement unlocks
func (s *Store) checkEquipmentAchievements(ctx context.Context, state *PlayerState) {
	// Count equipment types owned
	typeCount := make(map[EquipmentType]int)
	for _, id := range state.OwnedEquipment {
		if equip := GetEquipment(id); equip != nil {
			typeCount[equip.Type]++
		}
	}

	// Full observatory achievement: camera, mount, focuser, filter wheel
	if typeCount[EquipmentTypeCamera] > 0 &&
		typeCount[EquipmentTypeMount] > 0 &&
		typeCount[EquipmentTypeFocuser] > 0 &&
		typeCount[EquipmentTypeFilterWheel] > 0 {

		// Check if already unlocked
		hasAchievement := false
		for _, a := range state.UnlockedAchievements {
			if a == "full_observatory" {
				hasAchievement = true
				break
			}
		}

		if !hasAchievement {
			state.UnlockedAchievements = append(state.UnlockedAchievements, "full_observatory")
			if s.bus != nil {
				go s.bus.Publish(ctx, "game.achievement.unlocked", map[string]any{
					"achievement_id": "full_observatory",
				})
			}
		}
	}
}

// GetOwnedEquipment returns all equipment owned by a player
func (s *Store) GetOwnedEquipment(state *PlayerState) []Equipment {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []Equipment
	for _, id := range state.OwnedEquipment {
		if equip := GetEquipment(id); equip != nil {
			result = append(result, *equip)
		}
	}
	return result
}

// GetOwnedByType returns owned equipment of a specific type
func (s *Store) GetOwnedByType(state *PlayerState, equipType EquipmentType) []Equipment {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []Equipment
	for _, id := range state.OwnedEquipment {
		if equip := GetEquipment(id); equip != nil && equip.Type == equipType {
			result = append(result, *equip)
		}
	}
	return result
}

// GetShopInventory returns equipment available for purchase
func (s *Store) GetShopInventory(state *PlayerState) ShopInventory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	inventory := ShopInventory{
		Categories: make(map[EquipmentType][]ShopItem),
	}

	owned := make(map[string]bool)
	for _, id := range state.OwnedEquipment {
		owned[id] = true
	}

	playerRank := getTierRank(state.Tier)

	for _, equip := range AllEquipment {
		item := ShopItem{
			Equipment:   equip,
			Owned:       owned[equip.ID],
			CanAfford:   state.Credits >= equip.Price,
			TierLocked:  false,
		}

		// Check tier lock
		if equip.RequiredTier != "" {
			requiredRank := getTierRank(equip.RequiredTier)
			if playerRank < requiredRank {
				item.TierLocked = true
				item.RequiredTierName = string(equip.RequiredTier)
			}
		}

		inventory.Categories[equip.Type] = append(inventory.Categories[equip.Type], item)
	}

	inventory.PlayerCredits = state.Credits
	inventory.PlayerTier = state.Tier

	return inventory
}

// ShopInventory represents the equipment store's inventory
type ShopInventory struct {
	Categories    map[EquipmentType][]ShopItem `json:"categories"`
	PlayerCredits int                          `json:"player_credits"`
	PlayerTier    PlayerTier                   `json:"player_tier"`
}

// ShopItem represents an item in the shop
type ShopItem struct {
	Equipment        Equipment `json:"equipment"`
	Owned            bool      `json:"owned"`
	CanAfford        bool      `json:"can_afford"`
	TierLocked       bool      `json:"tier_locked"`
	RequiredTierName string    `json:"required_tier_name,omitempty"`
}

// LoadoutManager handles equipment loadouts
type LoadoutManager struct {
	mu     sync.RWMutex
	db     database.Database
}

// NewLoadoutManager creates a new loadout manager
func NewLoadoutManager(db database.Database) *LoadoutManager {
	return &LoadoutManager{
		db:     db,
	}
}

// CreateLoadout creates a new equipment loadout
func (m *LoadoutManager) CreateLoadout(state *PlayerState, loadout EquipmentLoadout) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Validate all equipment is owned
	if err := m.validateLoadout(state, loadout); err != nil {
		return err
	}

	// Save loadout (in a real implementation, this would be persisted)
	return nil
}

// validateLoadout checks that all equipment in a loadout is owned
func (m *LoadoutManager) validateLoadout(state *PlayerState, loadout EquipmentLoadout) error {
	owned := make(map[string]bool)
	for _, id := range state.OwnedEquipment {
		owned[id] = true
	}

	checks := []struct {
		id   string
		name string
	}{
		{loadout.Camera, "camera"},
		{loadout.Mount, "mount"},
		{loadout.Focuser, "focuser"},
		{loadout.Telescope, "telescope"},
	}

	for _, check := range checks {
		if check.id != "" && !owned[check.id] {
			return fmt.Errorf("you don't own %s: %s", check.name, check.id)
		}
	}

	// Optional equipment
	optionalChecks := []struct {
		id   string
		name string
	}{
		{loadout.FilterWheel, "filter wheel"},
		{loadout.Guider, "guider"},
		{loadout.Rotator, "rotator"},
	}

	for _, check := range optionalChecks {
		if check.id != "" && !owned[check.id] {
			return fmt.Errorf("you don't own %s: %s", check.name, check.id)
		}
	}

	return nil
}

// GetLoadoutStats calculates combined stats for a loadout
func GetLoadoutStats(loadout EquipmentLoadout) LoadoutStats {
	stats := LoadoutStats{}

	camera := GetEquipment(loadout.Camera)
	telescope := GetEquipment(loadout.Telescope)
	mount := GetEquipment(loadout.Mount)
	focuser := GetEquipment(loadout.Focuser)

	if camera != nil {
		stats.SensorWidth = camera.Stats.SensorWidth
		stats.SensorHeight = camera.Stats.SensorHeight
		stats.PixelSize = camera.Stats.PixelSize
		stats.ReadNoise = camera.Stats.ReadNoise
		stats.BitDepth = camera.Stats.BitDepth
		stats.HasCooling = camera.Stats.HasCooling
		stats.CoolingDelta = camera.Stats.CoolingDelta
		stats.QE = camera.Stats.QE
	}

	if telescope != nil {
		stats.Aperture = telescope.Stats.Aperture
		stats.FocalLength = telescope.Stats.FocalLength
		stats.FocalRatio = telescope.Stats.FocalRatio
	}

	if mount != nil {
		stats.TrackingAccuracy = mount.Stats.TrackingAccuracy
		stats.PayloadCapacity = mount.Stats.PayloadCapacity
		stats.HasGOTO = mount.Stats.HasGOTO
		stats.HasGuidePort = mount.Stats.HasGuidePort
	}

	if focuser != nil {
		stats.HasTempComp = focuser.Stats.HasTempComp
		stats.FocuserBacklash = focuser.Stats.Backlash
	}

	// Calculate derived values
	if camera != nil && telescope != nil {
		stats.ImageScale = CalculateImageScale(telescope, camera)
		stats.FOVWidth, stats.FOVHeight = CalculateFieldOfView(telescope, camera)
	}

	return stats
}

// LoadoutStats contains combined stats for a complete loadout
type LoadoutStats struct {
	// Camera
	SensorWidth  int     `json:"sensor_width"`
	SensorHeight int     `json:"sensor_height"`
	PixelSize    float64 `json:"pixel_size"`
	ReadNoise    float64 `json:"read_noise"`
	BitDepth     int     `json:"bit_depth"`
	HasCooling   bool    `json:"has_cooling"`
	CoolingDelta float64 `json:"cooling_delta"`
	QE           float64 `json:"qe"`

	// Telescope
	Aperture    float64 `json:"aperture"`
	FocalLength float64 `json:"focal_length"`
	FocalRatio  float64 `json:"focal_ratio"`

	// Mount
	TrackingAccuracy float64 `json:"tracking_accuracy"`
	PayloadCapacity  float64 `json:"payload_capacity"`
	HasGOTO          bool    `json:"has_goto"`
	HasGuidePort     bool    `json:"has_guide_port"`

	// Focuser
	HasTempComp     bool `json:"has_temp_comp"`
	FocuserBacklash int  `json:"focuser_backlash"`

	// Derived
	ImageScale float64 `json:"image_scale"` // arcsec/pixel
	FOVWidth   float64 `json:"fov_width"`   // arcmin
	FOVHeight  float64 `json:"fov_height"`  // arcmin
}

// GetEquipmentUpgrades returns equipment upgrades available from current equipment
func GetEquipmentUpgrades(currentID string, playerTier PlayerTier) []Equipment {
	current := GetEquipment(currentID)
	if current == nil {
		return nil
	}

	var upgrades []Equipment
	playerRank := getTierRank(playerTier)

	for _, equip := range AllEquipment {
		// Same type only
		if equip.Type != current.Type {
			continue
		}

		// Skip same or lower tier
		if getTierEquipmentRank(equip.Tier) <= getTierEquipmentRank(current.Tier) {
			continue
		}

		// Check player tier requirement
		if equip.RequiredTier != "" {
			requiredRank := getTierRank(equip.RequiredTier)
			if playerRank < requiredRank {
				continue
			}
		}

		upgrades = append(upgrades, equip)
	}

	return upgrades
}

// getTierEquipmentRank returns numeric rank for equipment tier comparison
func getTierEquipmentRank(tier EquipmentTier) int {
	switch tier {
	case TierStarter:
		return 1
	case TierMidRange:
		return 2
	case TierProfessional:
		return 3
	case TierPremium:
		return 4
	default:
		return 0
	}
}
