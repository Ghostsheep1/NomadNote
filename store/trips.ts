import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Trip, ItineraryDay } from "@/lib/types";
import { tripsRepo } from "@/lib/db";
import { id, now, randomTripEmoji } from "@/lib/utils";

interface TripsState {
  trips: Trip[];
  activeTrip: Trip | null;
  loading: boolean;

  // Actions
  loadTrips: () => Promise<void>;
  setActiveTrip: (trip: Trip | null) => void;
  setActiveTripById: (tripId: string) => Promise<void>;
  createTrip: (data: Partial<Trip>) => Promise<Trip>;
  updateTrip: (id: string, patch: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  duplicateTrip: (id: string) => Promise<Trip>;
  archiveTrip: (id: string, archived: boolean) => Promise<void>;
  saveItinerary: (tripId: string, days: ItineraryDay[]) => Promise<void>;
}

export const useTripsStore = create<TripsState>()(
  subscribeWithSelector((set, get) => ({
    trips: [],
    activeTrip: null,
    loading: false,

    loadTrips: async () => {
      set({ loading: true });
      try {
        const trips = await tripsRepo.getAll();
        set({ trips, loading: false });
      } catch (e) {
        console.error("Failed to load trips", e);
        set({ loading: false });
      }
    },

    setActiveTrip: (trip) => set({ activeTrip: trip }),

    setActiveTripById: async (tripId) => {
      const trip = await tripsRepo.get(tripId);
      set({ activeTrip: trip ?? null });
    },

    createTrip: async (data) => {
      const ts = now();
      const trip: Trip = {
        id: id(),
        name: data.name ?? "Untitled Trip",
        description: data.description,
        emoji: data.emoji ?? randomTripEmoji(),
        startDate: data.startDate,
        endDate: data.endDate,
        timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        budgetStyle: data.budgetStyle ?? "moderate",
        notes: data.notes,
        archived: false,
        itinerary: undefined,
        itineraryMode: data.itineraryMode ?? "balanced",
        totalBudget: data.totalBudget,
        currency: data.currency ?? "USD",
        createdAt: ts,
        updatedAt: ts,
      };
      await tripsRepo.create(trip);
      set((s) => ({ trips: [trip, ...s.trips] }));
      return trip;
    },

    updateTrip: async (tripId, patch) => {
      await tripsRepo.update(tripId, patch);
      set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, ...patch, updatedAt: now() } : t
        ),
        activeTrip:
          s.activeTrip?.id === tripId
            ? { ...s.activeTrip, ...patch, updatedAt: now() }
            : s.activeTrip,
      }));
    },

    deleteTrip: async (tripId) => {
      await tripsRepo.delete(tripId);
      set((s) => ({
        trips: s.trips.filter((t) => t.id !== tripId),
        activeTrip: s.activeTrip?.id === tripId ? null : s.activeTrip,
      }));
    },

    duplicateTrip: async (tripId) => {
      const newTrip = await tripsRepo.duplicate(tripId);
      set((s) => ({ trips: [newTrip, ...s.trips] }));
      return newTrip;
    },

    archiveTrip: async (tripId, archived) => {
      await tripsRepo.update(tripId, { archived });
      set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, archived, updatedAt: now() } : t
        ),
      }));
    },

    saveItinerary: async (tripId, days) => {
      await tripsRepo.update(tripId, { itinerary: days });
      set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, itinerary: days, updatedAt: now() } : t
        ),
        activeTrip:
          s.activeTrip?.id === tripId
            ? { ...s.activeTrip, itinerary: days }
            : s.activeTrip,
      }));
    },
  }))
);
