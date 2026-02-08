package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Message represents a WebSocket message
type Message struct {
	Type      string    `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Data      any       `json:"data,omitempty"`
}

// Client represents a WebSocket client connection
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	id   string
}

// Hub manages WebSocket connections
type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	nextID     int
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			// Close all clients
			h.mu.Lock()
			for client := range h.clients {
				close(client.send)
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected: %s", client.id)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("WebSocket client disconnected: %s", client.id)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client buffer full, skip
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a message to all connected clients
func (h *Hub) Broadcast(msgType string, data any) {
	msg := Message{
		Type:      msgType,
		Timestamp: time.Now().UTC(),
		Data:      data,
	}

	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal WebSocket message: %v", err)
		return
	}

	select {
	case h.broadcast <- bytes:
	default:
		log.Println("Broadcast channel full, dropping message")
	}
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// HandleWebSocket handles WebSocket upgrade requests
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	h.mu.Lock()
	h.nextID++
	clientID := string(rune('A'+h.nextID%26)) + "-" + time.Now().Format("150405")
	h.mu.Unlock()

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
		id:   clientID,
	}

	h.register <- client

	// Send welcome message
	welcome := Message{
		Type:      "connection.established",
		Timestamp: time.Now().UTC(),
		Data: map[string]any{
			"client_id": clientID,
			"message":   "Connected to Draco Simulator",
		},
	}
	if bytes, err := json.Marshal(welcome); err == nil {
		client.send <- bytes
	}

	go client.writePump()
	go client.readPump()
}

// readPump reads messages from the client
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse incoming message
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Failed to parse WebSocket message: %v", err)
			continue
		}

		// Handle client messages
		c.handleMessage(msg)
	}
}

// writePump writes messages to the client
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Batch pending messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming client messages
func (c *Client) handleMessage(msg Message) {
	switch msg.Type {
	case "ping":
		// Respond with pong
		response := Message{
			Type:      "pong",
			Timestamp: time.Now().UTC(),
		}
		if bytes, err := json.Marshal(response); err == nil {
			c.send <- bytes
		}

	case "subscribe":
		// Handle subscription to specific events
		log.Printf("Client %s subscribed to: %v", c.id, msg.Data)

	default:
		log.Printf("Unknown message type from %s: %s", c.id, msg.Type)
	}
}

// Event types for broadcasting
const (
	EventGameAchievementUnlocked = "game.achievement.unlocked"
	EventGameLevelUp             = "game.level.up"
	EventGameCurrencyEarned      = "game.currency.earned"
	EventGameChallengeCompleted  = "game.challenge.completed"
	EventGameImageScored         = "game.image.scored"

	EventSkyConditionsChanged = "sky.conditions.changed"
	EventSkyTargetRising      = "sky.target.rising"
	EventSkyTwilightStarted   = "sky.twilight.started"

	EventDeviceConnected    = "device.connected"
	EventDeviceDisconnected = "device.disconnected"
	EventDevicePropertyChanged = "device.property.changed"

	EventCaptureStarted   = "capture.started"
	EventCaptureCompleted = "capture.completed"
	EventCaptureFailed    = "capture.failed"

	EventFocusStarted   = "focus.started"
	EventFocusCompleted = "focus.completed"
	EventFocusStep      = "focus.step"

	EventGuideStarted = "guide.started"
	EventGuideStopped = "guide.stopped"
	EventGuideCorrection = "guide.correction"

	EventMountPosition        = "mount.position"
	EventMountSlewStarted     = "mount.slew.started"
	EventMountSlewCompleted   = "mount.slew.completed"
	EventMountTrackingChanged = "mount.tracking.changed"
)
