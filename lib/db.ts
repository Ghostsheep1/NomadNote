import Dexie, { type Table } from "dexie";
import type {
  Place, Trip, Collection, Reservation,
  JournalEntry, PackingItem, ExtractedCandidate, AppSettings
} from "./types";
import { defaultSettings } from "./types";

export class NomadNoteDB extends Dexie {
  places!: Table<Place>;
  trips!: Table<Trip>;
  collections!: Table<Collection>;
  reservations!: Table<Reservation>;
  journalEntries!: Table<JournalEntry>;
  packingItems!: Table<PackingItem>;
  candidates!: Table<ExtractedCandidate>;
  settings!: Table<AppSettings & { id: "singleton" }>;

  constructor() {
    super("NomadNoteDB");

    this.version(1).stores({
      places: "id, tripId, category, visited, favorite, createdAt, updatedAt, *collectionIds, *tags",
      trips: "id, archived, createdAt, updatedAt",
      collections: "id, tripId, createdAt",
      reservations: "id, tripId, placeId, date, type",
      journalEntries: "id, tripId, placeId, date, createdAt",
      packingItems: "id, tripId, category, packed",
      candidates: "id, status, createdAt",
      settings: "id",
    });
  }
}

export const db = new NomadNoteDB();

// ── Seed default settings if not present ────────────────────
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("singleton");
  if (existing) return existing;
  const s = { ...defaultSettings, id: "singleton" as const };
  await db.settings.put(s);
  return s;
}

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get("singleton");
  return s ?? defaultSettings;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "singleton" });
}

// ── Places ──────────────────────────────────────────────────
export const placesRepo = {
  async getAll(): Promise<Place[]> {
    return db.places.orderBy("createdAt").reverse().toArray();
  },
  async getByTrip(tripId: string): Promise<Place[]> {
    return db.places.where("tripId").equals(tripId).toArray();
  },
  async get(id: string): Promise<Place | undefined> {
    return db.places.get(id);
  },
  async create(place: Place): Promise<void> {
    await db.places.put(place);
  },
  async update(id: string, patch: Partial<Place>): Promise<void> {
    await db.places.update(id, { ...patch, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    await db.places.delete(id);
  },
  async bulkCreate(places: Place[]): Promise<void> {
    await db.places.bulkPut(places);
  },
};

// ── Trips ──────────────────────────────────────────────────
export const tripsRepo = {
  async getAll(): Promise<Trip[]> {
    return db.trips.orderBy("createdAt").reverse().toArray();
  },
  async getActive(): Promise<Trip[]> {
    return db.trips.where("archived").equals(0).reverse().sortBy("createdAt");
  },
  async get(id: string): Promise<Trip | undefined> {
    return db.trips.get(id);
  },
  async create(trip: Trip): Promise<void> {
    await db.trips.put(trip);
  },
  async update(id: string, patch: Partial<Trip>): Promise<void> {
    await db.trips.update(id, { ...patch, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    // cascade: delete places, collections, reservations, journal, packing
    await db.transaction("rw", [
      db.trips, db.places, db.collections,
      db.reservations, db.journalEntries, db.packingItems,
    ], async () => {
      await db.trips.delete(id);
      await db.places.where("tripId").equals(id).delete();
      await db.collections.where("tripId").equals(id).delete();
      await db.reservations.where("tripId").equals(id).delete();
      await db.journalEntries.where("tripId").equals(id).delete();
      await db.packingItems.where("tripId").equals(id).delete();
    });
  },
  async duplicate(id: string): Promise<Trip> {
    const { nanoid } = await import("nanoid");
    const now = Date.now();
    const trip = await db.trips.get(id);
    if (!trip) throw new Error("Trip not found");
    const newTrip: Trip = {
      ...trip,
      id: nanoid(),
      name: `${trip.name} (copy)`,
      archived: false,
      createdAt: now,
      updatedAt: now,
      itinerary: undefined,
    };
    const places = await db.places.where("tripId").equals(id).toArray();
    const collections = await db.collections.where("tripId").equals(id).toArray();

    const placeIdMap = new Map<string, string>();
    const newPlaces = places.map((p) => {
      const newId = nanoid();
      placeIdMap.set(p.id, newId);
      return { ...p, id: newId, tripId: newTrip.id, createdAt: now, updatedAt: now };
    });
    const newCollections = collections.map((c) => ({
      ...c,
      id: nanoid(),
      tripId: newTrip.id,
      placeIds: c.placeIds.map((pid) => placeIdMap.get(pid) ?? pid),
      createdAt: now,
      updatedAt: now,
    }));

    await db.transaction("rw", [db.trips, db.places, db.collections], async () => {
      await db.trips.put(newTrip);
      await db.places.bulkPut(newPlaces);
      await db.collections.bulkPut(newCollections);
    });
    return newTrip;
  },
};

// ── Collections ─────────────────────────────────────────────
export const collectionsRepo = {
  async getByTrip(tripId: string): Promise<Collection[]> {
    return db.collections.where("tripId").equals(tripId).toArray();
  },
  async create(col: Collection): Promise<void> {
    await db.collections.put(col);
  },
  async update(id: string, patch: Partial<Collection>): Promise<void> {
    await db.collections.update(id, { ...patch, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    await db.collections.delete(id);
  },
};

// ── Reservations ─────────────────────────────────────────────
export const reservationsRepo = {
  async getByTrip(tripId: string): Promise<Reservation[]> {
    return db.reservations.where("tripId").equals(tripId).sortBy("date");
  },
  async create(r: Reservation): Promise<void> {
    await db.reservations.put(r);
  },
  async update(id: string, patch: Partial<Reservation>): Promise<void> {
    await db.reservations.update(id, { ...patch, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    await db.reservations.delete(id);
  },
};

// ── Journal ─────────────────────────────────────────────────
export const journalRepo = {
  async getByTrip(tripId: string): Promise<JournalEntry[]> {
    return db.journalEntries.where("tripId").equals(tripId).reverse().sortBy("date");
  },
  async create(e: JournalEntry): Promise<void> {
    await db.journalEntries.put(e);
  },
  async update(id: string, patch: Partial<JournalEntry>): Promise<void> {
    await db.journalEntries.update(id, { ...patch, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    await db.journalEntries.delete(id);
  },
};

// ── Packing ─────────────────────────────────────────────────
export const packingRepo = {
  async getByTrip(tripId: string): Promise<PackingItem[]> {
    return db.packingItems.where("tripId").equals(tripId).toArray();
  },
  async create(item: PackingItem): Promise<void> {
    await db.packingItems.put(item);
  },
  async update(id: string, patch: Partial<PackingItem>): Promise<void> {
    await db.packingItems.update(id, patch);
  },
  async delete(id: string): Promise<void> {
    await db.packingItems.delete(id);
  },
  async bulkCreate(items: PackingItem[]): Promise<void> {
    await db.packingItems.bulkPut(items);
  },
};

// ── Candidates ──────────────────────────────────────────────
export const candidatesRepo = {
  async getPending(): Promise<ExtractedCandidate[]> {
    return db.candidates.where("status").equals("pending").reverse().sortBy("createdAt");
  },
  async create(c: ExtractedCandidate): Promise<void> {
    await db.candidates.put(c);
  },
  async update(id: string, patch: Partial<ExtractedCandidate>): Promise<void> {
    await db.candidates.update(id, patch);
  },
  async clear(): Promise<void> {
    await db.candidates.where("status").notEqual("pending").delete();
  },
};

// ── Import/Export ────────────────────────────────────────────
export async function exportTrip(tripId: string) {
  const [trip, places, collections, reservations, journalEntries, packingItems] =
    await Promise.all([
      db.trips.get(tripId),
      db.places.where("tripId").equals(tripId).toArray(),
      db.collections.where("tripId").equals(tripId).toArray(),
      db.reservations.where("tripId").equals(tripId).toArray(),
      db.journalEntries.where("tripId").equals(tripId).toArray(),
      db.packingItems.where("tripId").equals(tripId).toArray(),
    ]);
  if (!trip) throw new Error("Trip not found");
  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    trip, places, collections, reservations, journalEntries, packingItems,
  };
}

export async function importTrip(bundle: ReturnType<typeof exportTrip> extends Promise<infer T> ? T : never): Promise<Trip> {
  const { nanoid } = await import("nanoid");
  const now = Date.now();
  const idMap = new Map<string, string>();

  const newTripId = nanoid();
  idMap.set(bundle.trip.id, newTripId);

  const newTrip = { ...bundle.trip, id: newTripId, createdAt: now, updatedAt: now };

  const newPlaces = bundle.places.map((p) => {
    const newId = nanoid();
    idMap.set(p.id, newId);
    return { ...p, id: newId, tripId: newTripId, createdAt: now, updatedAt: now };
  });

  const newCollections = bundle.collections.map((c) => ({
    ...c, id: nanoid(), tripId: newTripId,
    placeIds: c.placeIds.map((pid) => idMap.get(pid) ?? pid),
    createdAt: now, updatedAt: now,
  }));

  const newReservations = bundle.reservations.map((r) => ({
    ...r, id: nanoid(), tripId: newTripId,
    placeId: r.placeId ? (idMap.get(r.placeId) ?? r.placeId) : undefined,
    createdAt: now, updatedAt: now,
  }));

  const newJournalEntries = bundle.journalEntries.map((e) => ({
    ...e, id: nanoid(), tripId: newTripId,
    placeId: e.placeId ? (idMap.get(e.placeId) ?? e.placeId) : undefined,
    createdAt: now, updatedAt: now,
  }));

  const newPackingItems = bundle.packingItems.map((item) => ({
    ...item, id: nanoid(), tripId: newTripId,
  }));

  await db.transaction("rw", [
    db.trips, db.places, db.collections,
    db.reservations, db.journalEntries, db.packingItems,
  ], async () => {
    await db.trips.put(newTrip);
    await db.places.bulkPut(newPlaces);
    await db.collections.bulkPut(newCollections);
    await db.reservations.bulkPut(newReservations);
    await db.journalEntries.bulkPut(newJournalEntries);
    await db.packingItems.bulkPut(newPackingItems);
  });

  return newTrip;
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [
    db.places, db.trips, db.collections,
    db.reservations, db.journalEntries, db.packingItems,
    db.candidates, db.settings,
  ], async () => {
    await Promise.all([
      db.places.clear(),
      db.trips.clear(),
      db.collections.clear(),
      db.reservations.clear(),
      db.journalEntries.clear(),
      db.packingItems.clear(),
      db.candidates.clear(),
      db.settings.clear(),
    ]);
  });
}
