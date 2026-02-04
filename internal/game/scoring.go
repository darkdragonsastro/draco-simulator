package game

import (
	"math"
)

// ScoreCategory represents a category of image quality scoring
type ScoreCategory string

const (
	ScoreCategoryFocus    ScoreCategory = "focus"
	ScoreCategoryTracking ScoreCategory = "tracking"
	ScoreCategoryExposure ScoreCategory = "exposure"
	ScoreCategoryNoise    ScoreCategory = "noise"
	ScoreCategoryOverall  ScoreCategory = "overall"
)

// ImageScore represents the quality assessment of an image
type ImageScore struct {
	Overall    float64                   `json:"overall"`    // 0-100
	Categories map[ScoreCategory]float64 `json:"categories"` // Individual scores
	Feedback   []ScoringFeedback         `json:"feedback"`   // Suggestions for improvement
	XPEarned   int                       `json:"xp_earned"`  // XP awarded for this image
	BonusXP    int                       `json:"bonus_xp"`   // Bonus XP for exceptional quality
	Grade      ImageGrade                `json:"grade"`      // Letter grade
}

// ImageGrade represents letter grades for image quality
type ImageGrade string

const (
	GradeF     ImageGrade = "F"  // 0-19
	GradeD     ImageGrade = "D"  // 20-39
	GradeC     ImageGrade = "C"  // 40-59
	GradeB     ImageGrade = "B"  // 60-79
	GradeA     ImageGrade = "A"  // 80-89
	GradeSPlus ImageGrade = "S+" // 90-100
)

// ScoringFeedback provides suggestions for improvement
type ScoringFeedback struct {
	Category   ScoreCategory `json:"category"`
	Message    string        `json:"message"`
	Severity   string        `json:"severity"` // "info", "warning", "critical"
	Suggestion string        `json:"suggestion"`
}

// ImageMetrics contains the measured values used for scoring
type ImageMetrics struct {
	// Focus metrics
	HFR       float64 `json:"hfr"`        // Half-flux radius in pixels
	FWHM      float64 `json:"fwhm"`       // Full-width half-maximum in arcsec
	StarCount int     `json:"star_count"` // Number of detected stars

	// Tracking metrics
	Elongation    float64 `json:"elongation"`     // Star elongation (1.0 = round)
	TrailingAngle float64 `json:"trailing_angle"` // Angle of trails if present
	GuideRMS      float64 `json:"guide_rms"`      // Guide RMS in arcsec (if guiding)

	// Exposure metrics
	ExposureTime float64 `json:"exposure_time"` // Seconds
	Gain         int     `json:"gain"`          // Camera gain setting
	MeanADU      float64 `json:"mean_adu"`      // Mean background ADU
	MaxADU       float64 `json:"max_adu"`       // Maximum ADU (saturation check)

	// Noise metrics
	BackgroundStdDev float64 `json:"background_stddev"` // Background noise level
	SNR              float64 `json:"snr"`               // Signal-to-noise ratio

	// Context
	BitDepth   int     `json:"bit_depth"`   // Camera bit depth (8, 12, 14, 16)
	PixelScale float64 `json:"pixel_scale"` // Arcsec per pixel
}

// ScoringConfig holds thresholds and weights for scoring
type ScoringConfig struct {
	// Focus thresholds (HFR in pixels, assuming typical ~1-2 arcsec/pixel)
	HFRExcellent  float64 // HFR for 100 score
	HFRGood       float64 // HFR for 80 score
	HFRAcceptable float64 // HFR for 60 score
	HFRPoor       float64 // HFR for 40 score

	// Tracking thresholds (elongation ratio)
	ElongationExcellent  float64 // Elongation for 100 score
	ElongationGood       float64 // Elongation for 80 score
	ElongationAcceptable float64 // Elongation for 60 score

	// Exposure thresholds (fraction of full well)
	BackgroundMin   float64 // Minimum background fraction
	BackgroundIdeal float64 // Ideal background fraction
	BackgroundMax   float64 // Maximum before penalty
	SaturationLimit float64 // Fraction of stars allowed saturated

	// Noise thresholds (SNR)
	SNRExcellent  float64
	SNRGood       float64
	SNRAcceptable float64

	// Weights for overall score
	FocusWeight    float64
	TrackingWeight float64
	ExposureWeight float64
	NoiseWeight    float64

	// XP configuration
	BaseXP     int
	MaxBonusXP int
}

// DefaultScoringConfig returns sensible defaults for image scoring
func DefaultScoringConfig() ScoringConfig {
	return ScoringConfig{
		// Focus thresholds (HFR in pixels)
		HFRExcellent:  1.5,
		HFRGood:       2.5,
		HFRAcceptable: 3.5,
		HFRPoor:       5.0,

		// Tracking thresholds
		ElongationExcellent:  1.05,
		ElongationGood:       1.15,
		ElongationAcceptable: 1.30,

		// Exposure thresholds (fraction of max ADU)
		BackgroundMin:   0.05, // 5% of max
		BackgroundIdeal: 0.20, // 20% of max
		BackgroundMax:   0.50, // 50% of max
		SaturationLimit: 0.10, // 10% stars saturated max

		// Noise thresholds
		SNRExcellent:  50.0,
		SNRGood:       25.0,
		SNRAcceptable: 10.0,

		// Weights (must sum to 1.0)
		FocusWeight:    0.35,
		TrackingWeight: 0.30,
		ExposureWeight: 0.15,
		NoiseWeight:    0.20,

		// XP
		BaseXP:     10,
		MaxBonusXP: 50,
	}
}

// ImageScorer calculates quality scores for captured images
type ImageScorer struct {
	config ScoringConfig
}

// NewImageScorer creates a new image scorer with default configuration
func NewImageScorer() *ImageScorer {
	return &ImageScorer{
		config: DefaultScoringConfig(),
	}
}

// NewImageScorerWithConfig creates a scorer with custom configuration
func NewImageScorerWithConfig(config ScoringConfig) *ImageScorer {
	return &ImageScorer{
		config: config,
	}
}

// ScoreImage calculates the quality score for an image
func (s *ImageScorer) ScoreImage(metrics ImageMetrics) ImageScore {
	score := ImageScore{
		Categories: make(map[ScoreCategory]float64),
		Feedback:   make([]ScoringFeedback, 0),
	}

	// Calculate individual category scores
	score.Categories[ScoreCategoryFocus] = s.scoreFocus(metrics, &score)
	score.Categories[ScoreCategoryTracking] = s.scoreTracking(metrics, &score)
	score.Categories[ScoreCategoryExposure] = s.scoreExposure(metrics, &score)
	score.Categories[ScoreCategoryNoise] = s.scoreNoise(metrics, &score)

	// Calculate weighted overall score
	score.Overall =
		score.Categories[ScoreCategoryFocus]*s.config.FocusWeight +
			score.Categories[ScoreCategoryTracking]*s.config.TrackingWeight +
			score.Categories[ScoreCategoryExposure]*s.config.ExposureWeight +
			score.Categories[ScoreCategoryNoise]*s.config.NoiseWeight

	score.Categories[ScoreCategoryOverall] = score.Overall

	// Assign grade
	score.Grade = scoreToGrade(score.Overall)

	// Calculate XP
	score.XPEarned = s.config.BaseXP
	if score.Overall >= 90 {
		score.BonusXP = s.config.MaxBonusXP
	} else if score.Overall >= 80 {
		score.BonusXP = int(float64(s.config.MaxBonusXP) * 0.6)
	} else if score.Overall >= 70 {
		score.BonusXP = int(float64(s.config.MaxBonusXP) * 0.3)
	}

	return score
}

// scoreFocus evaluates focus quality based on HFR
func (s *ImageScorer) scoreFocus(metrics ImageMetrics, score *ImageScore) float64 {
	hfr := metrics.HFR

	// Handle missing HFR data
	if hfr <= 0 {
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryFocus,
			Message:    "No HFR data available",
			Severity:   "warning",
			Suggestion: "Ensure star detection is working for focus analysis",
		})
		return 50.0 // Neutral score when no data
	}

	var focusScore float64

	switch {
	case hfr <= s.config.HFRExcellent:
		focusScore = 100.0
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category: ScoreCategoryFocus,
			Message:  "Excellent focus achieved",
			Severity: "info",
		})
	case hfr <= s.config.HFRGood:
		// Linear interpolation between excellent and good
		focusScore = 80.0 + 20.0*(s.config.HFRGood-hfr)/(s.config.HFRGood-s.config.HFRExcellent)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryFocus,
			Message:    "Good focus",
			Severity:   "info",
			Suggestion: "Minor focus adjustment could improve sharpness",
		})
	case hfr <= s.config.HFRAcceptable:
		focusScore = 60.0 + 20.0*(s.config.HFRAcceptable-hfr)/(s.config.HFRAcceptable-s.config.HFRGood)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryFocus,
			Message:    "Focus is acceptable but could be improved",
			Severity:   "warning",
			Suggestion: "Run autofocus to achieve sharper stars",
		})
	case hfr <= s.config.HFRPoor:
		focusScore = 40.0 + 20.0*(s.config.HFRPoor-hfr)/(s.config.HFRPoor-s.config.HFRAcceptable)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryFocus,
			Message:    "Focus is poor",
			Severity:   "critical",
			Suggestion: "Image is significantly out of focus. Run autofocus before continuing",
		})
	default:
		focusScore = math.Max(0, 40.0*(s.config.HFRPoor/hfr))
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryFocus,
			Message:    "Image is severely out of focus",
			Severity:   "critical",
			Suggestion: "Check that focuser is connected and run autofocus",
		})
	}

	return clamp(focusScore, 0, 100)
}

// scoreTracking evaluates tracking/guiding quality
func (s *ImageScorer) scoreTracking(metrics ImageMetrics, score *ImageScore) float64 {
	elongation := metrics.Elongation

	// Handle missing elongation data
	if elongation <= 0 {
		elongation = 1.0 // Assume perfect if no data
	}

	var trackingScore float64

	switch {
	case elongation <= s.config.ElongationExcellent:
		trackingScore = 100.0
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category: ScoreCategoryTracking,
			Message:  "Perfect round stars",
			Severity: "info",
		})
	case elongation <= s.config.ElongationGood:
		trackingScore = 80.0 + 20.0*(s.config.ElongationGood-elongation)/(s.config.ElongationGood-s.config.ElongationExcellent)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryTracking,
			Message:    "Minor star elongation detected",
			Severity:   "info",
			Suggestion: "Tracking is good. Consider guiding for longer exposures",
		})
	case elongation <= s.config.ElongationAcceptable:
		trackingScore = 60.0 + 20.0*(s.config.ElongationAcceptable-elongation)/(s.config.ElongationAcceptable-s.config.ElongationGood)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryTracking,
			Message:    "Noticeable star elongation",
			Severity:   "warning",
			Suggestion: "Enable autoguiding or reduce exposure time",
		})
	default:
		// Elongation beyond acceptable - significant trailing
		excess := elongation - s.config.ElongationAcceptable
		trackingScore = math.Max(0, 60.0-excess*50)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryTracking,
			Message:    "Significant star trailing detected",
			Severity:   "critical",
			Suggestion: "Check polar alignment and enable guiding",
		})
	}

	// Bonus/penalty based on guide RMS if guiding
	if metrics.GuideRMS > 0 {
		if metrics.GuideRMS < 0.5 {
			trackingScore = math.Min(100, trackingScore+10)
			score.Feedback = append(score.Feedback, ScoringFeedback{
				Category: ScoreCategoryTracking,
				Message:  "Excellent guide performance",
				Severity: "info",
			})
		} else if metrics.GuideRMS > 2.0 {
			trackingScore = math.Max(0, trackingScore-20)
			score.Feedback = append(score.Feedback, ScoringFeedback{
				Category:   ScoreCategoryTracking,
				Message:    "Guide RMS is high",
				Severity:   "warning",
				Suggestion: "Check guide calibration and star selection",
			})
		}
	}

	return clamp(trackingScore, 0, 100)
}

// scoreExposure evaluates exposure settings
func (s *ImageScorer) scoreExposure(metrics ImageMetrics, score *ImageScore) float64 {
	if metrics.BitDepth <= 0 {
		metrics.BitDepth = 16 // Assume 16-bit
	}

	maxADU := float64(uint(1)<<uint(metrics.BitDepth) - 1)
	backgroundFraction := metrics.MeanADU / maxADU

	var exposureScore float64 = 100.0

	// Check background level
	switch {
	case backgroundFraction < s.config.BackgroundMin:
		penalty := (s.config.BackgroundMin - backgroundFraction) / s.config.BackgroundMin * 40
		exposureScore -= penalty
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryExposure,
			Message:    "Image is underexposed",
			Severity:   "warning",
			Suggestion: "Increase exposure time or gain for better signal",
		})
	case backgroundFraction > s.config.BackgroundMax:
		penalty := (backgroundFraction - s.config.BackgroundMax) / (1.0 - s.config.BackgroundMax) * 40
		exposureScore -= penalty
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryExposure,
			Message:    "Background is too bright",
			Severity:   "warning",
			Suggestion: "Reduce exposure time or check for light pollution/moon",
		})
	case backgroundFraction >= s.config.BackgroundMin && backgroundFraction <= s.config.BackgroundIdeal:
		// Optimal range
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category: ScoreCategoryExposure,
			Message:  "Good exposure level",
			Severity: "info",
		})
	}

	// Check for saturation
	if metrics.MaxADU >= maxADU*0.98 {
		exposureScore -= 15
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryExposure,
			Message:    "Some pixels are saturated",
			Severity:   "warning",
			Suggestion: "Reduce exposure to avoid clipping bright stars",
		})
	}

	return clamp(exposureScore, 0, 100)
}

// scoreNoise evaluates image noise levels
func (s *ImageScorer) scoreNoise(metrics ImageMetrics, score *ImageScore) float64 {
	snr := metrics.SNR

	// Handle missing SNR data
	if snr <= 0 && metrics.BackgroundStdDev > 0 && metrics.MeanADU > 0 {
		// Estimate SNR from background stats
		snr = metrics.MeanADU / metrics.BackgroundStdDev
	}

	if snr <= 0 {
		return 50.0 // Neutral when no data
	}

	var noiseScore float64

	switch {
	case snr >= s.config.SNRExcellent:
		noiseScore = 100.0
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category: ScoreCategoryNoise,
			Message:  "Excellent signal-to-noise ratio",
			Severity: "info",
		})
	case snr >= s.config.SNRGood:
		noiseScore = 80.0 + 20.0*(snr-s.config.SNRGood)/(s.config.SNRExcellent-s.config.SNRGood)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category: ScoreCategoryNoise,
			Message:  "Good signal-to-noise ratio",
			Severity: "info",
		})
	case snr >= s.config.SNRAcceptable:
		noiseScore = 60.0 + 20.0*(snr-s.config.SNRAcceptable)/(s.config.SNRGood-s.config.SNRAcceptable)
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryNoise,
			Message:    "Moderate noise level",
			Severity:   "info",
			Suggestion: "Stack more frames to improve SNR",
		})
	default:
		noiseScore = 60.0 * snr / s.config.SNRAcceptable
		score.Feedback = append(score.Feedback, ScoringFeedback{
			Category:   ScoreCategoryNoise,
			Message:    "High noise level",
			Severity:   "warning",
			Suggestion: "Increase exposure time or stack more frames",
		})
	}

	return clamp(noiseScore, 0, 100)
}

// scoreToGrade converts numeric score to letter grade
func scoreToGrade(score float64) ImageGrade {
	switch {
	case score >= 90:
		return GradeSPlus
	case score >= 80:
		return GradeA
	case score >= 60:
		return GradeB
	case score >= 40:
		return GradeC
	case score >= 20:
		return GradeD
	default:
		return GradeF
	}
}

// clamp restricts a value to a range
func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// CalculateSessionScore aggregates scores for a session
func CalculateSessionScore(scores []ImageScore) float64 {
	if len(scores) == 0 {
		return 0
	}

	var total float64
	for _, s := range scores {
		total += s.Overall
	}

	return total / float64(len(scores))
}

// GetScoreRecommendations returns prioritized improvement suggestions
func GetScoreRecommendations(score ImageScore) []ScoringFeedback {
	// Filter to only warnings and critical feedback
	var recommendations []ScoringFeedback

	for _, fb := range score.Feedback {
		if fb.Severity == "warning" || fb.Severity == "critical" {
			recommendations = append(recommendations, fb)
		}
	}

	// Sort by severity (critical first)
	// Simple bubble sort since list is small
	for i := 0; i < len(recommendations); i++ {
		for j := i + 1; j < len(recommendations); j++ {
			if recommendations[j].Severity == "critical" && recommendations[i].Severity != "critical" {
				recommendations[i], recommendations[j] = recommendations[j], recommendations[i]
			}
		}
	}

	return recommendations
}
