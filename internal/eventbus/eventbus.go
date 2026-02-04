package eventbus

import (
	"context"
	"fmt"
	"sync"
)

// Event represents an event
type Event struct {
	Type string
	Data any
}

// SubscriptionID uniquely identifies a subscription
type SubscriptionID string

// EventBus interface for publishing and subscribing to events
type EventBus interface {
	Publish(ctx context.Context, topic string, data any) error
	Subscribe(ctx context.Context, topic string, handler func(Event)) (SubscriptionID, error)
	Unsubscribe(ctx context.Context, id SubscriptionID) error
}

// NewInMemoryBus creates a simple in-memory event bus
func NewInMemoryBus() EventBus {
	return &inMemoryBus{
		handlers: make(map[string][]handler),
	}
}

type handler struct {
	id SubscriptionID
	fn func(Event)
}

type inMemoryBus struct {
	mu       sync.RWMutex
	handlers map[string][]handler
	nextID   int
}

// Publish sends an event to all subscribers of the given topic
func (b *inMemoryBus) Publish(ctx context.Context, topic string, data any) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	b.mu.RLock()
	handlers := make([]handler, len(b.handlers[topic]))
	copy(handlers, b.handlers[topic])
	b.mu.RUnlock()

	event := Event{
		Type: topic,
		Data: data,
	}

	for _, h := range handlers {
		h.fn(event)
	}

	return nil
}

// Subscribe registers a handler for a topic and returns a subscription ID
func (b *inMemoryBus) Subscribe(ctx context.Context, topic string, fn func(Event)) (SubscriptionID, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	b.nextID++
	id := SubscriptionID(fmt.Sprintf("%s-%d", topic, b.nextID))

	b.handlers[topic] = append(b.handlers[topic], handler{
		id: id,
		fn: fn,
	})

	return id, nil
}

// Unsubscribe removes a subscription by ID
func (b *inMemoryBus) Unsubscribe(ctx context.Context, id SubscriptionID) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	for topic, handlers := range b.handlers {
		for i, h := range handlers {
			if h.id == id {
				b.handlers[topic] = append(handlers[:i], handlers[i+1:]...)
				return nil
			}
		}
	}

	return nil
}
