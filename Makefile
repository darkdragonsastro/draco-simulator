# Draco Simulator Makefile

BINARY_NAME=draco-simulator
VERSION?=dev
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS=-ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)"

.PHONY: all build test lint run clean help

all: build

## build: Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/server

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

## lint: Run linter
lint:
	@echo "Running linter..."
	golangci-lint run --timeout=5m ./...

## run: Run the server
run: build
	./bin/$(BINARY_NAME)

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
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

## help: Show this help
help:
	@echo "Draco Simulator - Makefile Commands"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
