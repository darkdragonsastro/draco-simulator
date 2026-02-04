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
}

// DefaultConfig returns sensible defaults
func DefaultConfig() Config {
	return Config{
		Port:            8080,
		Host:            "localhost",
		DataDir:         "./data",
		EnableSimulator: true,
		EnableLiveMode:  false, // Requires real equipment
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
	// TODO: Initialize services
	// - EventBus
	// - Database
	// - Game Service
	// - Catalog Service
	// - Virtual Device Service (simulator mode)
	// - Real Device Service (live mode via INDI/ASCOM)

	log.Printf("Starting server on %s:%d", config.Host, config.Port)
	log.Printf("Simulator mode: %v", config.EnableSimulator)
	log.Printf("Live mode: %v", config.EnableLiveMode)

	// Simple health check endpoint for now
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy","version":"` + Version + `"}`))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>Draco Simulator</title></head>
<body>
<h1>Draco Astrophotography Simulator</h1>
<p>Welcome to Draco - learn astrophotography through simulation, then graduate to real equipment.</p>
<h2>API Endpoints</h2>
<ul>
<li><a href="/health">/health</a> - Health check</li>
<li>/api/v1/game/* - Game progression (coming soon)</li>
<li>/api/v1/catalog/* - Star and DSO catalogs (coming soon)</li>
<li>/api/v1/sky/* - Sky simulation (coming soon)</li>
</ul>
</body>
</html>`))
	})

	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", config.Host, config.Port),
		Handler: mux,
	}

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	log.Printf("Server is ready at http://%s:%d", config.Host, config.Port)

	// Wait for shutdown signal or error
	select {
	case <-ctx.Done():
		log.Println("Shutting down gracefully...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		return server.Shutdown(shutdownCtx)
	case err := <-errChan:
		return err
	}
}
