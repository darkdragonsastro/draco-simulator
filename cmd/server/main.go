// Package main provides the entry point for the Draco Astrophotography Simulator.
//
// Draco Simulator is a dual-mode application that serves as both an educational
// astrophotography simulator AND a real equipment controller. Users learn through
// gamified simulation, then seamlessly transition to controlling real telescopes.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/darkdragonsastro/draco-simulator/internal/api/rest"
	"github.com/darkdragonsastro/draco-simulator/internal/api/websocket"
	"github.com/darkdragonsastro/draco-simulator/internal/catalog"
	"github.com/darkdragonsastro/draco-simulator/internal/database"
	"github.com/darkdragonsastro/draco-simulator/internal/eventbus"
	"github.com/darkdragonsastro/draco-simulator/internal/game"
)

// Version information (set during build)
var (
	Version   = "dev"
	BuildTime = "unknown"
)

// Config holds server configuration
type Config struct {
	Port            int    `json:"port"`
	Host            string `json:"host"`
	DataDir         string `json:"data_dir"`
	EnableSimulator bool   `json:"enable_simulator"`
	EnableLiveMode  bool   `json:"enable_live_mode"`
	Debug           bool   `json:"debug"`
}

// DefaultConfig returns sensible defaults
func DefaultConfig() Config {
	return Config{
		Port:            8080,
		Host:            "0.0.0.0",
		DataDir:         "./data",
		EnableSimulator: true,
		EnableLiveMode:  false, // Requires real equipment
		Debug:           true,
	}
}

func main() {
	fmt.Printf("Draco Astrophotography Simulator %s (built %s)\n", Version, BuildTime)
	fmt.Println("==========================================")

	config := DefaultConfig()

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle signals for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		log.Printf("Received signal %v, shutting down...", sig)
		cancel()
	}()

	// Initialize and start the server
	if err := run(ctx, config); err != nil {
		log.Fatalf("Server error: %v", err)
	}

	log.Println("Server stopped")
}

func run(ctx context.Context, config Config) error {
	// Initialize infrastructure
	bus := eventbus.NewInMemoryBus()
	db := database.NewInMemoryDB()

	// Initialize game service
	gameService := game.NewService(bus, db)
	if err := gameService.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize game service: %w", err)
	}
	if err := gameService.Start(ctx); err != nil {
		return fmt.Errorf("failed to start game service: %w", err)
	}
	defer gameService.Stop(ctx)

	// Initialize catalogs
	starCatalog := catalog.NewHipparcosCatalog()
	dsoCatalog := catalog.NewDSOCatalog("Messier")

	// Load embedded Messier catalog
	if err := dsoCatalog.Load(ctx); err != nil {
		log.Printf("Warning: failed to load Messier catalog: %v", err)
	}

	log.Printf("Loaded %d DSO objects", dsoCatalog.Count())

	// Initialize WebSocket hub
	wsHub := websocket.NewHub()
	go wsHub.Run(ctx)

	// Initialize REST API server
	restConfig := rest.Config{
		Address: fmt.Sprintf("%s:%d", config.Host, config.Port),
		Debug:   config.Debug,
	}
	server := rest.NewServer(restConfig, gameService, starCatalog, dsoCatalog)

	// Create HTTP server that combines REST + WebSocket
	mux := http.NewServeMux()

	// Mount REST API
	mux.Handle("/", server.Handler())

	// Mount WebSocket endpoint
	mux.HandleFunc("/ws", wsHub.HandleWebSocket)

	httpServer := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", config.Host, config.Port),
		Handler: mux,
	}

	log.Printf("Starting server on %s:%d", config.Host, config.Port)
	log.Printf("Simulator mode: %v", config.EnableSimulator)
	log.Printf("Live mode: %v", config.EnableLiveMode)

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	log.Printf("Server is ready at http://%s:%d", config.Host, config.Port)
	log.Println("")
	log.Println("API Endpoints:")
	log.Println("  GET  /api/v1/health           - Health check")
	log.Println("  GET  /api/v1/game/progress    - Player progress")
	log.Println("  GET  /api/v1/game/challenges  - All challenges")
	log.Println("  GET  /api/v1/game/achievements - All achievements")
	log.Println("  GET  /api/v1/game/store       - Equipment store")
	log.Println("  GET  /api/v1/catalog/dso/messier - Messier catalog")
	log.Println("  GET  /api/v1/catalog/visible  - Currently visible objects")
	log.Println("  GET  /api/v1/sky/conditions   - Sky conditions")
	log.Println("  GET  /api/v1/sky/twilight     - Twilight times")
	log.Println("  GET  /api/v1/sky/moon         - Moon info")
	log.Println("  WS   /ws                      - WebSocket connection")
	log.Println("")

	// Wait for shutdown signal or error
	select {
	case <-ctx.Done():
		log.Println("Shutting down gracefully...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		return httpServer.Shutdown(shutdownCtx)
	case err := <-errChan:
		return err
	}
}
