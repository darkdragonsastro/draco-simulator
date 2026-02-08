import { create } from 'zustand';
import { type MountStatus, type TrackingMode, type JogDirection, mountApi } from '../api/client';

const defaultStatus: MountStatus = {
  ra: 0,
  dec: 90,
  alt: 0,
  az: 0,
  target_ra: 0,
  target_dec: 0,
  is_slewing: false,
  is_tracking: false,
  is_parked: true,
  tracking_mode: 'off',
  pier_side: 'east',
  slew_rate: 8,
  hour_angle: 0,
  lst: 0,
  ra_axis_deg: 0,
  dec_axis_deg: 0,
  connected: false,
};

interface MountStore {
  status: MountStatus;
  jogRate: number;
  updateStatus: (s: MountStatus) => void;
  setJogRate: (r: number) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  slewTo: (ra: number, dec: number) => Promise<void>;
  stopSlew: () => Promise<void>;
  setTracking: (mode: TrackingMode) => Promise<void>;
  jog: (direction: JogDirection) => Promise<void>;
  park: () => Promise<void>;
  unpark: () => Promise<void>;
  fetchStatus: () => Promise<void>;
}

export const useMountStore = create<MountStore>((set, get) => ({
  status: defaultStatus,
  jogRate: 2,

  updateStatus: (s) => set({ status: s }),

  setJogRate: (r) => set({ jogRate: r }),

  connect: async () => {
    await mountApi.connect();
    await get().fetchStatus();
  },

  disconnect: async () => {
    await mountApi.disconnect();
    await get().fetchStatus();
  },

  slewTo: async (ra, dec) => {
    await mountApi.slewTo(ra, dec);
  },

  stopSlew: async () => {
    await mountApi.stop();
  },

  setTracking: async (mode) => {
    await mountApi.setTracking(mode);
  },

  jog: async (direction) => {
    await mountApi.jog(direction, get().jogRate);
  },

  park: async () => {
    await mountApi.park();
  },

  unpark: async () => {
    await mountApi.unpark();
  },

  fetchStatus: async () => {
    try {
      const status = await mountApi.getStatus();
      set({ status });
    } catch {
      // ignore fetch errors
    }
  },
}));
