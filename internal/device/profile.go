// Package device provides device abstraction and profile management
package device

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// ConnectionType defines how to connect to a device
type ConnectionType string

const (
	ConnectionTypeVirtual ConnectionType = "virtual"
	ConnectionTypeINDI    ConnectionType = "indi"
	ConnectionTypeAlpaca  ConnectionType = "alpaca"
)

// DeviceType identifies the type of astronomical device
type DeviceType string

const (
	DeviceTypeCamera      DeviceType = "camera"
	DeviceTypeMount       DeviceType = "mount"
	DeviceTypeFocuser     DeviceType = "focuser"
	DeviceTypeFilterWheel DeviceType = "filter_wheel"
	DeviceTypeGuider      DeviceType = "guider"
	DeviceTypeRotator     DeviceType = "rotator"
	DeviceTypeDome        DeviceType = "dome"
	DeviceTypeWeather     DeviceType = "weather"
)

// DeviceProfile defines how to connect to a specific device
type DeviceProfile struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	DeviceType       DeviceType        `json:"device_type"`
	ConnectionType   ConnectionType    `json:"connection_type"`
	ConnectionConfig map[string]any    `json:"connection_config"`
	Properties       map[string]any    `json:"properties,omitempty"`
	Enabled          bool              `json:"enabled"`
}

// EquipmentProfile groups devices into a complete setup
type EquipmentProfile struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	IsDefault   bool            `json:"is_default"`
	Mode        string          `json:"mode"` // "simulation", "live", "hybrid"
	Devices     []DeviceProfile `json:"devices"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}

// ProfileManager manages equipment profiles
type ProfileManager struct {
	mu          sync.RWMutex
	profiles    map[string]*EquipmentProfile
	activeID    string
	storagePath string
}

// NewProfileManager creates a new profile manager
func NewProfileManager(storagePath string) *ProfileManager {
	pm := &ProfileManager{
		profiles:    make(map[string]*EquipmentProfile),
		storagePath: storagePath,
	}

	// Load existing profiles
	pm.loadProfiles()

	// Ensure default virtual profile exists
	if len(pm.profiles) == 0 {
		pm.createDefaultProfile()
	}

	return pm
}

// GetProfile returns a profile by ID
func (pm *ProfileManager) GetProfile(id string) (*EquipmentProfile, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	profile, ok := pm.profiles[id]
	if !ok {
		return nil, fmt.Errorf("profile not found: %s", id)
	}
	return profile, nil
}

// GetActiveProfile returns the currently active profile
func (pm *ProfileManager) GetActiveProfile() (*EquipmentProfile, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if pm.activeID == "" {
		// Return default profile
		for _, p := range pm.profiles {
			if p.IsDefault {
				return p, nil
			}
		}
		return nil, fmt.Errorf("no active profile")
	}

	profile, ok := pm.profiles[pm.activeID]
	if !ok {
		return nil, fmt.Errorf("active profile not found: %s", pm.activeID)
	}
	return profile, nil
}

// SetActiveProfile sets the active profile
func (pm *ProfileManager) SetActiveProfile(id string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if _, ok := pm.profiles[id]; !ok {
		return fmt.Errorf("profile not found: %s", id)
	}
	pm.activeID = id
	return nil
}

// ListProfiles returns all profiles
func (pm *ProfileManager) ListProfiles() []*EquipmentProfile {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	profiles := make([]*EquipmentProfile, 0, len(pm.profiles))
	for _, p := range pm.profiles {
		profiles = append(profiles, p)
	}
	return profiles
}

// CreateProfile creates a new equipment profile
func (pm *ProfileManager) CreateProfile(profile *EquipmentProfile) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if profile.ID == "" {
		return fmt.Errorf("profile ID is required")
	}

	if _, ok := pm.profiles[profile.ID]; ok {
		return fmt.Errorf("profile already exists: %s", profile.ID)
	}

	pm.profiles[profile.ID] = profile
	return pm.saveProfiles()
}

// UpdateProfile updates an existing profile
func (pm *ProfileManager) UpdateProfile(profile *EquipmentProfile) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if _, ok := pm.profiles[profile.ID]; !ok {
		return fmt.Errorf("profile not found: %s", profile.ID)
	}

	pm.profiles[profile.ID] = profile
	return pm.saveProfiles()
}

// DeleteProfile removes a profile
func (pm *ProfileManager) DeleteProfile(id string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	profile, ok := pm.profiles[id]
	if !ok {
		return fmt.Errorf("profile not found: %s", id)
	}

	if profile.IsDefault {
		return fmt.Errorf("cannot delete default profile")
	}

	delete(pm.profiles, id)

	if pm.activeID == id {
		pm.activeID = ""
	}

	return pm.saveProfiles()
}

// createDefaultProfile creates the default virtual simulation profile
func (pm *ProfileManager) createDefaultProfile() {
	profile := &EquipmentProfile{
		ID:          "default-virtual",
		Name:        "Virtual Observatory",
		Description: "Simulated equipment for learning and practice",
		IsDefault:   true,
		Mode:        "simulation",
		Devices: []DeviceProfile{
			{
				ID:             "virtual-camera",
				Name:           "Virtual Camera",
				DeviceType:     DeviceTypeCamera,
				ConnectionType: ConnectionTypeVirtual,
				ConnectionConfig: map[string]any{
					"sensor_width":  4656,
					"sensor_height": 3520,
					"pixel_size":    3.76,
					"has_cooler":    true,
				},
				Enabled: true,
			},
			{
				ID:             "virtual-mount",
				Name:           "Virtual Mount",
				DeviceType:     DeviceTypeMount,
				ConnectionType: ConnectionTypeVirtual,
				ConnectionConfig: map[string]any{
					"type":         "equatorial",
					"max_slew":     8.0,
					"track_rate":   15.041,
					"park_az":      0,
					"park_alt":     90,
				},
				Enabled: true,
			},
			{
				ID:             "virtual-focuser",
				Name:           "Virtual Focuser",
				DeviceType:     DeviceTypeFocuser,
				ConnectionType: ConnectionTypeVirtual,
				ConnectionConfig: map[string]any{
					"max_position": 10000,
					"step_size":    1.0,
					"temp_comp":    true,
				},
				Enabled: true,
			},
			{
				ID:             "virtual-filterwheel",
				Name:           "Virtual Filter Wheel",
				DeviceType:     DeviceTypeFilterWheel,
				ConnectionType: ConnectionTypeVirtual,
				ConnectionConfig: map[string]any{
					"filters": []string{"L", "R", "G", "B", "Ha", "OIII", "SII"},
				},
				Enabled: true,
			},
		},
	}

	pm.profiles[profile.ID] = profile
	pm.activeID = profile.ID
	pm.saveProfiles()
}

// loadProfiles loads profiles from disk
func (pm *ProfileManager) loadProfiles() {
	if pm.storagePath == "" {
		return
	}

	filepath := filepath.Join(pm.storagePath, "profiles.json")
	data, err := os.ReadFile(filepath)
	if err != nil {
		return // File doesn't exist yet
	}

	var profiles []*EquipmentProfile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return
	}

	for _, p := range profiles {
		pm.profiles[p.ID] = p
		if p.IsDefault {
			pm.activeID = p.ID
		}
	}
}

// saveProfiles saves profiles to disk
func (pm *ProfileManager) saveProfiles() error {
	if pm.storagePath == "" {
		return nil
	}

	// Ensure directory exists
	if err := os.MkdirAll(pm.storagePath, 0755); err != nil {
		return err
	}

	profiles := make([]*EquipmentProfile, 0, len(pm.profiles))
	for _, p := range pm.profiles {
		profiles = append(profiles, p)
	}

	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return err
	}

	filepath := filepath.Join(pm.storagePath, "profiles.json")
	return os.WriteFile(filepath, data, 0644)
}

// ValidateProfile checks if a profile configuration is valid
func ValidateProfile(profile *EquipmentProfile) error {
	if profile.ID == "" {
		return fmt.Errorf("profile ID is required")
	}
	if profile.Name == "" {
		return fmt.Errorf("profile name is required")
	}

	for _, device := range profile.Devices {
		if err := ValidateDeviceProfile(&device); err != nil {
			return fmt.Errorf("invalid device %s: %w", device.ID, err)
		}
	}

	return nil
}

// ValidateDeviceProfile checks if a device profile is valid
func ValidateDeviceProfile(device *DeviceProfile) error {
	if device.ID == "" {
		return fmt.Errorf("device ID is required")
	}
	if device.DeviceType == "" {
		return fmt.Errorf("device type is required")
	}
	if device.ConnectionType == "" {
		return fmt.Errorf("connection type is required")
	}

	switch device.ConnectionType {
	case ConnectionTypeVirtual:
		// No additional validation needed
	case ConnectionTypeINDI:
		if device.ConnectionConfig["server_address"] == nil {
			return fmt.Errorf("INDI server address is required")
		}
		if device.ConnectionConfig["device_name"] == nil {
			return fmt.Errorf("INDI device name is required")
		}
	case ConnectionTypeAlpaca:
		if device.ConnectionConfig["base_url"] == nil {
			return fmt.Errorf("Alpaca base URL is required")
		}
		if device.ConnectionConfig["device_number"] == nil {
			return fmt.Errorf("Alpaca device number is required")
		}
	default:
		return fmt.Errorf("unknown connection type: %s", device.ConnectionType)
	}

	return nil
}
