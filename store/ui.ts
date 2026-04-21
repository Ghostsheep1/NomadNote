import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, MapViewState } from "@/lib/types";
import { defaultSettings } from "@/lib/types";

interface UIState {
  // Panels
  sidebarOpen: boolean;
  captureOpen: boolean;
  commandPaletteOpen: boolean;
  onboardingComplete: boolean;

  // Map
  mapView: MapViewState;
  mapStyle: "streets" | "satellite" | "topo";

  // Settings (cached from DB)
  settings: AppSettings;

  // Active tab in trip view
  activeTripTab: "places" | "itinerary" | "map" | "journal" | "packing" | "reservations" | "settings";

  // Toast undo stack
  undoStack: Array<{ label: string; fn: () => void }>;

  // Actions
  toggleSidebar: () => void;
  openCapture: () => void;
  closeCapture: () => void;
  toggleCommandPalette: () => void;
  completeOnboarding: () => void;
  setMapView: (v: Partial<MapViewState>) => void;
  setMapStyle: (s: "streets" | "satellite" | "topo") => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setActiveTripTab: (tab: UIState["activeTripTab"]) => void;
  pushUndo: (label: string, fn: () => void) => void;
  popUndo: () => { label: string; fn: () => void } | undefined;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      captureOpen: false,
      commandPaletteOpen: false,
      onboardingComplete: false,
      mapView: { lng: 2.3, lat: 48.87, zoom: 12 },
      mapStyle: "streets",
      settings: defaultSettings,
      activeTripTab: "places",
      undoStack: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      openCapture: () => set({ captureOpen: true }),
      closeCapture: () => set({ captureOpen: false }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setMapView: (v) => set((s) => ({ mapView: { ...s.mapView, ...v } })),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setActiveTripTab: (activeTripTab) => set({ activeTripTab }),
      pushUndo: (label, fn) =>
        set((s) => ({
          undoStack: [{ label, fn }, ...s.undoStack].slice(0, 10),
        })),
      popUndo: () => {
        const stack = get().undoStack;
        if (!stack.length) return undefined;
        const item = stack[0];
        set({ undoStack: stack.slice(1) });
        return item;
      },
    }),
    {
      name: "nomadnote-ui",
      partialize: (s) => ({
        onboardingComplete: s.onboardingComplete,
        mapStyle: s.mapStyle,
        settings: s.settings,
        activeTripTab: s.activeTripTab,
      }),
    }
  )
);
