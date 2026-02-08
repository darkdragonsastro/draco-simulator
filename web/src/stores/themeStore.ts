import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  sidebarExpanded: boolean;
  nightVision: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleNightVision: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      nightVision: false,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      toggleNightVision: () =>
        set((s) => {
          const next = !s.nightVision;
          if (next) {
            document.documentElement.classList.add('night-vision');
          } else {
            document.documentElement.classList.remove('night-vision');
          }
          return { nightVision: next };
        }),
    }),
    {
      name: 'draco-theme',
    }
  )
);
