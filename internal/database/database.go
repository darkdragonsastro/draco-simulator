package database

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
)

// ErrNotFound is returned when a key is not found in the database
var ErrNotFound = errors.New("key not found")

// Database interface for persistence
type Database interface {
	GetJSON(ctx context.Context, key string, v any) error
	SetJSON(ctx context.Context, key string, v any) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

// NewInMemoryDB creates a simple in-memory database
func NewInMemoryDB() Database {
	return &inMemoryDB{
		data: make(map[string][]byte),
	}
}

type inMemoryDB struct {
	mu   sync.RWMutex
	data map[string][]byte
}

// GetJSON retrieves a value from the database and unmarshals it into v
func (db *inMemoryDB) GetJSON(ctx context.Context, key string, v any) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	db.mu.RLock()
	defer db.mu.RUnlock()

	data, ok := db.data[key]
	if !ok {
		return ErrNotFound
	}

	return json.Unmarshal(data, v)
}

// SetJSON marshals v and stores it in the database
func (db *inMemoryDB) SetJSON(ctx context.Context, key string, v any) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	data, err := json.Marshal(v)
	if err != nil {
		return err
	}

	db.mu.Lock()
	defer db.mu.Unlock()

	db.data[key] = data
	return nil
}

// Delete removes a key from the database
func (db *inMemoryDB) Delete(ctx context.Context, key string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	db.mu.Lock()
	defer db.mu.Unlock()

	delete(db.data, key)
	return nil
}

// Exists checks if a key exists in the database
func (db *inMemoryDB) Exists(ctx context.Context, key string) (bool, error) {
	select {
	case <-ctx.Done():
		return false, ctx.Err()
	default:
	}

	db.mu.RLock()
	defer db.mu.RUnlock()

	_, ok := db.data[key]
	return ok, nil
}
