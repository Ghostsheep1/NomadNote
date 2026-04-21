// ============================================================
// NomadNote — Core Type Definitions
// ============================================================

export type ID = string;

// ── Category & Enums ────────────────────────────────────────

export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "bar"
  | "accommodation"
  | "attraction"
  | "museum"
  | "park"
  | "shopping"
  | "transport"
  | "viewpoint"
  | "beach"
  | "nightlife"
  | "market"
  | "street"
  | "religious"
  | "nature"
  | "entertainment"
  | "health"
  | "other";

export type PriceLevel = "free" | "budget" | "moderate" | "expensive" | "luxury";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "anytime";
export type IndoorOutdoor = "indoor" | "outdoor" | "both";
export type SourceType =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "blog"
  | "maps"
  | "manual"
  | "screenshot"
  | "text"
  | "import"
  | "other";

export type BudgetStyle = "backpacker" | "budget" | "moderate" | "comfort" | "luxury";
export type ItineraryMode = "slow" | "balanced" | "packed";
export type Priority = 1 | 2 | 3 | 4 | 5;

// ── Core Place ───────────────────────────────────────────────

export interface Place {
  id: ID;
  title: string;
  notes: string;
  tags: string[];

  // Source
  sourceType: SourceType;
  sourceUrl?: string;

  // Location
  city?: string;
  country?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number;
  longitude?: number;

  // Attributes
  category: PlaceCategory;
  priority: Priority;
  priceLevel: PriceLevel;
  estimatedDurationMinutes: number;
  bestTimeOfDay: TimeOfDay;
  indoorOutdoor: IndoorOutdoor;

  // Flags
  visited: boolean;
  favorite: boolean;
  isFree: boolean;
  isChildFriendly?: boolean;
  isSoloFriendly?: boolean;
  isDateNight?: boolean;

  // Dietary & accessibility
  dietaryTags: string[];

  // Media
  images: PlaceImage[];

  // Linked
  tripId?: ID;
  collectionIds: ID[];

  // Meta
  createdAt: number; // timestamp
  updatedAt: number;
}

export interface PlaceImage {
  id: ID;
  url: string; // data URL or external URL
  caption?: string;
  isLocal: boolean;
}

// ── Trip ─────────────────────────────────────────────────────

export interface Trip {
  id: ID;
  name: string;
  description?: string;
  emoji?: string;
  coverImage?: string;

  // Dates
  startDate?: string; // ISO date "YYYY-MM-DD"
  endDate?: string;
  timezone?: string;

  // Settings
  budgetStyle: BudgetStyle;
  notes?: string;
  archived: boolean;

  // Itinerary
  itinerary?: ItineraryDay[];
  itineraryMode: ItineraryMode;

  // Tracking
  totalBudget?: number;
  currency?: string;

  // Meta
  createdAt: number;
  updatedAt: number;
}

// ── Itinerary ─────────────────────────────────────────────────

export interface ItineraryDay {
  date: string; // ISO "YYYY-MM-DD"
  dayNumber: number;
  items: ItineraryItem[];
  notes?: string;
  theme?: string; // e.g. "Old Town exploration"
}

export interface ItineraryItem {
  id: ID;
  placeId: ID;
  startTime?: string; // "09:00"
  endTime?: string;   // "11:00"
  duration: number;   // minutes
  locked: boolean;
  travelTimeFromPrevious?: number; // minutes
  notes?: string;
  order: number;
}

// ── Collection ───────────────────────────────────────────────

export interface Collection {
  id: ID;
  tripId: ID;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  placeIds: ID[];
  createdAt: number;
  updatedAt: number;
}

// ── Reservation ──────────────────────────────────────────────

export interface Reservation {
  id: ID;
  tripId: ID;
  placeId?: ID;
  title: string;
  type: "hotel" | "flight" | "restaurant" | "tour" | "transport" | "other";
  confirmationNumber?: string;
  date?: string;
  time?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  url?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Journal ──────────────────────────────────────────────────

export interface JournalEntry {
  id: ID;
  tripId: ID;
  placeId?: ID;
  date: string;
  title?: string;
  content: string;
  mood?: "amazing" | "great" | "good" | "okay" | "rough";
  images: PlaceImage[];
  createdAt: number;
  updatedAt: number;
}

// ── Packing List ─────────────────────────────────────────────

export interface PackingItem {
  id: ID;
  tripId: ID;
  category: string;
  name: string;
  quantity: number;
  packed: boolean;
  notes?: string;
}

// ── Capture / Extraction ─────────────────────────────────────

export type CandidateStatus = "pending" | "confirmed" | "rejected";

export interface ExtractedCandidate {
  id: ID;
  rawInput: string;
  inputType: "url" | "text" | "screenshot" | "coordinates";

  // Extracted data (may be incomplete/uncertain)
  title?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  neighborhood?: string;
  category?: PlaceCategory;
  sourceUrl?: string;
  sourceType?: SourceType;

  // Confidence
  confidence: "high" | "medium" | "low";
  confidenceReason: string;

  // State
  status: CandidateStatus;
  createdAt: number;
}

// ── Algorithm Types ──────────────────────────────────────────

export interface ItinerarySuggestion {
  days: SuggestedDay[];
  score: number;
  mode: ItineraryMode;
  explanations: DayExplanation[];
  warnings: string[];
  stats: {
    totalPlaces: number;
    avgDailyWalkingKm: number;
    overloadedDays: number;
    backtrackingScore: number;
  };
}

export interface SuggestedDay {
  dayNumber: number;
  date?: string;
  items: SuggestedItem[];
  totalDurationMinutes: number;
  totalTravelMinutes: number;
  theme?: string;
  neighborhood?: string;
}

export interface SuggestedItem {
  placeId: ID;
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeFromPrevious: number;
  reason: string;
  score: number;
}

export interface DayExplanation {
  dayNumber: number;
  summary: string;
  placementReasons: Record<ID, string>;
  warnings: string[];
}

// ── UI State ─────────────────────────────────────────────────

export interface MapViewState {
  lng: number;
  lat: number;
  zoom: number;
}

export interface FilterState {
  categories: PlaceCategory[];
  priceLevel: PriceLevel[];
  timeOfDay: TimeOfDay[];
  tags: string[];
  visited: "all" | "visited" | "unvisited";
  favorites: boolean;
  freeOnly: boolean;
  search: string;
}

export const defaultFilters: FilterState = {
  categories: [],
  priceLevel: [],
  timeOfDay: [],
  tags: [],
  visited: "all",
  favorites: false,
  freeOnly: false,
  search: "",
};

// ── Settings ─────────────────────────────────────────────────

export interface AppSettings {
  theme: "light" | "dark" | "system";
  defaultMapStyle: "streets" | "satellite" | "topo";
  defaultCurrency: string;
  defaultBudgetStyle: BudgetStyle;
  showOnboarding: boolean;
  dateFormat: "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  distanceUnit: "km" | "mi";
}

export const defaultSettings: AppSettings = {
  theme: "system",
  defaultMapStyle: "streets",
  defaultCurrency: "USD",
  defaultBudgetStyle: "moderate",
  showOnboarding: true,
  dateFormat: "MM/dd/yyyy",
  distanceUnit: "km",
};

// ── Export/Import ────────────────────────────────────────────

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  trip: Trip;
  places: Place[];
  collections: Collection[];
  reservations: Reservation[];
  journalEntries: JournalEntry[];
  packingItems: PackingItem[];
}
