import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Place, PlaceCategory, FilterState } from "@/lib/types";
import { defaultFilters } from "@/lib/types";
import { placesRepo } from "@/lib/db";
import { id, now } from "@/lib/utils";

interface PlacesState {
  places: Place[];
  loading: boolean;
  filters: FilterState;
  selectedPlaceId: string | null;

  // Derived
  filteredPlaces: Place[];

  // Actions
  loadPlaces: (tripId?: string) => Promise<void>;
  getPlace: (id: string) => Place | undefined;
  createPlace: (data: Partial<Place>, tripId?: string) => Promise<Place>;
  updatePlace: (id: string, patch: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleVisited: (id: string) => Promise<void>;
  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSelectedPlace: (id: string | null) => void;
}

function applyFilters(places: Place[], filters: FilterState): Place[] {
  return places.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.notes.toLowerCase().includes(q) &&
        !p.city?.toLowerCase().includes(q) &&
        !p.neighborhood?.toLowerCase().includes(q) &&
        !p.tags.some((t) => t.toLowerCase().includes(q))
      )
        return false;
    }
    if (filters.categories.length && !filters.categories.includes(p.category)) return false;
    if (filters.priceLevel.length && !filters.priceLevel.includes(p.priceLevel)) return false;
    if (filters.timeOfDay.length && p.bestTimeOfDay !== "anytime" && !filters.timeOfDay.includes(p.bestTimeOfDay)) return false;
    if (filters.tags.length && !filters.tags.some((t) => p.tags.includes(t))) return false;
    if (filters.visited === "visited" && !p.visited) return false;
    if (filters.visited === "unvisited" && p.visited) return false;
    if (filters.favorites && !p.favorite) return false;
    if (filters.freeOnly && !p.isFree) return false;
    return true;
  });
}

export const usePlacesStore = create<PlacesState>()(
  subscribeWithSelector((set, get) => ({
    places: [],
    loading: false,
    filters: defaultFilters,
    selectedPlaceId: null,
    filteredPlaces: [],

    loadPlaces: async (tripId) => {
      set({ loading: true });
      try {
        const places = tripId
          ? await placesRepo.getByTrip(tripId)
          : await placesRepo.getAll();
        const filteredPlaces = applyFilters(places, get().filters);
        set({ places, filteredPlaces, loading: false });
      } catch (e) {
        console.error("Failed to load places", e);
        set({ loading: false });
      }
    },

    getPlace: (placeId) => get().places.find((p) => p.id === placeId),

    createPlace: async (data, tripId) => {
      const ts = now();
      const place: Place = {
        id: id(),
        title: data.title ?? "Untitled Place",
        notes: data.notes ?? "",
        tags: data.tags ?? [],
        sourceType: data.sourceType ?? "manual",
        sourceUrl: data.sourceUrl,
        city: data.city,
        country: data.country,
        neighborhood: data.neighborhood,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        category: data.category ?? "other",
        priority: data.priority ?? 3,
        priceLevel: data.priceLevel ?? "moderate",
        estimatedDurationMinutes: data.estimatedDurationMinutes ?? 60,
        bestTimeOfDay: data.bestTimeOfDay ?? "anytime",
        indoorOutdoor: data.indoorOutdoor ?? "both",
        visited: false,
        favorite: false,
        isFree: data.priceLevel === "free" || data.isFree === true,
        isChildFriendly: data.isChildFriendly,
        isSoloFriendly: data.isSoloFriendly,
        isDateNight: data.isDateNight,
        dietaryTags: data.dietaryTags ?? [],
        images: data.images ?? [],
        tripId: tripId ?? data.tripId,
        collectionIds: data.collectionIds ?? [],
        createdAt: ts,
        updatedAt: ts,
      };
      await placesRepo.create(place);
      set((s) => {
        const places = [place, ...s.places];
        return { places, filteredPlaces: applyFilters(places, s.filters) };
      });
      return place;
    },

    updatePlace: async (placeId, patch) => {
      await placesRepo.update(placeId, patch);
      set((s) => {
        const places = s.places.map((p) =>
          p.id === placeId ? { ...p, ...patch, updatedAt: now() } : p
        );
        return { places, filteredPlaces: applyFilters(places, s.filters) };
      });
    },

    deletePlace: async (placeId) => {
      await placesRepo.delete(placeId);
      set((s) => {
        const places = s.places.filter((p) => p.id !== placeId);
        return {
          places,
          filteredPlaces: applyFilters(places, s.filters),
          selectedPlaceId: s.selectedPlaceId === placeId ? null : s.selectedPlaceId,
        };
      });
    },

    toggleFavorite: async (placeId) => {
      const place = get().places.find((p) => p.id === placeId);
      if (!place) return;
      const favorite = !place.favorite;
      await placesRepo.update(placeId, { favorite });
      set((s) => {
        const places = s.places.map((p) =>
          p.id === placeId ? { ...p, favorite } : p
        );
        return { places, filteredPlaces: applyFilters(places, s.filters) };
      });
    },

    toggleVisited: async (placeId) => {
      const place = get().places.find((p) => p.id === placeId);
      if (!place) return;
      const visited = !place.visited;
      await placesRepo.update(placeId, { visited });
      set((s) => {
        const places = s.places.map((p) =>
          p.id === placeId ? { ...p, visited } : p
        );
        return { places, filteredPlaces: applyFilters(places, s.filters) };
      });
    },

    setFilters: (f) => {
      set((s) => {
        const filters = { ...s.filters, ...f };
        return { filters, filteredPlaces: applyFilters(s.places, filters) };
      });
    },

    resetFilters: () => {
      set((s) => ({
        filters: defaultFilters,
        filteredPlaces: applyFilters(s.places, defaultFilters),
      }));
    },

    setSelectedPlace: (placeId) => set({ selectedPlaceId: placeId }),
  }))
);
