# Draco Simulator Makefile

BINARY_NAME=draco-simulator
VERSION?=dev
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS=-ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)"

.PHONY: all build build-backend build-frontend test lint run run-backend run-frontend clean help fmt vet mod install dev

all: build

## build: Build backend and frontend
build: build-backend build-frontend

## build-backend: Build the Go binary
build-backend:
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/server

## build-frontend: Build the React frontend
build-frontend:
	@echo "Building frontend..."
	cd web && npm run build

## test: Run tests
test:
	@echo "Running tests..."
	go test -v -race ./...

## test-coverage: Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

## lint: Run linters
lint:
	@echo "Running Go linter..."
	golangci-lint run --timeout=5m ./...
	@echo "Running frontend linter..."
	cd web && npm run lint

## run: Run the built server
run: build-backend
	./bin/$(BINARY_NAME)

## run-backend: Run backend with go run
run-backend:
	@echo "Starting backend on http://localhost:8080..."
	go run ./cmd/server

## run-frontend: Run frontend dev server
run-frontend:
	@echo "Starting frontend on http://localhost:5173..."
	cd web && npm run dev

## dev: Show development instructions
dev:
	@echo "For development, run these in separate terminals:"
	@echo "  Terminal 1: make run-backend"
	@echo "  Terminal 2: make run-frontend"
	@echo ""
	@echo "Frontend will proxy API requests to backend at localhost:8080"

## install: Install frontend dependencies
install:
	@echo "Installing frontend dependencies..."
	cd web && npm install

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -rf web/dist/
	rm -f coverage.out coverage.html

## fmt: Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

## vet: Run go vet
vet:
	@echo "Running go vet..."
	go vet ./...

## mod: Tidy and verify modules
mod:
	@echo "Tidying modules..."
	go mod tidy
	go mod verify

## typecheck: Type check frontend
typecheck:
	@echo "Type checking frontend..."
	cd web && npx tsc --noEmit

## help: Show this help
help:
	@echo "Draco Simulator - Makefile Commands"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
