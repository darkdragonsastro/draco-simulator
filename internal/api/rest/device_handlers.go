package rest

import (
	"net/http"

	"github.com/darkdragonsastro/draco-simulator/internal/device"
	"github.com/gin-gonic/gin"
)

// DeviceHandlers contains handlers for device management
type DeviceHandlers struct {
	profileManager *device.ProfileManager
	discovery      *device.DeviceDiscovery
}

// NewDeviceHandlers creates new device handlers
func NewDeviceHandlers(profileManager *device.ProfileManager) *DeviceHandlers {
	return &DeviceHandlers{
		profileManager: profileManager,
		discovery:      device.NewDeviceDiscovery(),
	}
}

// --- Profile Handlers ---

func (h *DeviceHandlers) listProfiles(c *gin.Context) {
	profiles := h.profileManager.ListProfiles()
	c.JSON(http.StatusOK, gin.H{
		"profiles": profiles,
	})
}

func (h *DeviceHandlers) getActiveProfile(c *gin.Context) {
	profile, err := h.profileManager.GetActiveProfile()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *DeviceHandlers) setActiveProfile(c *gin.Context) {
	id := c.Param("id")
	if err := h.profileManager.SetActiveProfile(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	profile, _ := h.profileManager.GetActiveProfile()
	c.JSON(http.StatusOK, profile)
}

func (h *DeviceHandlers) getProfile(c *gin.Context) {
	id := c.Param("id")
	profile, err := h.profileManager.GetProfile(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *DeviceHandlers) createProfile(c *gin.Context) {
	var profile device.EquipmentProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := device.ValidateProfile(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.profileManager.CreateProfile(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, profile)
}

func (h *DeviceHandlers) updateProfile(c *gin.Context) {
	id := c.Param("id")

	var profile device.EquipmentProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile.ID = id

	if err := device.ValidateProfile(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.profileManager.UpdateProfile(&profile); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *DeviceHandlers) deleteProfile(c *gin.Context) {
	id := c.Param("id")
	if err := h.profileManager.DeleteProfile(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": id})
}

// --- Discovery Handlers ---

func (h *DeviceHandlers) discoverDevices(c *gin.Context) {
	result := h.discovery.DiscoverAll(c.Request.Context())
	c.JSON(http.StatusOK, result)
}

// DiscoverINDIRequest contains INDI discovery parameters
type DiscoverINDIRequest struct {
	ServerAddress string `json:"server_address"`
}

func (h *DeviceHandlers) discoverINDI(c *gin.Context) {
	var req DiscoverINDIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ServerAddress == "" {
		req.ServerAddress = "localhost:7624"
	}

	devices, err := h.discovery.DiscoverINDI(c.Request.Context(), req.ServerAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": devices,
		"server":  req.ServerAddress,
	})
}

// DiscoverAlpacaRequest contains Alpaca discovery parameters
type DiscoverAlpacaRequest struct {
	BaseURL string `json:"base_url"`
}

func (h *DeviceHandlers) discoverAlpaca(c *gin.Context) {
	var req DiscoverAlpacaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.BaseURL == "" {
		req.BaseURL = "http://localhost:11111"
	}

	devices, err := h.discovery.DiscoverAlpaca(c.Request.Context(), req.BaseURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": devices,
		"server":  req.BaseURL,
	})
}

// TestConnectionRequest contains connection test parameters
type TestConnectionRequest struct {
	DeviceProfile device.DeviceProfile `json:"device"`
}

func (h *DeviceHandlers) testConnection(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.discovery.TestConnection(c.Request.Context(), &req.DeviceProfile)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}

// GetMode returns the current operating mode
func (h *DeviceHandlers) getMode(c *gin.Context) {
	profile, err := h.profileManager.GetActiveProfile()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"mode":    "simulation",
			"profile": nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"mode":    profile.Mode,
		"profile": profile,
	})
}
