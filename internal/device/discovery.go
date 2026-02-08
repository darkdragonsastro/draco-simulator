// Package device provides device discovery for INDI and Alpaca
package device

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

// DiscoveredDevice represents a device found during discovery
type DiscoveredDevice struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	DeviceType     DeviceType     `json:"device_type"`
	ConnectionType ConnectionType `json:"connection_type"`
	ServerAddress  string         `json:"server_address"`
	DeviceName     string         `json:"device_name,omitempty"`
	DeviceNumber   int            `json:"device_number,omitempty"`
	Description    string         `json:"description,omitempty"`
	DriverInfo     string         `json:"driver_info,omitempty"`
}

// DiscoveryResult contains results from device discovery
type DiscoveryResult struct {
	Devices   []DiscoveredDevice `json:"devices"`
	Errors    []string           `json:"errors,omitempty"`
	Timestamp time.Time          `json:"timestamp"`
}

// DeviceDiscovery handles device discovery across protocols
type DeviceDiscovery struct {
	timeout time.Duration
}

// NewDeviceDiscovery creates a new discovery service
func NewDeviceDiscovery() *DeviceDiscovery {
	return &DeviceDiscovery{
		timeout: 5 * time.Second,
	}
}

// DiscoverAll discovers devices from all sources
func (d *DeviceDiscovery) DiscoverAll(ctx context.Context) *DiscoveryResult {
	result := &DiscoveryResult{
		Devices:   make([]DiscoveredDevice, 0),
		Errors:    make([]string, 0),
		Timestamp: time.Now(),
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Discover INDI devices
	wg.Add(1)
	go func() {
		defer wg.Done()
		devices, err := d.discoverINDI(ctx)
		mu.Lock()
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("INDI: %v", err))
		} else {
			result.Devices = append(result.Devices, devices...)
		}
		mu.Unlock()
	}()

	// Discover Alpaca devices
	wg.Add(1)
	go func() {
		defer wg.Done()
		devices, err := d.discoverAlpaca(ctx)
		mu.Lock()
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Alpaca: %v", err))
		} else {
			result.Devices = append(result.Devices, devices...)
		}
		mu.Unlock()
	}()

	wg.Wait()
	return result
}

// DiscoverINDI discovers INDI devices at a specific server
func (d *DeviceDiscovery) DiscoverINDI(ctx context.Context, serverAddress string) ([]DiscoveredDevice, error) {
	return d.discoverINDIServer(ctx, serverAddress)
}

// DiscoverAlpaca discovers Alpaca devices at a specific URL
func (d *DeviceDiscovery) DiscoverAlpaca(ctx context.Context, baseURL string) ([]DiscoveredDevice, error) {
	return d.discoverAlpacaServer(ctx, baseURL)
}

// discoverINDI attempts to find INDI servers on common ports
func (d *DeviceDiscovery) discoverINDI(ctx context.Context) ([]DiscoveredDevice, error) {
	// Try common INDI server addresses
	commonAddresses := []string{
		"localhost:7624",
		"127.0.0.1:7624",
	}

	var devices []DiscoveredDevice
	for _, addr := range commonAddresses {
		found, err := d.discoverINDIServer(ctx, addr)
		if err == nil {
			devices = append(devices, found...)
			break // Found a server, stop searching
		}
	}

	return devices, nil
}

// discoverINDIServer connects to an INDI server and lists devices
func (d *DeviceDiscovery) discoverINDIServer(ctx context.Context, serverAddress string) ([]DiscoveredDevice, error) {
	// Try to connect to the INDI server
	dialer := net.Dialer{Timeout: d.timeout}
	conn, err := dialer.DialContext(ctx, "tcp", serverAddress)
	if err != nil {
		return nil, fmt.Errorf("cannot connect to INDI server: %w", err)
	}
	defer conn.Close()

	// Send getProperties to get device list
	_, err = conn.Write([]byte("<getProperties version=\"1.7\"/>\n"))
	if err != nil {
		return nil, fmt.Errorf("failed to send getProperties: %w", err)
	}

	// Read response with timeout
	conn.SetReadDeadline(time.Now().Add(d.timeout))
	buf := make([]byte, 65536)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse device names from response (simplified - real implementation would parse XML)
	// For now, return a placeholder indicating server is available
	_ = buf[:n]

	return []DiscoveredDevice{
		{
			ID:             fmt.Sprintf("indi-%s", serverAddress),
			Name:           "INDI Server",
			ConnectionType: ConnectionTypeINDI,
			ServerAddress:  serverAddress,
			Description:    "INDI server found - use INDI client to enumerate devices",
		},
	}, nil
}

// discoverAlpaca attempts to find Alpaca servers
func (d *DeviceDiscovery) discoverAlpaca(ctx context.Context) ([]DiscoveredDevice, error) {
	// Try Alpaca discovery broadcast
	devices, err := d.alpacaDiscoveryBroadcast(ctx)
	if err == nil && len(devices) > 0 {
		return devices, nil
	}

	// Fall back to common addresses
	commonURLs := []string{
		"http://localhost:11111",
		"http://127.0.0.1:11111",
	}

	for _, url := range commonURLs {
		found, err := d.discoverAlpacaServer(ctx, url)
		if err == nil && len(found) > 0 {
			return found, nil
		}
	}

	return nil, fmt.Errorf("no Alpaca servers found")
}

// alpacaDiscoveryBroadcast uses Alpaca discovery protocol
func (d *DeviceDiscovery) alpacaDiscoveryBroadcast(ctx context.Context) ([]DiscoveredDevice, error) {
	// Alpaca discovery uses UDP broadcast on port 32227
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{Port: 0})
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	// Send discovery request
	broadcastAddr := &net.UDPAddr{IP: net.IPv4(255, 255, 255, 255), Port: 32227}
	_, err = conn.WriteToUDP([]byte("alpacadiscovery1"), broadcastAddr)
	if err != nil {
		return nil, err
	}

	// Wait for responses
	conn.SetReadDeadline(time.Now().Add(d.timeout))
	var devices []DiscoveredDevice

	buf := make([]byte, 1024)
	for {
		n, addr, err := conn.ReadFromUDP(buf)
		if err != nil {
			break // Timeout or error
		}

		// Parse response
		var response struct {
			AlpacaPort int `json:"AlpacaPort"`
		}
		if err := json.Unmarshal(buf[:n], &response); err != nil {
			continue
		}

		baseURL := fmt.Sprintf("http://%s:%d", addr.IP.String(), response.AlpacaPort)
		found, err := d.discoverAlpacaServer(ctx, baseURL)
		if err == nil {
			devices = append(devices, found...)
		}
	}

	return devices, nil
}

// discoverAlpacaServer queries an Alpaca server for devices
func (d *DeviceDiscovery) discoverAlpacaServer(ctx context.Context, baseURL string) ([]DiscoveredDevice, error) {
	client := &http.Client{Timeout: d.timeout}

	// Query management API for configured devices
	url := fmt.Sprintf("%s/management/v1/configureddevices", baseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("server returned %d", resp.StatusCode)
	}

	var response struct {
		Value []struct {
			DeviceName   string `json:"DeviceName"`
			DeviceType   string `json:"DeviceType"`
			DeviceNumber int    `json:"DeviceNumber"`
			UniqueID     string `json:"UniqueID"`
		} `json:"Value"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	devices := make([]DiscoveredDevice, 0, len(response.Value))
	for _, dev := range response.Value {
		deviceType := alpacaTypeToDeviceType(dev.DeviceType)
		if deviceType == "" {
			continue // Unknown device type
		}

		devices = append(devices, DiscoveredDevice{
			ID:             dev.UniqueID,
			Name:           dev.DeviceName,
			DeviceType:     deviceType,
			ConnectionType: ConnectionTypeAlpaca,
			ServerAddress:  baseURL,
			DeviceNumber:   dev.DeviceNumber,
			DriverInfo:     dev.DeviceType,
		})
	}

	return devices, nil
}

// alpacaTypeToDeviceType converts Alpaca device type to our DeviceType
func alpacaTypeToDeviceType(alpacaType string) DeviceType {
	switch alpacaType {
	case "Camera":
		return DeviceTypeCamera
	case "Telescope":
		return DeviceTypeMount
	case "Focuser":
		return DeviceTypeFocuser
	case "FilterWheel":
		return DeviceTypeFilterWheel
	case "Rotator":
		return DeviceTypeRotator
	case "Dome":
		return DeviceTypeDome
	case "ObservingConditions":
		return DeviceTypeWeather
	default:
		return ""
	}
}

// TestConnection tests if a device can be connected
func (d *DeviceDiscovery) TestConnection(ctx context.Context, device *DeviceProfile) error {
	switch device.ConnectionType {
	case ConnectionTypeVirtual:
		return nil // Virtual devices always connect

	case ConnectionTypeINDI:
		addr, ok := device.ConnectionConfig["server_address"].(string)
		if !ok {
			return fmt.Errorf("missing server_address")
		}
		dialer := net.Dialer{Timeout: d.timeout}
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err != nil {
			return fmt.Errorf("cannot connect to INDI server: %w", err)
		}
		conn.Close()
		return nil

	case ConnectionTypeAlpaca:
		baseURL, ok := device.ConnectionConfig["base_url"].(string)
		if !ok {
			return fmt.Errorf("missing base_url")
		}
		client := &http.Client{Timeout: d.timeout}
		url := fmt.Sprintf("%s/management/apiversions", baseURL)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return err
		}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("cannot connect to Alpaca server: %w", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("server returned %d", resp.StatusCode)
		}
		return nil

	default:
		return fmt.Errorf("unknown connection type: %s", device.ConnectionType)
	}
}
