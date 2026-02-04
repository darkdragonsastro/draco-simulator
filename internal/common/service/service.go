package service

import (
	"context"
	"sync"
)

// HealthStatus represents service health
type HealthStatus struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// Service interface
type Service interface {
	Initialize(ctx context.Context) error
	Start(ctx context.Context) error
	Stop(ctx context.Context) error
	Health() HealthStatus
	Name() string
}

// BaseService provides common service functionality
type BaseService struct {
	mu     sync.RWMutex
	name   string
	health HealthStatus
}

// NewBaseService creates a new base service with the given name
func NewBaseService(name string) *BaseService {
	return &BaseService{
		name: name,
		health: HealthStatus{
			Status:  "unknown",
			Message: "service not initialized",
		},
	}
}

// Name returns the service name
func (s *BaseService) Name() string {
	return s.name
}

// Health returns the current health status
func (s *BaseService) Health() HealthStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.health
}

// SetHealthy sets the service health to healthy with a message
func (s *BaseService) SetHealthy(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.health = HealthStatus{
		Status:  "healthy",
		Message: msg,
	}
}

// SetUnhealthy sets the service health to unhealthy with a message
func (s *BaseService) SetUnhealthy(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.health = HealthStatus{
		Status:  "unhealthy",
		Message: msg,
	}
}

// SetDegraded sets the service health to degraded with a message
func (s *BaseService) SetDegraded(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.health = HealthStatus{
		Status:  "degraded",
		Message: msg,
	}
}

// Initialize is a no-op implementation that can be overridden
func (s *BaseService) Initialize(ctx context.Context) error {
	return nil
}

// Start is a no-op implementation that can be overridden
func (s *BaseService) Start(ctx context.Context) error {
	s.SetHealthy("service started")
	return nil
}

// Stop is a no-op implementation that can be overridden
func (s *BaseService) Stop(ctx context.Context) error {
	s.SetUnhealthy("service stopped")
	return nil
}
