// catalog-gen downloads the Hipparcos catalog from CDS Strasbourg,
// parses the ASCII format, and exports a compressed binary file
// for embedding into the draco-simulator binary.
//
// Usage:
//
//	go run cmd/catalog-gen/main.go
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/darkdragonsastro/draco-simulator/internal/catalog"
)

const (
	hipparcosURL = "https://cdsarc.cds.unistra.fr/ftp/cats/I/239/hip_main.dat"
	outputDir    = "internal/catalog/data"
	outputFile   = "hipparcos.bin.gz"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx := context.Background()

	// Create output directory if it doesn't exist.
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}

	// Download the Hipparcos catalog.
	datPath, err := downloadCatalog()
	if err != nil {
		return fmt.Errorf("download catalog: %w", err)
	}
	defer os.Remove(datPath) // clean up the temporary file

	// Parse the ASCII catalog using the catalog package.
	fmt.Println("Parsing Hipparcos catalog...")
	hip := catalog.NewHipparcosCatalog()
	if err := hip.LoadFromFile(ctx, datPath); err != nil {
		return fmt.Errorf("parse catalog: %w", err)
	}
	fmt.Printf("Loaded %d stars from ASCII catalog\n", hip.Count())

	// Export to compressed binary format.
	outPath := filepath.Join(outputDir, outputFile)
	fmt.Printf("Exporting binary catalog to %s...\n", outPath)
	if err := exportBinary(hip, outPath); err != nil {
		return fmt.Errorf("export binary: %w", err)
	}

	// Print final statistics.
	info, err := os.Stat(outPath)
	if err != nil {
		return fmt.Errorf("stat output file: %w", err)
	}
	fmt.Println("--- Catalog Generation Complete ---")
	fmt.Printf("Stars:       %d\n", hip.Count())
	fmt.Printf("Output file: %s\n", outPath)
	fmt.Printf("File size:   %.2f MB\n", float64(info.Size())/(1024*1024))

	return nil
}

// downloadCatalog fetches hip_main.dat from CDS Strasbourg and writes it to
// a temporary file. It returns the path to the temporary file.
func downloadCatalog() (string, error) {
	fmt.Printf("Downloading %s...\n", hipparcosURL)

	client := &http.Client{
		Timeout: 5 * time.Minute,
	}
	resp, err := client.Get(hipparcosURL)
	if err != nil {
		return "", fmt.Errorf("HTTP GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status: %s", resp.Status)
	}

	fmt.Printf("Download started (content-length: %d bytes)\n", resp.ContentLength)

	// Write data to a temporary file.
	tmpFile, err := os.CreateTemp("", "hip_main_*.dat")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}

	written, err := io.Copy(tmpFile, resp.Body)
	if err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("download: %w", err)
	}
	tmpFile.Close()

	fmt.Printf("Downloaded %d bytes to %s\n", written, tmpFile.Name())
	return tmpFile.Name(), nil
}

// exportBinary writes the catalog in compressed binary format to the given path.
func exportBinary(hip *catalog.HipparcosCatalog, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	if err := hip.ExportBinary(f); err != nil {
		return fmt.Errorf("write binary: %w", err)
	}

	return nil
}
