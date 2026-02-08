package rest

import (
	"net/http"

	"github.com/darkdragonsastro/draco-simulator/internal/mount"
	"github.com/gin-gonic/gin"
)

// MountHandlers provides REST endpoints for mount control.
type MountHandlers struct {
	sim *mount.Simulator
}

// NewMountHandlers creates a new MountHandlers.
func NewMountHandlers(sim *mount.Simulator) *MountHandlers {
	return &MountHandlers{sim: sim}
}

func (h *MountHandlers) getStatus(c *gin.Context) {
	c.JSON(http.StatusOK, h.sim.GetStatus())
}

func (h *MountHandlers) slewTo(c *gin.Context) {
	var req struct {
		RA  float64 `json:"ra"`
		Dec float64 `json:"dec"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.sim.SlewTo(c.Request.Context(), req.RA, req.Dec); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "slewing"})
}

func (h *MountHandlers) stopSlew(c *gin.Context) {
	h.sim.StopSlew()
	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

func (h *MountHandlers) setTracking(c *gin.Context) {
	var req struct {
		Mode string `json:"mode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.Mode {
	case "off", "sidereal", "lunar", "solar":
		// valid
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tracking mode"})
		return
	}

	h.sim.SetTracking(req.Mode)
	c.JSON(http.StatusOK, gin.H{"status": "tracking", "mode": req.Mode})
}

func (h *MountHandlers) jog(c *gin.Context) {
	var req struct {
		Direction string  `json:"direction"`
		Rate      float64 `json:"rate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.Direction {
	case "north", "south", "east", "west":
		// valid
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid direction"})
		return
	}

	h.sim.Jog(req.Direction, req.Rate)
	c.JSON(http.StatusOK, gin.H{"status": "jogged"})
}

func (h *MountHandlers) park(c *gin.Context) {
	h.sim.Park()
	c.JSON(http.StatusOK, gin.H{"status": "parked"})
}

func (h *MountHandlers) unpark(c *gin.Context) {
	h.sim.Unpark()
	c.JSON(http.StatusOK, gin.H{"status": "unparked"})
}

func (h *MountHandlers) connect(c *gin.Context) {
	h.sim.Connect()
	c.JSON(http.StatusOK, gin.H{"status": "connected"})
}

func (h *MountHandlers) disconnect(c *gin.Context) {
	h.sim.Disconnect()
	c.JSON(http.StatusOK, gin.H{"status": "disconnected"})
}
