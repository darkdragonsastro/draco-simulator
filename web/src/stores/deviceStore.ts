// Device state management with Zustand

import { create } from 'zustand';

export type DeviceType = 'camera' | 'mount' | 'focuser' | 'filter_wheel' | 'guider';
export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface DeviceState {
  id: string;
  type: DeviceType;
  name: string;
  status: DeviceStatus;
  properties: Record<string, unknown>;
  error?: string;
}

export interface CaptureState {
  isCapturing: boolean;
  progress: number;
  currentExposure: number;
  totalExposures: number;
  lastImage?: ImageData;
}

export interface ImageData {
  id: string;
  timestamp: string;
  exposure: number;
  gain: number;
  binning: number;
  filter?: string;
  hfr?: number;
  starCount?: number;
  meanADU?: number;
  score?: number;
}

export interface FocusState {
  isFocusing: boolean;
  currentPosition: number;
  bestPosition?: number;
  hfrValues: { position: number; hfr: number }[];
}

export interface GuideState {
  isGuiding: boolean;
  rmsRA: number;
  rmsDec: number;
  totalRMS: number;
  corrections: { timestamp: string; ra: number; dec: number }[];
}

interface DeviceStoreState {
  // Devices
  devices: Record<DeviceType, DeviceState>;

  // Capture
  capture: CaptureState;
  captureHistory: ImageData[];

  // Focus
  focus: FocusState;

  // Guide
  guide: GuideState;

  // Actions - Devices
  connectDevice: (type: DeviceType) => void;
  disconnectDevice: (type: DeviceType) => void;
  updateDeviceProperty: (type: DeviceType, name: string, value: unknown) => void;

  // Actions - Capture
  startCapture: (exposure: number, gain: number, binning: number, count: number) => void;
  stopCapture: () => void;
  updateCaptureProgress: (progress: number, current: number) => void;
  addCapturedImage: (image: ImageData) => void;

  // Actions - Focus
  startFocus: () => void;
  stopFocus: () => void;
  updateFocusPosition: (position: number) => void;
  addFocusDataPoint: (position: number, hfr: number) => void;
  setFocusBestPosition: (position: number) => void;

  // Actions - Guide
  startGuiding: () => void;
  stopGuiding: () => void;
  updateGuideStats: (rmsRA: number, rmsDec: number) => void;
  addGuideCorrection: (ra: number, dec: number) => void;
}

const createDefaultDevice = (type: DeviceType, name: string): DeviceState => ({
  id: `virtual-${type}`,
  type,
  name,
  status: 'disconnected',
  properties: {},
});

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  // Initial state
  devices: {
    camera: createDefaultDevice('camera', 'Virtual Camera'),
    mount: createDefaultDevice('mount', 'Virtual Mount'),
    focuser: createDefaultDevice('focuser', 'Virtual Focuser'),
    filter_wheel: createDefaultDevice('filter_wheel', 'Virtual Filter Wheel'),
    guider: createDefaultDevice('guider', 'Virtual Guider'),
  },

  capture: {
    isCapturing: false,
    progress: 0,
    currentExposure: 0,
    totalExposures: 1,
  },

  captureHistory: [],

  focus: {
    isFocusing: false,
    currentPosition: 5000,
    hfrValues: [],
  },

  guide: {
    isGuiding: false,
    rmsRA: 0,
    rmsDec: 0,
    totalRMS: 0,
    corrections: [],
  },

  // Device actions
  connectDevice: (type: DeviceType) => {
    set((state) => ({
      devices: {
        ...state.devices,
        [type]: {
          ...state.devices[type],
          status: 'connecting',
        },
      },
    }));

    // Simulate connection delay
    setTimeout(() => {
      set((state) => ({
        devices: {
          ...state.devices,
          [type]: {
            ...state.devices[type],
            status: 'connected',
          },
        },
      }));
    }, 1000);
  },

  disconnectDevice: (type: DeviceType) => {
    set((state) => ({
      devices: {
        ...state.devices,
        [type]: {
          ...state.devices[type],
          status: 'disconnected',
        },
      },
    }));
  },

  updateDeviceProperty: (type: DeviceType, name: string, value: unknown) => {
    set((state) => ({
      devices: {
        ...state.devices,
        [type]: {
          ...state.devices[type],
          properties: {
            ...state.devices[type].properties,
            [name]: value,
          },
        },
      },
    }));
  },

  // Capture actions
  startCapture: (exposure: number, gain: number, binning: number, count: number) => {
    set({
      capture: {
        isCapturing: true,
        progress: 0,
        currentExposure: 1,
        totalExposures: count,
      },
    });

    // Simulate capture progress
    const intervalMs = 100;
    const totalMs = exposure * 1000;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalMs;
      const progress = Math.min(100, (elapsed / totalMs) * 100);

      set((state) => ({
        capture: {
          ...state.capture,
          progress,
        },
      }));

      if (elapsed >= totalMs) {
        clearInterval(interval);

        // Simulate image completion
        const image: ImageData = {
          id: `img-${Date.now()}`,
          timestamp: new Date().toISOString(),
          exposure,
          gain,
          binning,
          hfr: 1.5 + Math.random() * 1.5,
          starCount: Math.floor(50 + Math.random() * 150),
          meanADU: Math.floor(5000 + Math.random() * 10000),
          score: Math.floor(60 + Math.random() * 35),
        };

        get().addCapturedImage(image);

        const currentState = get().capture;
        if (currentState.currentExposure < currentState.totalExposures) {
          // Start next exposure
          get().startCapture(exposure, gain, binning, count);
          set((state) => ({
            capture: {
              ...state.capture,
              currentExposure: currentState.currentExposure + 1,
            },
          }));
        } else {
          // All done
          set((state) => ({
            capture: {
              ...state.capture,
              isCapturing: false,
              progress: 100,
            },
          }));
        }
      }
    }, intervalMs);
  },

  stopCapture: () => {
    set((state) => ({
      capture: {
        ...state.capture,
        isCapturing: false,
      },
    }));
  },

  updateCaptureProgress: (progress: number, current: number) => {
    set((state) => ({
      capture: {
        ...state.capture,
        progress,
        currentExposure: current,
      },
    }));
  },

  addCapturedImage: (image: ImageData) => {
    set((state) => ({
      capture: {
        ...state.capture,
        lastImage: image,
      },
      captureHistory: [image, ...state.captureHistory].slice(0, 100),
    }));
  },

  // Focus actions
  startFocus: () => {
    set({
      focus: {
        isFocusing: true,
        currentPosition: get().focus.currentPosition,
        hfrValues: [],
      },
    });

    // Simulate autofocus routine
    const positions = [4500, 4700, 4900, 5100, 5300, 5500];
    let index = 0;

    const runStep = () => {
      if (index >= positions.length || !get().focus.isFocusing) {
        // Find best position (minimum HFR)
        const values = get().focus.hfrValues;
        if (values.length > 0) {
          const best = values.reduce((a, b) => (a.hfr < b.hfr ? a : b));
          get().setFocusBestPosition(best.position);
          get().updateFocusPosition(best.position);
        }
        set((state) => ({
          focus: {
            ...state.focus,
            isFocusing: false,
          },
        }));
        return;
      }

      const pos = positions[index];
      get().updateFocusPosition(pos);

      // Simulate HFR measurement with V-curve
      const optimalPos = 5000;
      const baseHFR = 1.2 + Math.abs(pos - optimalPos) / 500 + Math.random() * 0.2;
      get().addFocusDataPoint(pos, baseHFR);

      index++;
      setTimeout(runStep, 1500);
    };

    runStep();
  },

  stopFocus: () => {
    set((state) => ({
      focus: {
        ...state.focus,
        isFocusing: false,
      },
    }));
  },

  updateFocusPosition: (position: number) => {
    set((state) => ({
      focus: {
        ...state.focus,
        currentPosition: position,
      },
    }));
  },

  addFocusDataPoint: (position: number, hfr: number) => {
    set((state) => ({
      focus: {
        ...state.focus,
        hfrValues: [...state.focus.hfrValues, { position, hfr }],
      },
    }));
  },

  setFocusBestPosition: (position: number) => {
    set((state) => ({
      focus: {
        ...state.focus,
        bestPosition: position,
      },
    }));
  },

  // Guide actions
  startGuiding: () => {
    set({
      guide: {
        isGuiding: true,
        rmsRA: 0,
        rmsDec: 0,
        totalRMS: 0,
        corrections: [],
      },
    });

    // Simulate guiding corrections
    const interval = setInterval(() => {
      if (!get().guide.isGuiding) {
        clearInterval(interval);
        return;
      }

      const ra = (Math.random() - 0.5) * 1.5;
      const dec = (Math.random() - 0.5) * 1.2;
      get().addGuideCorrection(ra, dec);

      // Calculate RMS from recent corrections
      const recent = get().guide.corrections.slice(-20);
      if (recent.length > 0) {
        const rmsRA = Math.sqrt(recent.reduce((s, c) => s + c.ra ** 2, 0) / recent.length);
        const rmsDec = Math.sqrt(recent.reduce((s, c) => s + c.dec ** 2, 0) / recent.length);
        get().updateGuideStats(rmsRA, rmsDec);
      }
    }, 2000);
  },

  stopGuiding: () => {
    set((state) => ({
      guide: {
        ...state.guide,
        isGuiding: false,
      },
    }));
  },

  updateGuideStats: (rmsRA: number, rmsDec: number) => {
    set((state) => ({
      guide: {
        ...state.guide,
        rmsRA,
        rmsDec,
        totalRMS: Math.sqrt(rmsRA ** 2 + rmsDec ** 2),
      },
    }));
  },

  addGuideCorrection: (ra: number, dec: number) => {
    set((state) => ({
      guide: {
        ...state.guide,
        corrections: [
          ...state.guide.corrections.slice(-99),
          { timestamp: new Date().toISOString(), ra, dec },
        ],
      },
    }));
  },
}));
