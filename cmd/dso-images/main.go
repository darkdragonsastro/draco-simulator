// DSO Image Download and Resize Tool
//
// This CLI tool downloads real astronomical images for Messier catalog objects
// from the CDS Aladin HiPS2FITS service (DSS2 color survey) and resizes them
// for use in the Draco Simulator.
//
// Usage:
//
//	go run cmd/dso-images/main.go
//
// This generates:
//   - web/public/dso-images/M1.jpg  (256x256 sprite)
//   - web/public/dso-images/M1-thumb.jpg (128x128 thumbnail)
//   - ... for all 110 Messier objects
//
// Image source:
//   - CDS Aladin HiPS2FITS service using DSS2/color survey (full-sky coverage)
//   - Digitized Sky Survey data: STScI/Caltech/UKST
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"math"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// messierObject holds the data needed to download a sky survey image.
type messierObject struct {
	RA        float64 // Right ascension in degrees
	Dec       float64 // Declination in degrees
	MajorAxis float64 // Angular size in arcminutes
	Type      string  // Object type for fallback placeholder
}

// messierCatalog contains coordinates and sizes for all 110 Messier objects.
var messierCatalog = map[string]messierObject{
	"M1":   {RA: 83.6333, Dec: 22.0167, MajorAxis: 6, Type: "nebula"},
	"M2":   {RA: 323.3625, Dec: -0.8233, MajorAxis: 16, Type: "globular_cluster"},
	"M3":   {RA: 205.5483, Dec: 28.3772, MajorAxis: 18, Type: "globular_cluster"},
	"M4":   {RA: 245.8967, Dec: -26.5256, MajorAxis: 36, Type: "globular_cluster"},
	"M5":   {RA: 229.6383, Dec: 2.0811, MajorAxis: 23, Type: "globular_cluster"},
	"M6":   {RA: 265.0833, Dec: -32.2167, MajorAxis: 25, Type: "open_cluster"},
	"M7":   {RA: 268.4667, Dec: -34.7933, MajorAxis: 80, Type: "open_cluster"},
	"M8":   {RA: 270.9208, Dec: -24.3833, MajorAxis: 90, Type: "nebula"},
	"M9":   {RA: 259.7983, Dec: -18.5161, MajorAxis: 12, Type: "globular_cluster"},
	"M10":  {RA: 254.2875, Dec: -4.1003, MajorAxis: 20, Type: "globular_cluster"},
	"M11":  {RA: 282.7667, Dec: -6.2667, MajorAxis: 14, Type: "open_cluster"},
	"M12":  {RA: 251.8092, Dec: -1.9483, MajorAxis: 16, Type: "globular_cluster"},
	"M13":  {RA: 250.4217, Dec: 36.4614, MajorAxis: 20, Type: "globular_cluster"},
	"M14":  {RA: 264.4008, Dec: -3.2458, MajorAxis: 11, Type: "globular_cluster"},
	"M15":  {RA: 322.4930, Dec: 12.1670, MajorAxis: 18, Type: "globular_cluster"},
	"M16":  {RA: 274.7000, Dec: -13.7833, MajorAxis: 35, Type: "cluster_nebula"},
	"M17":  {RA: 275.1958, Dec: -16.1731, MajorAxis: 46, Type: "nebula"},
	"M18":  {RA: 274.2917, Dec: -17.1167, MajorAxis: 9, Type: "open_cluster"},
	"M19":  {RA: 255.6567, Dec: -26.2681, MajorAxis: 17, Type: "globular_cluster"},
	"M20":  {RA: 270.6208, Dec: -23.0300, MajorAxis: 28, Type: "nebula"},
	"M21":  {RA: 270.9792, Dec: -22.4917, MajorAxis: 13, Type: "open_cluster"},
	"M22":  {RA: 279.0983, Dec: -23.9047, MajorAxis: 32, Type: "globular_cluster"},
	"M23":  {RA: 269.2667, Dec: -19.0167, MajorAxis: 27, Type: "open_cluster"},
	"M24":  {RA: 274.5375, Dec: -18.5167, MajorAxis: 90, Type: "open_cluster"},
	"M25":  {RA: 277.8542, Dec: -19.1167, MajorAxis: 32, Type: "open_cluster"},
	"M26":  {RA: 281.3208, Dec: -9.3833, MajorAxis: 15, Type: "open_cluster"},
	"M27":  {RA: 299.9017, Dec: 22.7211, MajorAxis: 8.0, Type: "planetary_nebula"},
	"M28":  {RA: 276.1367, Dec: -24.8703, MajorAxis: 11, Type: "globular_cluster"},
	"M29":  {RA: 305.9667, Dec: 38.5167, MajorAxis: 7, Type: "open_cluster"},
	"M30":  {RA: 325.0917, Dec: -23.1797, MajorAxis: 12, Type: "globular_cluster"},
	"M31":  {RA: 10.6833, Dec: 41.2692, MajorAxis: 190, Type: "galaxy"},
	"M32":  {RA: 10.6742, Dec: 40.8653, MajorAxis: 9, Type: "galaxy"},
	"M33":  {RA: 23.4625, Dec: 30.6600, MajorAxis: 73, Type: "galaxy"},
	"M34":  {RA: 40.5167, Dec: 42.7833, MajorAxis: 35, Type: "open_cluster"},
	"M35":  {RA: 92.2500, Dec: 24.3333, MajorAxis: 28, Type: "open_cluster"},
	"M36":  {RA: 84.0833, Dec: 34.1333, MajorAxis: 12, Type: "open_cluster"},
	"M37":  {RA: 88.0708, Dec: 32.5500, MajorAxis: 24, Type: "open_cluster"},
	"M38":  {RA: 82.1667, Dec: 35.8333, MajorAxis: 21, Type: "open_cluster"},
	"M39":  {RA: 322.3167, Dec: 48.4333, MajorAxis: 32, Type: "open_cluster"},
	"M40":  {RA: 185.5500, Dec: 58.0833, MajorAxis: 0.8, Type: "star"},
	"M41":  {RA: 101.5042, Dec: -20.7572, MajorAxis: 38, Type: "open_cluster"},
	"M42":  {RA: 83.8208, Dec: -5.3911, MajorAxis: 85, Type: "nebula"},
	"M43":  {RA: 83.8917, Dec: -5.2667, MajorAxis: 20, Type: "nebula"},
	"M44":  {RA: 130.0250, Dec: 19.6683, MajorAxis: 95, Type: "open_cluster"},
	"M45":  {RA: 56.8708, Dec: 24.1167, MajorAxis: 110, Type: "open_cluster"},
	"M46":  {RA: 115.4375, Dec: -14.8167, MajorAxis: 27, Type: "open_cluster"},
	"M47":  {RA: 114.1500, Dec: -14.4833, MajorAxis: 30, Type: "open_cluster"},
	"M48":  {RA: 123.4250, Dec: -5.8000, MajorAxis: 54, Type: "open_cluster"},
	"M49":  {RA: 187.4442, Dec: 8.0003, MajorAxis: 10, Type: "galaxy"},
	"M50":  {RA: 105.6917, Dec: -8.3500, MajorAxis: 16, Type: "open_cluster"},
	"M51":  {RA: 202.4696, Dec: 47.1953, MajorAxis: 11, Type: "galaxy"},
	"M52":  {RA: 351.2042, Dec: 61.5833, MajorAxis: 13, Type: "open_cluster"},
	"M53":  {RA: 198.2292, Dec: 18.1681, MajorAxis: 13, Type: "globular_cluster"},
	"M54":  {RA: 283.7633, Dec: -30.4783, MajorAxis: 12, Type: "globular_cluster"},
	"M55":  {RA: 294.9983, Dec: -30.9647, MajorAxis: 19, Type: "globular_cluster"},
	"M56":  {RA: 289.1483, Dec: 30.1842, MajorAxis: 9, Type: "globular_cluster"},
	"M57":  {RA: 283.3958, Dec: 33.0286, MajorAxis: 1.4, Type: "planetary_nebula"},
	"M58":  {RA: 189.4313, Dec: 11.8183, MajorAxis: 6, Type: "galaxy"},
	"M59":  {RA: 190.5092, Dec: 11.6472, MajorAxis: 5, Type: "galaxy"},
	"M60":  {RA: 190.9167, Dec: 11.5525, MajorAxis: 7, Type: "galaxy"},
	"M61":  {RA: 185.4788, Dec: 4.4736, MajorAxis: 6, Type: "galaxy"},
	"M62":  {RA: 255.3033, Dec: -30.1119, MajorAxis: 15, Type: "globular_cluster"},
	"M63":  {RA: 198.9554, Dec: 42.0294, MajorAxis: 13, Type: "galaxy"},
	"M64":  {RA: 194.1825, Dec: 21.6828, MajorAxis: 10, Type: "galaxy"},
	"M65":  {RA: 169.7330, Dec: 13.0922, MajorAxis: 10, Type: "galaxy"},
	"M66":  {RA: 170.0625, Dec: 12.9914, MajorAxis: 9, Type: "galaxy"},
	"M67":  {RA: 132.8250, Dec: 11.8167, MajorAxis: 30, Type: "open_cluster"},
	"M68":  {RA: 189.8667, Dec: -26.7444, MajorAxis: 11, Type: "globular_cluster"},
	"M69":  {RA: 277.8463, Dec: -32.3481, MajorAxis: 9, Type: "globular_cluster"},
	"M70":  {RA: 280.8038, Dec: -32.2942, MajorAxis: 8, Type: "globular_cluster"},
	"M71":  {RA: 298.4438, Dec: 18.7792, MajorAxis: 7, Type: "globular_cluster"},
	"M72":  {RA: 313.3650, Dec: -12.5372, MajorAxis: 6, Type: "globular_cluster"},
	"M73":  {RA: 314.7492, Dec: -12.6333, MajorAxis: 3, Type: "open_cluster"},
	"M74":  {RA: 24.1742, Dec: 15.7836, MajorAxis: 10, Type: "galaxy"},
	"M75":  {RA: 301.5200, Dec: -21.9211, MajorAxis: 6, Type: "globular_cluster"},
	"M76":  {RA: 25.5821, Dec: 51.5753, MajorAxis: 2.7, Type: "planetary_nebula"},
	"M77":  {RA: 40.6696, Dec: -0.0133, MajorAxis: 7, Type: "galaxy"},
	"M78":  {RA: 86.6500, Dec: 0.0783, MajorAxis: 8, Type: "nebula"},
	"M79":  {RA: 81.0442, Dec: -24.5247, MajorAxis: 9, Type: "globular_cluster"},
	"M80":  {RA: 244.2600, Dec: -22.9756, MajorAxis: 10, Type: "globular_cluster"},
	"M81":  {RA: 148.8883, Dec: 69.0653, MajorAxis: 27, Type: "galaxy"},
	"M82":  {RA: 148.9683, Dec: 69.6797, MajorAxis: 11, Type: "galaxy"},
	"M83":  {RA: 204.2538, Dec: -29.8656, MajorAxis: 13, Type: "galaxy"},
	"M84":  {RA: 186.2654, Dec: 12.8869, MajorAxis: 6, Type: "galaxy"},
	"M85":  {RA: 186.3500, Dec: 18.1911, MajorAxis: 7, Type: "galaxy"},
	"M86":  {RA: 186.5488, Dec: 12.9461, MajorAxis: 9, Type: "galaxy"},
	"M87":  {RA: 187.7058, Dec: 12.3911, MajorAxis: 8, Type: "galaxy"},
	"M88":  {RA: 188.9963, Dec: 14.4203, MajorAxis: 7, Type: "galaxy"},
	"M89":  {RA: 188.9163, Dec: 12.5564, MajorAxis: 5, Type: "galaxy"},
	"M90":  {RA: 189.2092, Dec: 13.1628, MajorAxis: 10, Type: "galaxy"},
	"M91":  {RA: 188.8600, Dec: 14.4964, MajorAxis: 5, Type: "galaxy"},
	"M92":  {RA: 259.2808, Dec: 43.1361, MajorAxis: 14, Type: "globular_cluster"},
	"M93":  {RA: 116.1500, Dec: -23.8667, MajorAxis: 22, Type: "open_cluster"},
	"M94":  {RA: 192.7213, Dec: 41.1203, MajorAxis: 14, Type: "galaxy"},
	"M95":  {RA: 160.9900, Dec: 11.7039, MajorAxis: 7, Type: "galaxy"},
	"M96":  {RA: 161.6904, Dec: 11.8197, MajorAxis: 7, Type: "galaxy"},
	"M97":  {RA: 168.6988, Dec: 55.0192, MajorAxis: 3.4, Type: "planetary_nebula"},
	"M98":  {RA: 183.4513, Dec: 14.9003, MajorAxis: 10, Type: "galaxy"},
	"M99":  {RA: 184.7063, Dec: 14.4167, MajorAxis: 5, Type: "galaxy"},
	"M100": {RA: 185.7288, Dec: 15.8222, MajorAxis: 7, Type: "galaxy"},
	"M101": {RA: 210.8024, Dec: 54.3489, MajorAxis: 29, Type: "galaxy"},
	"M102": {RA: 226.6233, Dec: 55.7636, MajorAxis: 6, Type: "galaxy"},
	"M103": {RA: 23.3417, Dec: 60.6500, MajorAxis: 6, Type: "open_cluster"},
	"M104": {RA: 190.0083, Dec: -11.6231, MajorAxis: 9, Type: "galaxy"},
	"M105": {RA: 161.9567, Dec: 12.5817, MajorAxis: 5, Type: "galaxy"},
	"M106": {RA: 184.7400, Dec: 47.3042, MajorAxis: 19, Type: "galaxy"},
	"M107": {RA: 248.1333, Dec: -13.0536, MajorAxis: 13, Type: "globular_cluster"},
	"M108": {RA: 167.8792, Dec: 55.6742, MajorAxis: 8, Type: "galaxy"},
	"M109": {RA: 179.3996, Dec: 53.3744, MajorAxis: 8, Type: "galaxy"},
	"M110": {RA: 10.0917, Dec: 41.6850, MajorAxis: 22, Type: "galaxy"},
}

const (
	spriteSize = 256
	thumbSize  = 128
)

func main() {
	outDir := filepath.Join("web", "public", "dso-images")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create output directory: %v\n", err)
		os.Exit(1)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	downloaded := 0
	failed := 0

	// Generate images for M1-M110
	for i := 1; i <= 110; i++ {
		id := fmt.Sprintf("M%d", i)
		obj, ok := messierCatalog[id]
		if !ok {
			fmt.Fprintf(os.Stderr, "  No catalog entry for %s\n", id)
			continue
		}

		fmt.Printf("Processing %s...\n", id)

		// Compute field of view: ~2.5x the object angular size, converted to degrees
		// Minimum FOV of 0.05 deg for very small objects, max 2.0 deg for huge ones
		fovDeg := math.Max(0.05, math.Min(2.0, obj.MajorAxis*2.5/60.0))

		// Download from CDS HiPS2FITS (DSS2 color)
		url := fmt.Sprintf(
			"https://alasky.cds.unistra.fr/hips-image-services/hips2fits"+
				"?hips=CDS/P/DSS2/color&width=%d&height=%d"+
				"&fov=%.4f&ra=%.4f&dec=%.4f&projection=TAN&format=jpg",
			spriteSize, spriteSize, fovDeg, obj.RA, obj.Dec,
		)

		img, err := downloadImage(client, url)
		if err != nil {
			fmt.Printf("  Download failed for %s: %v, generating placeholder\n", id, err)
			img = generatePlaceholder(id, obj.Type, spriteSize)
			failed++
		} else {
			fmt.Printf("  Downloaded real DSS2 image for %s (FOV=%.3f deg)\n", id, fovDeg)
			downloaded++
		}

		// Save 256px sprite
		spritePath := filepath.Join(outDir, id+".jpg")
		if err := saveAsJPEG(resizeImage(img, spriteSize, spriteSize), spritePath); err != nil {
			fmt.Fprintf(os.Stderr, "  Failed to save sprite for %s: %v\n", id, err)
			continue
		}

		// Save 128px thumbnail
		thumbPath := filepath.Join(outDir, id+"-thumb.jpg")
		if err := saveAsJPEG(resizeImage(img, thumbSize, thumbSize), thumbPath); err != nil {
			fmt.Fprintf(os.Stderr, "  Failed to save thumbnail for %s: %v\n", id, err)
			continue
		}

		fmt.Printf("  Saved %s and %s-thumb\n", id, id)

		// Small delay to be polite to the CDS server
		time.Sleep(200 * time.Millisecond)
	}

	fmt.Printf("\nDone! Generated images in %s\n", outDir)
	fmt.Printf("Downloaded: %d real images, %d fallback placeholders\n", downloaded, failed)
}

func downloadImage(client *http.Client, url string) (image.Image, error) {
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// Limit download to 10MB
	body := io.LimitReader(resp.Body, 10*1024*1024)

	// Decode based on content type
	contentType := resp.Header.Get("Content-Type")
	switch {
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		return jpeg.Decode(body)
	case strings.Contains(contentType, "png"):
		return png.Decode(body)
	default:
		// Try JPEG first, then PNG
		img, err := jpeg.Decode(body)
		if err != nil {
			return png.Decode(body)
		}
		return img, nil
	}
}

// resizeImage resizes an image to the target dimensions using bilinear interpolation.
func resizeImage(src image.Image, width, height int) image.Image {
	srcBounds := src.Bounds()
	srcW := srcBounds.Dx()
	srcH := srcBounds.Dy()

	// If already the right size, return as-is
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

// ============================================================================
// Fallback placeholder generators (used when CDS download fails)
// ============================================================================

func generatePlaceholder(id, objType string, size int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{8, 10, 18, 255}}, image.Point{}, draw.Src)

	num := 0
	fmt.Sscanf(id, "M%d", &num)
	rng := rand.New(rand.NewSource(int64(num * 7919)))

	addBackgroundStars(img, size, rng)

	switch objType {
	case "galaxy":
		drawGalaxy(img, size, rng)
	case "nebula", "cluster_nebula":
		drawNebula(img, size, rng)
	case "planetary_nebula":
		drawPlanetaryNebula(img, size, rng)
	case "globular_cluster":
		drawGlobularCluster(img, size, rng)
	case "open_cluster":
		drawOpenCluster(img, size, rng)
	default:
		drawGlobularCluster(img, size, rng)
	}

	return img
}

func addBackgroundStars(img *image.RGBA, size int, rng *rand.Rand) {
	count := 40 + rng.Intn(40)
	for i := 0; i < count; i++ {
		x := rng.Intn(size)
		y := rng.Intn(size)
		brightness := uint8(60 + rng.Intn(120))
		r := brightness
		g := uint8(float64(brightness) * (0.85 + rng.Float64()*0.15))
		b := uint8(float64(brightness) * (0.7 + rng.Float64()*0.3))
		img.SetRGBA(x, y, color.RGBA{r, g, b, 255})
	}
}

func drawGalaxy(img *image.RGBA, size int, rng *rand.Rand) {
	cx := float64(size) / 2
	cy := float64(size) / 2
	angle := rng.Float64() * math.Pi
	axisRatio := 0.3 + rng.Float64()*0.5
	majorR := float64(size) * 0.42
	minorR := majorR * axisRatio
	cosA := math.Cos(angle)
	sinA := math.Sin(angle)

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - cx
			dy := float64(y) - cy
			rx := dx*cosA + dy*sinA
			ry := -dx*sinA + dy*cosA
			ex := rx / majorR
			ey := ry / minorR
			dist := math.Sqrt(ex*ex + ey*ey)
			if dist > 1.2 {
				continue
			}
			bulge := 0.95 * math.Exp(-8*dist*dist)
			disk := 0.5 * math.Exp(-3*dist)
			theta := math.Atan2(ry, rx)
			spiralPhase := theta + 2.5*dist
			armStr := 0.3 * math.Cos(2*spiralPhase) * math.Exp(-2*dist) * (1 - math.Exp(-5*dist))
			if armStr < 0 {
				armStr = 0
			}
			intensity := math.Min(bulge+disk+armStr, 1.0)
			coreFrac := bulge / math.Max(intensity, 0.001)
			armFrac := armStr / math.Max(intensity, 0.001)
			diskFrac := math.Max(1-coreFrac-armFrac, 0)
			fr := 1.0*coreFrac + 0.8*diskFrac + 0.45*armFrac
			fg := 0.92*coreFrac + 0.72*diskFrac + 0.55*armFrac
			fb := 0.75*coreFrac + 0.6*diskFrac + 0.85*armFrac
			r := uint8(clamp(fr*intensity*255, 0, 255))
			g := uint8(clamp(fg*intensity*255, 0, 255))
			b := uint8(clamp(fb*intensity*255, 0, 255))
			blendPixel(img, x, y, r, g, b)
		}
	}
}

func drawNebula(img *image.RGBA, size int, rng *rand.Rand) {
	cx := float64(size) / 2
	cy := float64(size) / 2
	radius := float64(size) * 0.45

	type cloudCenter struct{ x, y, r, strength float64 }
	clouds := make([]cloudCenter, 4+rng.Intn(4))
	for i := range clouds {
		clouds[i] = cloudCenter{
			x: cx + (rng.Float64()-0.5)*float64(size)*0.5,
			y: cy + (rng.Float64()-0.5)*float64(size)*0.5,
			r: float64(size) * (0.15 + rng.Float64()*0.25),
			strength: 0.3 + rng.Float64()*0.7,
		}
	}

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - cx
			dy := float64(y) - cy
			dist := math.Sqrt(dx*dx + dy*dy)
			if dist > radius*1.3 {
				continue
			}
			intensity := 0.0
			for _, c := range clouds {
				cdx := float64(x) - c.x
				cdy := float64(y) - c.y
				cdist := math.Sqrt(cdx*cdx + cdy*cdy)
				intensity += c.strength * math.Exp(-2*(cdist/c.r)*(cdist/c.r))
			}
			intensity *= math.Exp(-1.5 * (dist / radius) * (dist / radius))
			intensity = math.Min(intensity, 1.0)
			if intensity < 0.02 {
				continue
			}
			theta := math.Atan2(dy, dx)
			blueMix := clamp(0.2+0.15*math.Sin(3*theta+float64(rng.Intn(100))), 0, 1)
			fr := 0.85*(1-blueMix) + 0.3*blueMix
			fg := 0.25*(1-blueMix) + 0.4*blueMix
			fb := 0.3*(1-blueMix) + 0.85*blueMix
			r := uint8(clamp(fr*intensity*255, 0, 255))
			g := uint8(clamp(fg*intensity*255, 0, 255))
			b := uint8(clamp(fb*intensity*255, 0, 255))
			blendPixel(img, x, y, r, g, b)
		}
	}
}

func drawPlanetaryNebula(img *image.RGBA, size int, rng *rand.Rand) {
	cx := float64(size) / 2
	cy := float64(size) / 2
	outerR := float64(size) * 0.35
	innerR := outerR * 0.5
	ringWidth := outerR - innerR

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - cx
			dy := float64(y) - cy
			dist := math.Sqrt(dx*dx + dy*dy)
			if dist > outerR*1.3 {
				continue
			}
			ringDist := math.Abs(dist - (innerR+outerR)/2)
			ringProfile := math.Exp(-4 * (ringDist / ringWidth) * (ringDist / ringWidth))
			starGlow := 0.7 * math.Exp(-8*(dist/innerR)*(dist/innerR))
			halo := 0.15 * math.Exp(-2*(dist/outerR)*(dist/outerR))
			intensity := math.Min(ringProfile+starGlow+halo, 1.0)
			if intensity < 0.02 {
				continue
			}
			t := clamp(dist/outerR, 0, 1)
			fr := 0.3*(1-t) + 0.6*t
			fg := 0.9*(1-t) + 0.3*t
			fb := 0.8*(1-t) + 0.85*t
			r := uint8(clamp(fr*intensity*255, 0, 255))
			g := uint8(clamp(fg*intensity*255, 0, 255))
			b := uint8(clamp(fb*intensity*255, 0, 255))
			blendPixel(img, x, y, r, g, b)
		}
	}
	addStar(img, size, cx, cy, 2.5, 1.0, 1.0, 0.95)
}

func drawGlobularCluster(img *image.RGBA, size int, rng *rand.Rand) {
	cx := float64(size) / 2
	cy := float64(size) / 2
	radius := float64(size) * 0.4

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - cx
			dy := float64(y) - cy
			dist := math.Sqrt(dx*dx + dy*dy)
			t := dist / radius
			intensity := math.Min(0.6/(1+10*t*t), 1.0)
			if intensity < 0.01 {
				continue
			}
			r := uint8(clamp(0.95*intensity*255, 0, 255))
			g := uint8(clamp(0.80*intensity*255, 0, 255))
			b := uint8(clamp(0.45*intensity*255, 0, 255))
			blendPixel(img, x, y, r, g, b)
		}
	}

	starCount := 200 + rng.Intn(150)
	for i := 0; i < starCount; i++ {
		r := math.Abs(rng.NormFloat64()) * radius * 0.4
		theta := rng.Float64() * 2 * math.Pi
		sx := cx + r*math.Cos(theta)
		sy := cy + r*math.Sin(theta)
		if sx < 0 || sx >= float64(size) || sy < 0 || sy >= float64(size) {
			continue
		}
		brightness := 0.5 + rng.Float64()*0.5
		addStar(img, size, sx, sy, 1.0+rng.Float64()*1.5,
			brightness*(0.95+rng.Float64()*0.05),
			brightness*(0.75+rng.Float64()*0.2),
			brightness*(0.4+rng.Float64()*0.3))
	}
}

func drawOpenCluster(img *image.RGBA, size int, rng *rand.Rand) {
	cx := float64(size) / 2
	cy := float64(size) / 2
	radius := float64(size) * 0.38

	starCount := 25 + rng.Intn(30)
	for i := 0; i < starCount; i++ {
		r := rng.Float64() * radius
		theta := rng.Float64() * 2 * math.Pi
		sx := cx + r*math.Cos(theta)
		sy := cy + r*math.Sin(theta)
		brightness := 0.6 + rng.Float64()*0.4
		addStar(img, size, sx, sy, 1.5+rng.Float64()*3.0,
			brightness*(0.8+rng.Float64()*0.2),
			brightness*(0.85+rng.Float64()*0.15),
			brightness*(0.9+rng.Float64()*0.1))
	}
}

func addStar(img *image.RGBA, size int, sx, sy, starSize, cr, cg, cb float64) {
	radius := int(starSize*2) + 1
	for dy := -radius; dy <= radius; dy++ {
		for dx := -radius; dx <= radius; dx++ {
			px := int(sx) + dx
			py := int(sy) + dy
			if px < 0 || px >= size || py < 0 || py >= size {
				continue
			}
			dist := math.Sqrt(float64(dx*dx + dy*dy))
			intensity := math.Exp(-2 * (dist / starSize) * (dist / starSize))
			if intensity < 0.05 {
				continue
			}
			r := uint8(clamp(cr*intensity*255, 0, 255))
			g := uint8(clamp(cg*intensity*255, 0, 255))
			b := uint8(clamp(cb*intensity*255, 0, 255))
			blendPixel(img, px, py, r, g, b)
		}
	}
}

func blendPixel(img *image.RGBA, x, y int, r, g, b uint8) {
	existing := img.RGBAAt(x, y)
	img.SetRGBA(x, y, color.RGBA{
		R: uint8(math.Min(float64(existing.R)+float64(r), 255)),
		G: uint8(math.Min(float64(existing.G)+float64(g), 255)),
		B: uint8(math.Min(float64(existing.B)+float64(b), 255)),
		A: 255,
	})
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func saveAsJPEG(img image.Image, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return jpeg.Encode(f, img, &jpeg.Options{Quality: 85})
}
