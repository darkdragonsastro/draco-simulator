// DSO Image Extraction Tool - Stellarium Image Overlays
//
// Downloads high-quality astrophotography images from Stellarium's GitHub
// repository along with their plate-solved corner coordinates (worldCoords).
// Generates manifest.json for the frontend to render images as properly
// oriented quads on the celestial sphere.
//
// Usage:
//
//	go run cmd/dso-images-gen/main.go
//
// This generates:
//   - web/public/dso-images/M1.png  (original Stellarium image, power-of-2 size)
//   - web/public/dso-images/M1-thumb.jpg (128px thumbnail)
//   - web/public/dso-images/manifest.json (corner coords, LOD, credits)
//
// Image source: Stellarium project (https://github.com/Stellarium/stellarium)
// License: Various CC licenses per photographer (credits preserved in manifest)
package main

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	texturesJSONURL = "https://raw.githubusercontent.com/Stellarium/stellarium/master/nebulae/default/textures.json"
	imageBaseURL    = "https://raw.githubusercontent.com/Stellarium/stellarium/master/nebulae/default/"
	thumbSize       = 128
)

// stellariumEntry represents one entry from Stellarium's textures.json
type stellariumEntry struct {
	ImageURL     string          `json:"imageUrl"`
	WorldCoords  [][][2]float64 `json:"worldCoords"`
	MinResolution float64        `json:"minResolution"`
	MaxBrightness float64        `json:"maxBrightness"`
	ImageCredits  json.RawMessage `json:"imageCredits"`
}

// manifestEntry is what we write to manifest.json for the frontend
type manifestEntry struct {
	ImageURL      string        `json:"imageUrl"`
	ThumbURL      string        `json:"thumbUrl"`
	Corners       cornerSet     `json:"corners"`
	MinResolution float64       `json:"minResolution"`
	MaxBrightness float64       `json:"maxBrightness"`
	Credit        string        `json:"credit"`
}

type cornerSet struct {
	BottomLeft  raDec `json:"bottomLeft"`
	BottomRight raDec `json:"bottomRight"`
	TopRight    raDec `json:"topRight"`
	TopLeft     raDec `json:"topLeft"`
}

type raDec struct {
	RA  float64 `json:"ra"`
	Dec float64 `json:"dec"`
}

// Map of Stellarium imageUrl filenames to Messier IDs
// Some have special naming like "m1dumont.png", "m15-vasey.png", "pleiades.png"
var imageToMessier = map[string]string{
	"m1dumont.png":  "M1",
	"m2.png":        "M2",
	"m3.png":        "M3",
	"m4.png":        "M4",
	"m5.png":        "M5",
	"m6.png":        "M6",
	"m7.png":        "M7",
	"m8.png":        "M8",
	"m9.png":        "M9",
	"m10.png":       "M10",
	"m11.png":       "M11",
	"m12.png":       "M12",
	"m13.png":       "M13",
	"m14.png":       "M14",
	"m15-vasey.png": "M15",
	"m16.png":       "M16",
	"m17.png":       "M17",
	"m18.png":       "M18",
	"m19.png":       "M19",
	"m20.png":       "M20",
	"m21-trev.png":  "M21",
	"m22.png":       "M22",
	"m23.png":       "M23",
	"m24-vasey.png": "M24",
	"m25.png":       "M25",
	"m26.png":       "M26",
	"m27dumont.png": "M27",
	"m28.png":       "M28",
	"m29.png":       "M29",
	"m30.png":       "M30",
	"m31.png":       "M31",
	"m33.png":       "M33",
	"m34.png":       "M34",
	"m35.png":       "M35",
	"m36.png":       "M36",
	"m37.png":       "M37",
	"m38.png":       "M38",
	"m39-dss.png":   "M39",
	"m41.png":       "M41",
	"m42.png":       "M42",
	"m44.png":       "M44",
	"pleiades.png":  "M45",
	"m46.png":       "M46",
	"m47-trev.png":  "M47",
	"m48.png":       "M48",
	"m49.png":       "M49",
	"m50.png":       "M50",
	"m51-vasey.png": "M51",
	"m52.png":       "M52",
	"m53.png":       "M53",
	"m54.png":       "M54",
	"m55.png":       "M55",
	"m56.png":       "M56",
	"m57dumont.png": "M57",
	"m58-vasey.png": "M58",
	"m59.png":       "M59",
	"m60.png":       "M60",
	"m61.png":       "M61",
	"m62.png":       "M62",
	"m63-vasey.png": "M63",
	"m64.png":       "M64",
	"m65.png":       "M65",
	"m66.png":       "M66",
	"m67.png":       "M67",
	"m68.png":       "M68",
	"m69.png":       "M69",
	"m70.png":       "M70",
	"m71.png":       "M71",
	"m72.png":       "M72",
	"m73.png":       "M73",
	"m74.png":       "M74",
	"m75.png":       "M75",
	"m76-vasey.png": "M76",
	"m77.png":       "M77",
	"m78.png":       "M78",
	"m79.png":       "M79",
	"m80.png":       "M80",
	"m81.png":       "M81",
	"m82-vasey.png": "M82",
	"m83.png":       "M83",
	"m85.png":       "M85",
	"m88.png":       "M88",
	"m89.png":       "M89",
	"m90.png":       "M90",
	"m91.png":       "M91",
	"m92.png":       "M92",
	"m93.png":       "M93",
	"m94.png":       "M94",
	"m95.png":       "M95",
	"m96-vasey.png": "M96",
	"m97dumont.png": "M97",
	"m98.png":       "M98",
	"m99.png":       "M99",
	"m100.png":      "M100",
	"m101-vasey.png":"M101",
	"m102.png":      "M102",
	"m103.png":      "M103",
	"m104.png":      "M104",
	"m105-vasey.png":"M105",
	"m106-vasey.png":"M106",
	"m107.png":      "M107",
	"m108.png":      "M108",
	"m109.png":      "M109",
}

func main() {
	outDir := filepath.Join("web", "public", "dso-images")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create output directory: %v\n", err)
		os.Exit(1)
	}

	client := &http.Client{Timeout: 60 * time.Second}

	// Step 1: Fetch textures.json
	fmt.Println("Fetching Stellarium textures.json...")
	resp, err := client.Get(texturesJSONURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to fetch textures.json: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "textures.json HTTP %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read textures.json: %v\n", err)
		os.Exit(1)
	}

	// Stellarium's textures.json contains literal tabs and other control chars
	// in some string fields which Go's JSON parser rejects. Sanitize them.
	bodyStr := string(body)
	bodyStr = strings.ReplaceAll(bodyStr, "\t", " ")
	body = []byte(bodyStr)

	var texturesFile struct {
		SubTiles []stellariumEntry `json:"subTiles"`
	}
	if err := json.Unmarshal(body, &texturesFile); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse textures.json: %v\n", err)
		os.Exit(1)
	}
	entries := texturesFile.SubTiles

	fmt.Printf("Parsed %d entries from textures.json\n", len(entries))

	// Step 2: Process each entry, filter to Messier objects
	manifest := make(map[string]manifestEntry)
	downloaded := 0
	skipped := 0

	for _, entry := range entries {
		messierID, ok := imageToMessier[entry.ImageURL]
		if !ok {
			continue // Not a Messier object we're interested in
		}

		// Parse credits
		credit := parseCredit(entry.ImageCredits)

		// Parse corners from worldCoords
		if len(entry.WorldCoords) == 0 || len(entry.WorldCoords[0]) < 4 {
			fmt.Printf("  %s: Invalid worldCoords, skipping\n", messierID)
			skipped++
			continue
		}

		corners := entry.WorldCoords[0]
		cs := cornerSet{
			BottomLeft:  raDec{RA: corners[0][0], Dec: corners[0][1]},
			BottomRight: raDec{RA: corners[1][0], Dec: corners[1][1]},
			TopRight:    raDec{RA: corners[2][0], Dec: corners[2][1]},
			TopLeft:     raDec{RA: corners[3][0], Dec: corners[3][1]},
		}

		// Download the PNG image
		imgURL := imageBaseURL + entry.ImageURL
		fmt.Printf("Downloading %s (%s)...\n", messierID, entry.ImageURL)

		img, err := downloadPNG(client, imgURL)
		if err != nil {
			fmt.Printf("  Failed to download %s: %v, skipping\n", messierID, err)
			skipped++
			continue
		}

		bounds := img.Bounds()
		fmt.Printf("  Downloaded %dx%d image\n", bounds.Dx(), bounds.Dy())

		// Save the full-size PNG (keep original power-of-2 dimensions)
		pngPath := filepath.Join(outDir, messierID+".png")
		if err := saveAsPNG(img, pngPath); err != nil {
			fmt.Fprintf(os.Stderr, "  Failed to save PNG for %s: %v\n", messierID, err)
			continue
		}

		// Generate and save 128px thumbnail
		thumb := resizeImage(img, thumbSize, thumbSize)
		thumbPath := filepath.Join(outDir, messierID+"-thumb.jpg")
		if err := saveAsJPEG(thumb, thumbPath); err != nil {
			fmt.Fprintf(os.Stderr, "  Failed to save thumbnail for %s: %v\n", messierID, err)
			continue
		}

		manifest[messierID] = manifestEntry{
			ImageURL:      "/dso-images/" + messierID + ".png",
			ThumbURL:      "/dso-images/" + messierID + "-thumb.jpg",
			Corners:       cs,
			MinResolution: entry.MinResolution,
			MaxBrightness: entry.MaxBrightness,
			Credit:        credit,
		}

		downloaded++
		fmt.Printf("  Saved %s.png and %s-thumb.jpg\n", messierID, messierID)

		// Rate limit to be polite to GitHub
		time.Sleep(300 * time.Millisecond)
	}

	// Step 3: Write manifest.json
	manifestJSON, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal manifest: %v\n", err)
		os.Exit(1)
	}

	manifestPath := filepath.Join(outDir, "manifest.json")
	if err := os.WriteFile(manifestPath, manifestJSON, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write manifest.json: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nDone! Generated files in %s\n", outDir)
	fmt.Printf("Downloaded: %d images, Skipped: %d\n", downloaded, skipped)
	fmt.Printf("Manifest: %s (%d entries)\n", manifestPath, len(manifest))
}

func parseCredit(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}

	// Try to parse as an object with "short" field (case-insensitive check)
	var creditObj map[string]interface{}
	if err := json.Unmarshal(raw, &creditObj); err != nil {
		return ""
	}

	// Check both "short" and "Short" (Stellarium has inconsistent casing)
	if v, ok := creditObj["short"]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	if v, ok := creditObj["Short"]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}

	return ""
}

func downloadPNG(client *http.Client, url string) (image.Image, error) {
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// Limit to 50MB (some Stellarium images are large)
	body := io.LimitReader(resp.Body, 50*1024*1024)

	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "png") {
		return png.Decode(body)
	}
	// GitHub raw returns application/octet-stream sometimes
	return png.Decode(body)
}

func saveAsPNG(img image.Image, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return png.Encode(f, img)
}

func saveAsJPEG(img image.Image, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return jpeg.Encode(f, img, &jpeg.Options{Quality: 85})
}

// resizeImage resizes an image to the target dimensions using bilinear interpolation.
func resizeImage(src image.Image, width, height int) image.Image {
	srcBounds := src.Bounds()
	srcW := srcBounds.Dx()
	srcH := srcBounds.Dy()

	if srcW == width && srcH == height {
		return src
	}

	dst := image.NewRGBA(image.Rect(0, 0, width, height))

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := float64(x) * float64(srcW) / float64(width)
			srcY := float64(y) * float64(srcH) / float64(height)

			x0 := int(srcX)
			y0 := int(srcY)
			x1 := x0 + 1
			y1 := y0 + 1

			if x1 >= srcW {
				x1 = srcW - 1
			}
			if y1 >= srcH {
				y1 = srcH - 1
			}

			fx := srcX - float64(x0)
			fy := srcY - float64(y0)

			r00, g00, b00, a00 := src.At(srcBounds.Min.X+x0, srcBounds.Min.Y+y0).RGBA()
			r10, g10, b10, a10 := src.At(srcBounds.Min.X+x1, srcBounds.Min.Y+y0).RGBA()
			r01, g01, b01, a01 := src.At(srcBounds.Min.X+x0, srcBounds.Min.Y+y1).RGBA()
			r11, g11, b11, a11 := src.At(srcBounds.Min.X+x1, srcBounds.Min.Y+y1).RGBA()

			r := bilinear(r00, r10, r01, r11, fx, fy)
			g := bilinear(g00, g10, g01, g11, fx, fy)
			b := bilinear(b00, b10, b01, b11, fx, fy)
			a := bilinear(a00, a10, a01, a11, fx, fy)

			dst.SetRGBA(x, y, color.RGBA{
				R: uint8(r >> 8),
				G: uint8(g >> 8),
				B: uint8(b >> 8),
				A: uint8(a >> 8),
			})
		}
	}

	return dst
}

func bilinear(v00, v10, v01, v11 uint32, fx, fy float64) uint32 {
	top := float64(v00)*(1-fx) + float64(v10)*fx
	bot := float64(v01)*(1-fx) + float64(v11)*fx
	return uint32(top*(1-fy) + bot*fy)
}
