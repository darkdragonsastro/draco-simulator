// DSO Image Store - manages Stellarium-style image overlay data
//
// FUTURE FEATURE: User Image Upload
// Design: Users can upload their own astrophotography for any DSO.
// - Upload page: drag-and-drop image + select target DSO from catalog
// - Plate solving: Use astrometry.net API to get WCS corner coordinates
// - Storage: Save to localStorage or IndexedDB (offline-first)
// - Manifest merge: User images override Stellarium images in the store
// - The same DSOImageQuad component renders user images identically
// - Export/share: Allow users to export their custom manifest + images

import { create } from 'zustand';

export interface DSOImageCorner {
  ra: number;
  dec: number;
}

export interface DSOImageEntry {
  imageUrl: string;
  thumbUrl: string;
  corners: {
    bottomLeft: DSOImageCorner;
    bottomRight: DSOImageCorner;
    topRight: DSOImageCorner;
    topLeft: DSOImageCorner;
  };
  minResolution: number;
  maxBrightness: number;
  credit: string;
}

interface DSOImageStoreState {
  manifest: Record<string, DSOImageEntry>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchManifest: () => Promise<void>;
  getImageData: (id: string) => DSOImageEntry | undefined;
}

export const useDSOImageStore = create<DSOImageStoreState>((set, get) => ({
  manifest: {},
  loaded: false,
  loading: false,
  error: null,

  fetchManifest: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const resp = await fetch('/dso-images/manifest.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      set({ manifest: data, loaded: true, loading: false, error: null });
    } catch (err) {
      console.error('Failed to fetch DSO image manifest:', err);
      set({ loading: false, error: String(err) });
    }
  },

  getImageData: (id: string) => {
    return get().manifest[id];
  },
}));
