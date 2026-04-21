/**
 * NomadNote — Extraction Pipeline
 *
 * Extracts place candidates from free-form user input.
 * Principle: never fake certainty. Always show what was extracted
 * and ask the user to confirm before saving.
 */

import type { ExtractedCandidate, PlaceCategory, SourceType } from "@/lib/types";
import { detectSourceType } from "@/lib/utils";

export type PartialCandidate = Omit<ExtractedCandidate, "id" | "rawInput" | "status" | "createdAt">;

// ── Main entry point ─────────────────────────────────────────

export async function extractFromInput(input: string): Promise<PartialCandidate[]> {
  const trimmed = input.trim();

  // Try URL parsers first
  if (isLikelyUrl(trimmed)) {
    const urlResult = await extractFromUrl(trimmed);
    if (urlResult.length) return urlResult;
  }

  // Coordinates "48.8566, 2.3522"
  const coordResult = tryParseCoordinates(trimmed);
  if (coordResult) return [coordResult];

  // Free text: extract candidate place names
  return extractFromText(trimmed);
}

// ── URL-based extraction ─────────────────────────────────────

async function extractFromUrl(url: string): Promise<PartialCandidate[]> {
  // Google Maps
  const googleResult = tryGoogleMaps(url);
  if (googleResult) return [googleResult];

  // Apple Maps
  const appleResult = tryAppleMaps(url);
  if (appleResult) return [appleResult];

  // OpenStreetMap
  const osmResult = tryOpenStreetMap(url);
  if (osmResult) return [osmResult];

  // Social media — extract URL as source, mark for manual enrichment
  const social = trySocialMedia(url);
  if (social) return [social];

  // Generic URL — store as reference
  return [genericUrl(url)];
}

// ── Google Maps parser ───────────────────────────────────────

function tryGoogleMaps(url: string): PartialCandidate | null {
  if (!url.includes("google") && !url.includes("goo.gl") && !url.includes("maps.app.goo")) return null;

  let lat: number | undefined;
  let lng: number | undefined;
  let placeName: string | undefined;
  let placeId: string | undefined;

  try {
    const parsed = new URL(url);

    // /maps/@LAT,LNG,ZOOMz
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // /place/NAME/@LAT,LNG
    const placeMatch = url.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }

    // q= parameter
    const q = parsed.searchParams.get("q");
    if (q) {
      const coordQ = q.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
      if (coordQ) {
        lat = parseFloat(coordQ[1]);
        lng = parseFloat(coordQ[2]);
      } else {
        placeName = placeName ?? q;
      }
    }

    // place_id
    placeId = parsed.searchParams.get("place_id") ?? undefined;

    if (lat !== undefined && lng !== undefined) {
      return {
        inputType: "url",
        title: placeName ?? `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        latitude: lat,
        longitude: lng,
        sourceType: "maps",
        sourceUrl: url,
        confidence: placeName ? "high" : "medium",
        confidenceReason: placeName
          ? "Place name and coordinates extracted from Google Maps URL"
          : "Coordinates extracted from Google Maps URL — place name unknown",
      };
    }

    if (placeName) {
      return {
        inputType: "url",
        title: placeName,
        sourceType: "maps",
        sourceUrl: url,
        confidence: "medium",
        confidenceReason: "Place name extracted from Google Maps URL — coordinates not found, geocoding needed",
      };
    }
  } catch {}

  return {
    inputType: "url",
    title: "Google Maps link",
    sourceType: "maps",
    sourceUrl: url,
    confidence: "low",
    confidenceReason: "Google Maps URL recognized but could not extract location details",
  };
}

// ── Apple Maps parser ────────────────────────────────────────

function tryAppleMaps(url: string): PartialCandidate | null {
  if (!url.includes("maps.apple.com")) return null;

  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get("q");
    const ll = parsed.searchParams.get("ll");
    const near = parsed.searchParams.get("near");

    let lat: number | undefined;
    let lng: number | undefined;

    if (ll) {
      const [la, lo] = ll.split(",").map(Number);
      if (!isNaN(la) && !isNaN(lo)) { lat = la; lng = lo; }
    }

    const title = q ?? near ?? "Apple Maps location";

    return {
      inputType: "url",
      title,
      latitude: lat,
      longitude: lng,
      sourceType: "maps",
      sourceUrl: url,
      confidence: lat !== undefined ? "high" : "medium",
      confidenceReason:
        lat !== undefined
          ? "Location extracted from Apple Maps URL"
          : "Place name extracted from Apple Maps URL",
    };
  } catch {
    return null;
  }
}

// ── OpenStreetMap parser ─────────────────────────────────────

function tryOpenStreetMap(url: string): PartialCandidate | null {
  if (!url.includes("openstreetmap.org")) return null;

  try {
    const parsed = new URL(url);
    const hash = parsed.hash; // #map=15/48.8566/2.3522

    const hashMatch = hash.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
    if (hashMatch) {
      return {
        inputType: "url",
        title: `OSM Location (${hashMatch[1]}, ${hashMatch[2]})`,
        latitude: parseFloat(hashMatch[1]),
        longitude: parseFloat(hashMatch[2]),
        sourceType: "maps",
        sourceUrl: url,
        confidence: "high",
        confidenceReason: "Coordinates extracted from OpenStreetMap URL",
      };
    }

    const mlat = parsed.searchParams.get("mlat");
    const mlon = parsed.searchParams.get("mlon");
    if (mlat && mlon) {
      return {
        inputType: "url",
        title: `OSM Location`,
        latitude: parseFloat(mlat),
        longitude: parseFloat(mlon),
        sourceType: "maps",
        sourceUrl: url,
        confidence: "high",
        confidenceReason: "Coordinates extracted from OpenStreetMap marker URL",
      };
    }
  } catch {}

  return null;
}

// ── Social media ─────────────────────────────────────────────

function trySocialMedia(url: string): PartialCandidate | null {
  const sourceType = detectSourceType(url);
  if (!["tiktok", "instagram", "youtube"].includes(sourceType)) return null;

  const platformNames: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
  };

  return {
    inputType: "url",
    title: `${platformNames[sourceType] ?? "Social"} post`,
    sourceType: sourceType as SourceType,
    sourceUrl: url,
    confidence: "low",
    confidenceReason: `${platformNames[sourceType]} link saved — add a title and location manually`,
  };
}

// ── Generic URL ──────────────────────────────────────────────

function genericUrl(url: string): PartialCandidate {
  let domain = url;
  try { domain = new URL(url).hostname.replace("www.", ""); } catch {}

  return {
    inputType: "url",
    title: domain,
    sourceType: "other",
    sourceUrl: url,
    confidence: "low",
    confidenceReason: "URL saved as reference — add a title and location manually",
  };
}

// ── Coordinate parser ─────────────────────────────────────────

function tryParseCoordinates(text: string): PartialCandidate | null {
  // "48.8566, 2.3522" or "48.8566,2.3522" or "48.8566 2.3522"
  const match = text.match(/^(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    inputType: "coordinates",
    title: `Pin at ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    latitude: lat,
    longitude: lng,
    sourceType: "manual",
    confidence: "high",
    confidenceReason: "Coordinates parsed directly from input",
  };
}

// ── Text extraction heuristics ───────────────────────────────

const PLACE_INDICATORS = [
  /\b(?:restaurant|cafe|café|bar|hotel|hostel|museum|park|beach|market|temple|church|cathedral|mosque|synagogue|gallery|theatre|theater|cinema|mall|shop|store|garden|square|plaza|bridge|tower|castle|palace|fort|ruin|ruins|waterfall|lake|mountain|island|bay|port|station|airport)\b/i,
];

const KNOWN_PLACE_PATTERNS = [
  // "The [Name]" capitalized
  /\bThe\s+[A-Z][a-zA-Z\s''-]{2,40}\b/g,
  // "Visit X" or "Go to X" patterns
  /\b(?:visit|see|go\s+to|check\s+out|stop\s+at|eat\s+at|stay\s+at|try)\s+([A-Z][a-zA-Z\s''-]{2,40})/gi,
  // Quoted place name
  /"([^"]{3,60})"/g,
  /\u2018([^\u2019]{3,60})\u2019/g,
];

function extractFromText(text: string): PartialCandidate[] {
  const candidates: PartialCandidate[] = [];

  // Check if it looks like a place description at all
  const hasPlaceWords = PLACE_INDICATORS.some((re) => re.test(text));

  // Try to extract named places from patterns
  for (const pattern of KNOWN_PLACE_PATTERNS) {
    const matches = Array.from(text.matchAll(new RegExp(pattern.source, "gi")));
    for (const match of matches) {
      const name = (match[1] ?? match[0]).trim();
      if (name.length < 3 || name.length > 80) continue;
      if (candidates.some((c) => c.title === name)) continue;

      candidates.push({
        inputType: "text",
        title: name,
        sourceType: "text",
        confidence: "low",
        confidenceReason: "Place name detected from text — verify location manually",
      });
    }
  }

  // If nothing found but text is short and has place words, use as-is
  if (!candidates.length && hasPlaceWords && text.length < 120) {
    candidates.push({
      inputType: "text",
      title: text.slice(0, 80),
      sourceType: "text",
      confidence: "low",
      confidenceReason: "Text saved as reference — add location details manually",
    });
  }

  // Fallback: just save the text
  if (!candidates.length) {
    candidates.push({
      inputType: "text",
      title: text.length > 60 ? text.slice(0, 57) + "…" : text,
      sourceType: "text",
      confidence: "low",
      confidenceReason: "Saved as note — no place name detected automatically",
    });
  }

  return candidates.slice(0, 5); // max 5 candidates per input
}

// ── Geocoding (Nominatim, no API key) ────────────────────────

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  country?: string;
  neighborhood?: string;
  address?: string;
}

export async function geocodeQuery(query: string): Promise<GeocodingResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "NomadNote/1.0" },
    });
    if (!res.ok) throw new Error("Nominatim request failed");
    const data = await res.json();

    return data.map((item: NominatimResult) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      city: item.address?.city ?? item.address?.town ?? item.address?.village,
      country: item.address?.country,
      neighborhood: item.address?.neighbourhood ?? item.address?.suburb,
      address: item.display_name,
    }));
  } catch (e) {
    console.warn("Geocoding failed:", e);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "NomadNote/1.0" },
    });
    if (!res.ok) return null;
    const item: NominatimResult = await res.json();
    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      city: item.address?.city ?? item.address?.town ?? item.address?.village,
      country: item.address?.country,
      neighborhood: item.address?.neighbourhood ?? item.address?.suburb,
      address: item.display_name,
    };
  } catch {
    return null;
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    neighbourhood?: string;
    suburb?: string;
  };
}

// ── Helper ───────────────────────────────────────────────────

function isLikelyUrl(str: string): boolean {
  return /^https?:\/\//i.test(str) || /^www\./i.test(str);
}

// ── Category inference ────────────────────────────────────────

export function inferCategory(title: string, notes?: string): PlaceCategory {
  const text = `${title} ${notes ?? ""}`.toLowerCase();
  if (/restaurant|bistro|brasserie|ristorante|taverna|izakaya|ramen|sushi|pizzeria|diner/.test(text)) return "restaurant";
  if (/cafe|café|coffee|espresso|bakery|patisserie|boulangerie/.test(text)) return "cafe";
  if (/bar|pub|brewery|taproom|cocktail|wine\s+bar/.test(text)) return "bar";
  if (/hotel|hostel|airbnb|guesthouse|villa|resort|inn|bnb|b&b/.test(text)) return "accommodation";
  if (/museum|gallery|exhibit/.test(text)) return "museum";
  if (/park|garden|botanical|nature\s+reserve/.test(text)) return "park";
  if (/beach|bay|coast|shore/.test(text)) return "beach";
  if (/market|bazaar|souk|flea/.test(text)) return "market";
  if (/temple|church|cathedral|mosque|synagogue|shrine|pagoda/.test(text)) return "religious";
  if (/shop|store|boutique|mall|outlet/.test(text)) return "shopping";
  if (/viewpoint|lookout|belvedere|panorama|observation/.test(text)) return "viewpoint";
  if (/station|airport|metro|train|bus|ferry|tram/.test(text)) return "transport";
  if (/club|nightclub|disco|lounge/.test(text)) return "nightlife";
  if (/mountain|hill|volcano|canyon|waterfall|glacier/.test(text)) return "nature";
  if (/theatre|theater|cinema|show|concert|festival|opera/.test(text)) return "entertainment";
  if (/street|alley|lane|promenade|boulevard|avenue/.test(text)) return "street";
  return "attraction";
}
