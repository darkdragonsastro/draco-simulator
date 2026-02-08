// Tutorial overlay component for guided learning

import { useState, useEffect } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'wait' | 'input';
  actionTarget?: string;
}

interface TutorialOverlayProps {
  tutorial: {
    id: string;
    name: string;
    steps: TutorialStep[];
  } | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ tutorial, onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!tutorial) return;
    setCurrentStep(0);
  }, [tutorial?.id]);

  useEffect(() => {
    if (!tutorial) return;

    const step = tutorial.steps[currentStep];
    if (step?.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, tutorial]);

  if (!tutorial) return null;

  const step = tutorial.steps[currentStep];
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getTooltipPosition = () => {
    if (!highlightRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    switch (step.position) {
      case 'top':
        return {
          top: `${highlightRect.top - tooltipHeight - padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: `${highlightRect.bottom + padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          left: `${highlightRect.left - tooltipWidth - padding}px`,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          left: `${highlightRect.right + padding}px`,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: `${highlightRect.bottom + padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with cutout */}
      <div className="absolute inset-0 bg-black/70">
        {highlightRect && (
          <div
            className="absolute bg-transparent border-4 border-nebula-blue rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] animate-pulse"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="absolute w-96 bg-space-700 rounded-xl shadow-2xl border border-space-500 overflow-hidden"
        style={getTooltipPosition()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-space-800 border-b border-space-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-nebula-blue font-medium">
              {tutorial.name} - Step {currentStep + 1} of {tutorial.steps.length}
            </span>
            <button
              onClick={onSkip}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Skip Tutorial
            </button>
          </div>
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-300 leading-relaxed">{step.content}</p>

          {step.action && (
            <div className="mt-4 p-3 bg-space-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                {step.action === 'click' && (
                  <>
                    <span className="text-nebula-blue">👆</span>
                    <span className="text-gray-400">Click the highlighted element to continue</span>
                  </>
                )}
                {step.action === 'input' && (
                  <>
                    <span className="text-nebula-blue">⌨️</span>
                    <span className="text-gray-400">Enter a value in the highlighted field</span>
                  </>
                )}
                {step.action === 'wait' && (
                  <>
                    <span className="text-nebula-blue">⏳</span>
                    <span className="text-gray-400">Wait for the action to complete</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-space-800">
          <div
            className="h-full bg-gradient-to-r from-nebula-blue to-nebula-purple transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-space-800 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              currentStep === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:bg-space-600'
            }`}
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-nebula-blue rounded-lg text-sm font-medium hover:bg-opacity-80 transition"
          >
            {isLastStep ? 'Complete!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pre-built tutorials
export const tutorials = {
  firstLight: {
    id: 'first-light',
    name: 'First Light Tutorial',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Draco Simulator!',
        content:
          "Let's capture your first astronomical image. This tutorial will guide you through the basics of astrophotography using the simulator.",
        position: 'center' as const,
      },
      {
        id: 'equipment',
        title: 'Check Your Equipment',
        content:
          'Before imaging, make sure your equipment is connected. The camera, mount, and focuser should all show "connected" status.',
        target: '[data-tutorial="equipment-panel"]',
        position: 'left' as const,
      },
      {
        id: 'exposure',
        title: 'Set Exposure Time',
        content:
          'Start with a 30-second exposure. Longer exposures capture more light but require good tracking. Shorter exposures are safer for beginners.',
        target: '[data-tutorial="exposure-slider"]',
        position: 'left' as const,
      },
      {
        id: 'gain',
        title: 'Set Camera Gain',
        content:
          'Gain amplifies the signal from your camera. Higher gain = brighter image but more noise. Start with gain 100 for a good balance.',
        target: '[data-tutorial="gain-slider"]',
        position: 'left' as const,
      },
      {
        id: 'capture',
        title: 'Start Your Capture',
        content:
          'Click "Start Capture" to take your first image! Watch the progress bar as your exposure completes.',
        target: '[data-tutorial="capture-button"]',
        position: 'left' as const,
        action: 'click' as const,
      },
      {
        id: 'results',
        title: 'Analyze Your Image',
        content:
          'After capture, check the image stats. HFR (Half Flux Radius) measures star sharpness - lower is better. Star count shows how many stars were detected.',
        target: '[data-tutorial="image-stats"]',
        position: 'bottom' as const,
      },
      {
        id: 'complete',
        title: 'Congratulations!',
        content:
          "You've captured your first image! Keep practicing to improve your HFR and try different exposure settings. Unlock more challenges to earn XP and credits!",
        position: 'center' as const,
      },
    ],
  },

  autofocus: {
    id: 'autofocus',
    name: 'Autofocus Tutorial',
    steps: [
      {
        id: 'intro',
        title: 'Mastering Autofocus',
        content:
          'Sharp focus is essential for quality images. This tutorial will teach you how to use the autofocus system to achieve pinpoint stars.',
        position: 'center' as const,
      },
      {
        id: 'focuser',
        title: 'The Focuser',
        content:
          'Your focuser moves the camera closer or farther from the telescope to achieve focus. The current position is shown in steps.',
        target: '[data-tutorial="focuser-panel"]',
        position: 'left' as const,
      },
      {
        id: 'start-focus',
        title: 'Start Autofocus',
        content:
          'Click the Autofocus button to begin. The system will take multiple exposures at different focus positions to find the best focus.',
        target: '[data-tutorial="autofocus-button"]',
        position: 'bottom' as const,
        action: 'click' as const,
      },
      {
        id: 'v-curve',
        title: 'Understanding the V-Curve',
        content:
          'Autofocus creates a V-curve by measuring HFR at different positions. The lowest point of the V is your best focus position.',
        position: 'center' as const,
        action: 'wait' as const,
      },
      {
        id: 'complete',
        title: 'Focus Achieved!',
        content:
          'Your focuser has moved to the optimal position. You can now capture sharp images. Re-run autofocus if temperature changes significantly.',
        position: 'center' as const,
      },
    ],
  },

  guiding: {
    id: 'guiding',
    name: 'Guiding Tutorial',
    steps: [
      {
        id: 'intro',
        title: 'Introduction to Guiding',
        content:
          'Guiding corrects for tracking errors in your mount, allowing longer exposures without star trails. This is essential for deep sky imaging.',
        position: 'center' as const,
      },
      {
        id: 'mount',
        title: 'Your Mount',
        content:
          'Even the best mounts have small tracking errors. Guiding uses a camera to detect these errors and send corrections to the mount.',
        position: 'center' as const,
      },
      {
        id: 'start-guide',
        title: 'Start Guiding',
        content:
          'Click the Guide button to begin. The guider will lock onto a star and start sending corrections.',
        target: '[data-tutorial="guide-button"]',
        position: 'bottom' as const,
        action: 'click' as const,
      },
      {
        id: 'rms',
        title: 'Understanding RMS',
        content:
          'RMS (Root Mean Square) measures guiding accuracy in arcseconds. Lower is better. Under 1" is excellent, under 2" is good for most setups.',
        target: '[data-tutorial="guide-panel"]',
        position: 'left' as const,
      },
      {
        id: 'complete',
        title: 'Guiding Active!',
        content:
          'Your mount is now being guided. You can capture longer exposures without star trails. Keep guiding running during your imaging session.',
        position: 'center' as const,
      },
    ],
  },
};
