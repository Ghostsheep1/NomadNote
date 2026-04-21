import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import type { PlaceCategory, PriceLevel, Priority, TimeOfDay } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function id(): string {
  return nanoid();
}

export function now(): number {
  return Date.now();
}

// ── Date helpers ─────────────────────────────────────────────

export function formatDate(date: string | number | Date, fmt = "MMM d, yyyy"): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : new Date(date);
    return format(d, fmt);
  } catch {
    return String(date);
  }
}

export function dateRange(start: string, end: string): string[] {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const days = differenceInDays(endDate, startDate) + 1;
  return Array.from({ length: days }, (_, i) =>
    format(addDays(startDate, i), "yyyy-MM-dd")
  );
}

export function tripDuration(start?: string, end?: string): number {
  if (!start || !end) return 0;
  return differenceInDays(parseISO(end), parseISO(start)) + 1;
}

// ── Number helpers ───────────────────────────────────────────

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDistance(km: number, unit: "km" | "mi" = "km"): string {
  if (unit === "mi") {
    const mi = km * 0.621371;
    return mi < 0.1 ? `${Math.round(mi * 5280)} ft` : `${mi.toFixed(1)} mi`;
  }
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ── Category helpers ─────────────────────────────────────────

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  bar: "🍸",
  accommodation: "🛏️",
  attraction: "🏛️",
  museum: "🖼️",
  park: "🌿",
  shopping: "🛍️",
  transport: "🚇",
  viewpoint: "🌅",
  beach: "🏖️",
  nightlife: "🎶",
  market: "🏪",
  street: "🚶",
  religious: "⛩️",
  nature: "🏔️",
  entertainment: "🎭",
  health: "💊",
  other: "📍",
};

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  accommodation: "Stay",
  attraction: "Attraction",
  museum: "Museum",
  park: "Park",
  shopping: "Shopping",
  transport: "Transport",
  viewpoint: "Viewpoint",
  beach: "Beach",
  nightlife: "Nightlife",
  market: "Market",
  street: "Street",
  religious: "Religious",
  nature: "Nature",
  entertainment: "Entertainment",
  health: "Health",
  other: "Other",
};

export const PRICE_LABELS: Record<PriceLevel, string> = {
  free: "Free",
  budget: "$",
  moderate: "$$",
  expensive: "$$$",
  luxury: "$$$$",
};

export const PRICE_COLORS: Record<PriceLevel, string> = {
  free: "text-sage-600 dark:text-sage-400",
  budget: "text-foreground",
  moderate: "text-amber-600 dark:text-amber-400",
  expensive: "text-terracotta-600 dark:text-terracotta-400",
  luxury: "text-purple-600 dark:text-purple-400",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Must See",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "If Time",
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  anytime: "Anytime",
};

export const TIME_ICONS: Record<TimeOfDay, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙",
  anytime: "⏰",
};

// ── Category colors for map markers ─────────────────────────

export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: "#c8582f",
  cafe: "#8b6914",
  bar: "#7c3aed",
  accommodation: "#1d6b99",
  attraction: "#c8582f",
  museum: "#6b5b2e",
  park: "#648c50",
  shopping: "#d97706",
  transport: "#374151",
  viewpoint: "#0891b2",
  beach: "#0891b2",
  nightlife: "#7c3aed",
  market: "#d97706",
  street: "#4b5563",
  religious: "#854d0e",
  nature: "#648c50",
  entertainment: "#db2777",
  health: "#16a34a",
  other: "#6b7280",
};

// ── URL detection ─────────────────────────────────────────────

export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function detectSourceType(url: string): import("./types").SourceType {
  const lower = url.toLowerCase();
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("maps.google") || lower.includes("goo.gl/maps")) return "maps";
  if (lower.includes("maps.apple")) return "maps";
  if (lower.includes("maps.app.goo")) return "maps";
  return "other";
}

// ── Truncate ─────────────────────────────────────────────────

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

// ── Debounce ──────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ── Random ─────────────────────────────────────────────────────

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Download blob ─────────────────────────────────────────────

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Read file ─────────────────────────────────────────────────

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ── Geo helpers ──────────────────────────────────────────────

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function walkingMinutes(km: number): number {
  return Math.round((km / 4.5) * 60);
}

export function centroid(coords: [number, number][]): [number, number] {
  const sum = coords.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

// ── Emoji for trip ───────────────────────────────────────────

export const TRIP_EMOJIS = ["✈️", "🗺️", "🏕️", "🌍", "🏖️", "🏔️", "🌆", "🚂", "🛸", "🌴", "🏛️", "🎌"];

export function randomTripEmoji(): string {
  return randomFrom(TRIP_EMOJIS);
}
