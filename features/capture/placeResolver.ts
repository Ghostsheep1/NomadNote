import levenshtein from "fast-levenshtein";
import type { GeocodeOptions, GeocodingResult } from "@/features/capture/extractors";
import type { Place, Trip } from "@/lib/types";
import { haversineKm } from "@/lib/utils";

export type Confidence = "high" | "medium" | "low";

export interface CityContext {
  city: string;
  country: string;
  countryCode: string;
  group: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export interface PreprocessedPlaceInput {
  raw: string;
  trimmed: string;
  normalized: string;
  pretty: string;
  aliasQuery?: string;
  aliasLabel?: string;
}

interface KnownPlaceSeed {
  name: string;
  city: string;
  country: string;
  countryCode: string;
  group?: string;
  lat: number;
  lng: number;
  type?: string;
  aliases?: string[];
}

export const EUROPE_2026_COUNTRY_CODES = ["DE", "HU", "CZ", "AT", "SI", "HR", "BA", "ME", "GR"];
export const EUROPE_VIEWBOX: [number, number, number, number] = [-25, 34, 45, 72];
export const EUROPE_2026_VIEWBOX: [number, number, number, number] = [5, 34, 31, 53];

export const EUROPE_2026_CONTEXTS: CityContext[] = [
  { city: "Munich", country: "Germany", countryCode: "DE", group: "Munich", lat: 48.1374, lng: 11.5755, aliases: ["munich", "muenchen", "münchen"] },
  { city: "Budapest", country: "Hungary", countryCode: "HU", group: "Budapest", lat: 47.4979, lng: 19.0402, aliases: ["budapest", "bud", "budapesht"] },
  { city: "Prague", country: "Czechia", countryCode: "CZ", group: "Prague", lat: 50.0755, lng: 14.4378, aliases: ["prague", "praha", "praga", "pra"] },
  { city: "Vienna", country: "Austria", countryCode: "AT", group: "Vienna", lat: 48.2082, lng: 16.3738, aliases: ["vienna", "wien", "viena", "vie"] },
  { city: "Hallstatt", country: "Austria", countryCode: "AT", group: "Hallstatt / Salzburg", lat: 47.5622, lng: 13.6493, aliases: ["hallstatt", "halstatt", "hallstat"] },
  { city: "Salzburg", country: "Austria", countryCode: "AT", group: "Hallstatt / Salzburg", lat: 47.8095, lng: 13.055, aliases: ["salzburg", "salz"] },
  { city: "Ljubljana", country: "Slovenia", countryCode: "SI", group: "Ljubljana / Bled", lat: 46.0569, lng: 14.5058, aliases: ["ljubljana"] },
  { city: "Bled", country: "Slovenia", countryCode: "SI", group: "Ljubljana / Bled", lat: 46.3683, lng: 14.1146, aliases: ["bled", "lake bled"] },
  { city: "Split", country: "Croatia", countryCode: "HR", group: "Split", lat: 43.5081, lng: 16.4402, aliases: ["split"] },
  { city: "Hvar", country: "Croatia", countryCode: "HR", group: "Hvar", lat: 43.1729, lng: 16.4421, aliases: ["hvar"] },
  { city: "Plitvice", country: "Croatia", countryCode: "HR", group: "Plitvice", lat: 44.8654, lng: 15.582, aliases: ["plitvice", "plitvice lakes"] },
  { city: "Mostar", country: "Bosnia and Herzegovina", countryCode: "BA", group: "Mostar", lat: 43.3438, lng: 17.8078, aliases: ["mostar"] },
  { city: "Kotor", country: "Montenegro", countryCode: "ME", group: "Kotor", lat: 42.4247, lng: 18.7712, aliases: ["kotor"] },
  { city: "Durmitor", country: "Montenegro", countryCode: "ME", group: "Durmitor", lat: 43.1289, lng: 19.0325, aliases: ["durmitor", "zabljak", "žabljak"] },
  { city: "Budva", country: "Montenegro", countryCode: "ME", group: "Budva / Sveti Stefan", lat: 42.2911, lng: 18.84, aliases: ["budva", "sveti stefan"] },
  { city: "Dubrovnik", country: "Croatia", countryCode: "HR", group: "Dubrovnik", lat: 42.6507, lng: 18.0944, aliases: ["dubrovnik"] },
  { city: "Athens", country: "Greece", countryCode: "GR", group: "Athens", lat: 37.9838, lng: 23.7275, aliases: ["athens", "athina"] },
];

const CITY_BY_ALIAS = new Map<string, CityContext>();
for (const context of EUROPE_2026_CONTEXTS) {
  for (const alias of context.aliases) CITY_BY_ALIAS.set(searchKey(alias), context);
}

const RAW_ALIAS_EXPANSIONS: Record<string, { query: string; label: string }> = {
  halstatt: { query: "Hallstatt Austria", label: "Hallstatt, Austria" },
  hallstat: { query: "Hallstatt Austria", label: "Hallstatt, Austria" },
  viena: { query: "Vienna Austria", label: "Vienna, Austria" },
  vie: { query: "Vienna Austria", label: "Vienna, Austria" },
  budapesht: { query: "Budapest Hungary", label: "Budapest, Hungary" },
  praga: { query: "Prague Czechia", label: "Prague, Czechia" },
  hofbrauhaus: { query: "Hofbräuhaus München", label: "Hofbräuhaus München" },
  "szechenyi baths": { query: "Széchenyi Thermal Bath Budapest", label: "Széchenyi Thermal Bath, Budapest" },
  "rathaus vienna": { query: "Vienna City Hall", label: "Vienna City Hall" },
  "old town hall tower": { query: "Old Town Hall Prague", label: "Old Town Hall, Prague" },
  "astronomical clock": { query: "Prague Astronomical Clock", label: "Prague Astronomical Clock" },
  "dragon bridge": { query: "Dragon Bridge Ljubljana", label: "Dragon Bridge, Ljubljana" },
};

const SEEDS: KnownPlaceSeed[] = [
  seed("Munich", "Munich", "Germany", "DE", 48.1374, 11.5755, "city", ["muenchen", "münchen"]),
  seed("Budapest", "Budapest", "Hungary", "HU", 47.4979, 19.0402, "city", ["bud", "budapesht"]),
  seed("Prague", "Prague", "Czechia", "CZ", 50.0755, 14.4378, "city", ["praha", "praga", "pra"]),
  seed("Vienna", "Vienna", "Austria", "AT", 48.2082, 16.3738, "city", ["wien", "viena", "vie"]),
  seed("Salzburg", "Salzburg", "Austria", "AT", 47.8095, 13.055, "city", ["salz"]),
  seed("Marienplatz", "Munich", "Germany", "DE", 48.1374, 11.5755, "square"),
  seed("Neues Rathaus", "Munich", "Germany", "DE", 48.1376, 11.5755, "landmark", ["new town hall", "glockenspiel"]),
  seed("Viktualienmarkt", "Munich", "Germany", "DE", 48.1351, 11.5764, "market"),
  seed("Frauenkirche", "Munich", "Germany", "DE", 48.1386, 11.5736, "church"),
  seed("Eisbach", "Munich", "Germany", "DE", 48.1436, 11.5879, "attraction"),
  seed("Hofbräuhaus München", "Munich", "Germany", "DE", 48.1376, 11.5799, "restaurant", ["hofbrauhaus", "hofbräuhaus"]),
  seed("K+K Hotel Opera", "Budapest", "Hungary", "HU", 47.502, 19.058, "hotel"),
  seed("Széchenyi Thermal Bath", "Budapest", "Hungary", "HU", 47.5189, 19.082, "attraction", ["szechenyi baths", "széchenyi baths", "szechenyi thermal bath"]),
  seed("Heroes' Square", "Budapest", "Hungary", "HU", 47.5149, 19.0777, "square"),
  seed("Vajdahunyad Castle", "Budapest", "Hungary", "HU", 47.5153, 19.0821, "castle"),
  seed("St. Stephen's Basilica", "Budapest", "Hungary", "HU", 47.5008, 19.0539, "church"),
  seed("Great Market Hall", "Budapest", "Hungary", "HU", 47.487, 19.0586, "market"),
  seed("Fisherman's Bastion", "Budapest", "Hungary", "HU", 47.5022, 19.0348, "landmark"),
  seed("Matthias Church", "Budapest", "Hungary", "HU", 47.5019, 19.0342, "church"),
  seed("Hungarian Parliament Building", "Budapest", "Hungary", "HU", 47.507, 19.0456, "landmark"),
  seed("Mazel Tov", "Budapest", "Hungary", "HU", 47.5001, 19.0646, "restaurant"),
  seed("Szimpla Kert", "Budapest", "Hungary", "HU", 47.4977, 19.0631, "bar"),
  seed("Kelenföld railway station", "Budapest", "Hungary", "HU", 47.4649, 19.0197, "station", ["kelenfold", "kelenföld"]),
  seed("Kampa", "Prague", "Czechia", "CZ", 50.0842, 14.4085, "park"),
  seed("Charles Bridge", "Prague", "Czechia", "CZ", 50.0865, 14.4114, "bridge"),
  seed("Prague Castle", "Prague", "Czechia", "CZ", 50.0911, 14.4016, "castle"),
  seed("St. Vitus Cathedral", "Prague", "Czechia", "CZ", 50.0909, 14.4005, "church"),
  seed("Golden Lane", "Prague", "Czechia", "CZ", 50.0917, 14.4042, "street"),
  seed("Nerudova Street", "Prague", "Czechia", "CZ", 50.0879, 14.3989, "street"),
  seed("Lokál", "Prague", "Czechia", "CZ", 50.0905, 14.4248, "restaurant", ["lokal"]),
  seed("Old Town Square", "Prague", "Czechia", "CZ", 50.0875, 14.4213, "square"),
  seed("Prague Astronomical Clock", "Prague", "Czechia", "CZ", 50.087, 14.4208, "landmark", ["astronomical clock"]),
  seed("Old Town Hall Tower", "Prague", "Czechia", "CZ", 50.087, 14.4207, "landmark"),
  seed("Letná Park", "Prague", "Czechia", "CZ", 50.0965, 14.4212, "park", ["letna park"]),
  seed("Praha-Holešovice station", "Prague", "Czechia", "CZ", 50.1104, 14.4392, "station", ["praha holesovice", "praha-holešovice"]),
  seed("ibis Wien City", "Vienna", "Austria", "AT", 48.1904, 16.3548, "hotel"),
  seed("Schönbrunn Palace", "Vienna", "Austria", "AT", 48.1845, 16.3122, "palace", ["schonbrunn palace"]),
  seed("Gloriette", "Vienna", "Austria", "AT", 48.1777, 16.3078, "viewpoint"),
  seed("Naschmarkt", "Vienna", "Austria", "AT", 48.1982, 16.3633, "market"),
  seed("Vienna State Opera", "Vienna", "Austria", "AT", 48.2027, 16.3695, "opera"),
  seed("Austrian Parliament Building", "Vienna", "Austria", "AT", 48.2082, 16.358, "landmark", ["parliament"]),
  seed("Vienna City Hall", "Vienna", "Austria", "AT", 48.2108, 16.3575, "landmark", ["rathaus", "rathaus vienna"]),
  seed("Hofburg", "Vienna", "Austria", "AT", 48.2065, 16.3657, "palace"),
  seed("Heldenplatz", "Vienna", "Austria", "AT", 48.2068, 16.3636, "square"),
  seed("Café Central", "Vienna", "Austria", "AT", 48.2104, 16.3656, "cafe", ["cafe central"]),
  seed("St. Stephen's Cathedral", "Vienna", "Austria", "AT", 48.2085, 16.3731, "church"),
  seed("Figlmüller", "Vienna", "Austria", "AT", 48.2091, 16.3762, "restaurant", ["figlmueller"]),
  seed("Vienna Erdberg VIB terminal", "Vienna", "Austria", "AT", 48.1907, 16.4146, "station"),
  seed("Hallstatt", "Hallstatt", "Austria", "AT", 47.5622, 13.6493, "village"),
  seed("Hallstatt north dock", "Hallstatt", "Austria", "AT", 47.5658, 13.6491, "ferry"),
  seed("Mirabell Gardens", "Salzburg", "Austria", "AT", 47.8058, 13.0419, "garden"),
  seed("Pegasus Fountain", "Salzburg", "Austria", "AT", 47.8059, 13.0415, "landmark"),
  seed("Getreidegasse", "Salzburg", "Austria", "AT", 47.8, 13.0431, "street"),
  seed("Salzburg Cathedral", "Salzburg", "Austria", "AT", 47.7972, 13.0477, "church"),
  seed("Ljubljana", "Ljubljana", "Slovenia", "SI", 46.0569, 14.5058, "city"),
  seed("Dragon Bridge", "Ljubljana", "Slovenia", "SI", 46.0514, 14.5106, "bridge"),
  seed("Triple Bridge", "Ljubljana", "Slovenia", "SI", 46.0512, 14.506, "bridge"),
  seed("Prešeren Square", "Ljubljana", "Slovenia", "SI", 46.0514, 14.506, "square", ["preseren square"]),
  seed("Gostilna Sokol", "Ljubljana", "Slovenia", "SI", 46.0492, 14.5068, "restaurant"),
  seed("Lake Bled", "Bled", "Slovenia", "SI", 46.3636, 14.0938, "lake"),
  seed("Bled Castle", "Bled", "Slovenia", "SI", 46.3692, 14.1006, "castle"),
  seed("Bled Island", "Bled", "Slovenia", "SI", 46.3619, 14.0905, "island"),
  seed("Ojstrica viewpoint", "Bled", "Slovenia", "SI", 46.3587, 14.0832, "viewpoint"),
  seed("Park Hotel Bled", "Bled", "Slovenia", "SI", 46.3685, 14.111, "hotel"),
  seed("Diocletian's Palace", "Split", "Croatia", "HR", 43.5081, 16.4402, "palace"),
  seed("Golden Gate Split", "Split", "Croatia", "HR", 43.5092, 16.4407, "landmark"),
  seed("Gregory of Nin", "Split", "Croatia", "HR", 43.5093, 16.4409, "landmark"),
  seed("Peristyle", "Split", "Croatia", "HR", 43.5085, 16.44, "square"),
  seed("Vestibule", "Split", "Croatia", "HR", 43.5082, 16.4401, "landmark"),
  seed("Temple of Jupiter", "Split", "Croatia", "HR", 43.5084, 16.4397, "landmark"),
  seed("Palace Cellars", "Split", "Croatia", "HR", 43.5077, 16.4398, "attraction"),
  seed("Riva Split", "Split", "Croatia", "HR", 43.5076, 16.4387, "promenade"),
  seed("Blue Cave Biševo", "Komiža", "Croatia", "HR", 42.9804, 16.0157, "attraction", ["blue cave bisevo"]),
  seed("Komiža", "Komiža", "Croatia", "HR", 43.0433, 16.0931, "town", ["komiza"]),
  seed("Stiniva Cove", "Vis", "Croatia", "HR", 43.025, 16.1786, "beach"),
  seed("Blue Lagoon Croatia", "Drvenik Veli", "Croatia", "HR", 43.4462, 16.1611, "beach"),
  seed("Hvar", "Hvar", "Croatia", "HR", 43.1729, 16.4421, "town"),
  seed("Fortica Fortress Hvar", "Hvar", "Croatia", "HR", 43.1748, 16.4428, "fortress"),
  seed("St. Stephen's Square Hvar", "Hvar", "Croatia", "HR", 43.1727, 16.4434, "square"),
  seed("Plitvice Lakes National Park", "Plitvice", "Croatia", "HR", 44.8654, 15.582, "park"),
  seed("Veliki Slap", "Plitvice", "Croatia", "HR", 44.9021, 15.6107, "waterfall"),
  seed("Stari Most Mostar", "Mostar", "Bosnia and Herzegovina", "BA", 43.3373, 17.815, "bridge"),
  seed("Kujundžiluk Bazaar", "Mostar", "Bosnia and Herzegovina", "BA", 43.3378, 17.8154, "market", ["kujundziluk bazaar"]),
  seed("Kravice Falls", "Ljubuški", "Bosnia and Herzegovina", "BA", 43.1567, 17.6086, "waterfall"),
  seed("Počitelj", "Počitelj", "Bosnia and Herzegovina", "BA", 43.1346, 17.7317, "village", ["pocitelj"]),
  seed("Kotor Old Town", "Kotor", "Montenegro", "ME", 42.4247, 18.7712, "attraction"),
  seed("Sea Gate Kotor", "Kotor", "Montenegro", "ME", 42.4244, 18.7709, "landmark"),
  seed("Clock Tower Kotor", "Kotor", "Montenegro", "ME", 42.4245, 18.7714, "landmark"),
  seed("St. Tryphon Cathedral", "Kotor", "Montenegro", "ME", 42.4242, 18.7721, "church"),
  seed("Kotor Fortress", "Kotor", "Montenegro", "ME", 42.425, 18.7746, "fortress"),
  seed("Our Lady of the Rocks", "Perast", "Montenegro", "ME", 42.4869, 18.6889, "island"),
  seed("Perast", "Perast", "Montenegro", "ME", 42.486, 18.699, "town"),
  seed("Slano Lake Montenegro", "Nikšić", "Montenegro", "ME", 42.787, 18.907, "lake"),
  seed("Đurđevića Tara Bridge", "Durmitor", "Montenegro", "ME", 43.1501, 19.2959, "bridge", ["durdevica tara bridge", "đurđevića tara bridge"]),
  seed("Black Lake Durmitor", "Durmitor", "Montenegro", "ME", 43.1468, 19.093, "lake"),
  seed("Ostrog Monastery", "Danilovgrad", "Montenegro", "ME", 42.6753, 19.0294, "monastery"),
  seed("Budva Old Town", "Budva", "Montenegro", "ME", 42.2788, 18.837, "attraction"),
  seed("Mogren Beach", "Budva", "Montenegro", "ME", 42.2775, 18.8303, "beach"),
  seed("Sveti Stefan", "Budva", "Montenegro", "ME", 42.255, 18.8961, "island"),
  seed("Dubrovnik Old Town", "Dubrovnik", "Croatia", "HR", 42.6403, 18.1105, "attraction"),
  seed("Pile Gate", "Dubrovnik", "Croatia", "HR", 42.6417, 18.107, "gate"),
  seed("Stradun", "Dubrovnik", "Croatia", "HR", 42.6408, 18.1102, "street"),
  seed("Jesuit Stairs", "Dubrovnik", "Croatia", "HR", 42.6401, 18.1103, "landmark"),
  seed("Lokrum Island", "Dubrovnik", "Croatia", "HR", 42.6248, 18.1219, "island"),
  seed("Fort Lovrijenac", "Dubrovnik", "Croatia", "HR", 42.6419, 18.1043, "fortress"),
  seed("Mount Srđ", "Dubrovnik", "Croatia", "HR", 42.6497, 18.1118, "viewpoint", ["mount srd"]),
  seed("Buža Bar", "Dubrovnik", "Croatia", "HR", 42.6394, 18.1109, "bar", ["buza bar"]),
  seed("Acropolis", "Athens", "Greece", "GR", 37.9715, 23.7257, "attraction"),
  seed("Parthenon", "Athens", "Greece", "GR", 37.9715, 23.7267, "landmark"),
  seed("Areopagus Hill", "Athens", "Greece", "GR", 37.9724, 23.7236, "viewpoint"),
  seed("Acropolis Museum", "Athens", "Greece", "GR", 37.9684, 23.7285, "museum"),
  seed("Temple of Olympian Zeus", "Athens", "Greece", "GR", 37.9693, 23.7331, "landmark"),
  seed("Hadrian's Arch", "Athens", "Greece", "GR", 37.9702, 23.7325, "landmark"),
  seed("Plaka", "Athens", "Greece", "GR", 37.9729, 23.7306, "neighborhood"),
  seed("Anafiotika", "Athens", "Greece", "GR", 37.9725, 23.7277, "neighborhood"),
  seed("Philopappos Hill", "Athens", "Greece", "GR", 37.9678, 23.7215, "viewpoint"),
  seed("Strofi Rooftop Restaurant", "Athens", "Greece", "GR", 37.9687, 23.724, "restaurant"),
];

const KNOWN_BY_KEY = new Map<string, KnownPlaceSeed[]>();
for (const item of SEEDS) {
  for (const key of seedKeys(item)) {
    const list = KNOWN_BY_KEY.get(key) ?? [];
    list.push(item);
    KNOWN_BY_KEY.set(key, list);
  }
}

export function preprocessPlaceInput(raw: string): PreprocessedPlaceInput {
  const trimmed = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  const normalized = searchKey(trimmed);
  const alias = RAW_ALIAS_EXPANSIONS[normalized];
  return {
    raw,
    trimmed,
    normalized,
    pretty: alias?.label ? alias.label.split(",")[0] : titleCasePreserve(trimmed),
    aliasQuery: alias?.query,
    aliasLabel: alias?.label,
  };
}

export function inferBatchCityContext(lines: string[], trip?: Trip | null): Array<CityContext | undefined> {
  let active = inferTripContext(trip);
  return lines.map((line) => {
    const direct = detectCityContext(line);
    if (direct) {
      active = direct;
      return direct;
    }
    const known = lookupKnownTravelPlace(line, active);
    if (known) {
      active = detectCityContext(known.city ?? "") ?? active;
      return active;
    }
    return active;
  });
}

export function contextForCurrentLine(value: string, cursor: number, trip?: Trip | null) {
  const prefix = value.slice(0, cursor);
  const lines = prefix.split(/\r?\n/).filter((line, index, arr) => line.trim() || index === arr.length - 1);
  const contexts = inferBatchCityContext(lines, trip);
  return contexts.at(-1) ?? inferTripContext(trip);
}

export function detectCityContext(input: string): CityContext | undefined {
  const key = searchKey(input);
  if (CITY_BY_ALIAS.has(key)) return CITY_BY_ALIAS.get(key);
  return EUROPE_2026_CONTEXTS.find((context) => context.aliases.some((alias) => key === searchKey(alias)));
}

export function lookupKnownTravelPlace(input: string, context?: CityContext): GeocodingResult | undefined {
  const seedItem = lookupKnownSeed(input, context);
  return seedItem ? seedToResult(seedItem) : undefined;
}

export function knownTravelPlaceSuggestions(input: string, context?: CityContext, limit = 5): GeocodingResult[] {
  const key = searchKey(input);
  if (!key) return [];
  const exact = lookupKnownSeed(input, context);
  const candidates = SEEDS
    .map((item) => ({ item, score: scoreKnownSeed(key, item, context) }))
    .filter(({ score }) => score > 0.42)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
  return uniqueSeeds([exact, ...candidates].filter(Boolean) as KnownPlaceSeed[])
    .slice(0, limit)
    .map(seedToResult);
}

export function buildSearchQueries(input: string, context?: CityContext) {
  const preprocessed = preprocessPlaceInput(input);
  const base = preprocessed.aliasQuery ?? preprocessed.trimmed;
  const queries = new Set<string>();
  if (context) {
    queries.add(`${base}, ${context.city}, ${context.country}`);
    queries.add(`${base}, ${context.country}`);
  }
  const seedItem = lookupKnownSeed(input, context);
  if (seedItem) {
    queries.add(`${seedItem.name}, ${seedItem.city}, ${seedItem.country}`);
    queries.add(`${seedItem.name}, ${seedItem.country}`);
  }
  queries.add(base);
  return Array.from(queries).filter(Boolean);
}

export function rankGeocoderResults(
  query: string,
  results: GeocodingResult[],
  context?: CityContext,
  options: Pick<GeocodeOptions, "near" | "preferredCountryCodes"> = {}
) {
  return [...results].sort((a, b) => scoreGeocoderResult(query, b, context, options) - scoreGeocoderResult(query, a, context, options));
}

export function scoreGeocoderResult(
  query: string,
  result: GeocodingResult,
  context?: CityContext,
  options: Pick<GeocodeOptions, "near" | "preferredCountryCodes"> = {}
) {
  const normalizedQuery = searchKey(preprocessPlaceInput(query).aliasQuery ?? query);
  const name = searchKey(result.name ?? primaryDisplayName(result));
  const display = searchKey(result.displayName);
  const distance = levenshtein.get(normalizedQuery, name);
  const maxLen = Math.max(normalizedQuery.length, name.length, 1);
  const similarity = 1 - distance / maxLen;
  const contains = display.includes(normalizedQuery) || normalizedQuery.includes(name) ? 0.16 : 0;
  const prefix = name.startsWith(normalizedQuery) || normalizedQuery.startsWith(name) ? 0.16 : 0;
  const countryMatch = context?.countryCode && result.countryCode === context.countryCode ? 0.34 : 0;
  const countryPreferred = options.preferredCountryCodes?.includes(result.countryCode ?? "") ? 0.2 : 0;
  const cityMatch = context && resultMatchesCity(result, context) ? 0.3 : 0;
  const wrongContextPenalty = context && result.countryCode && result.countryCode !== context.countryCode ? -0.72 : 0;
  const unrelatedPenalty = result.countryCode && !EUROPE_2026_COUNTRY_CODES.includes(result.countryCode) ? -0.38 : 0;
  const importance = (result.importance ?? 0.25) * 0.16;
  const nearBonus = options.near ? Math.max(0, 1 - haversineKm(options.near.lat, options.near.lng, result.lat, result.lng) / 900) * 0.1 : 0;
  return similarity * 0.58 + contains + prefix + countryMatch + countryPreferred + cityMatch + importance + nearBonus + wrongContextPenalty + unrelatedPenalty;
}

export function assessConfidence(
  query: string,
  selected: GeocodingResult,
  options: GeocodingResult[],
  context?: CityContext,
  geocodeOptions: Pick<GeocodeOptions, "near" | "preferredCountryCodes"> = {}
): Confidence {
  const score = scoreGeocoderResult(query, selected, context, geocodeOptions);
  const second = options[1] ? scoreGeocoderResult(query, options[1], context, geocodeOptions) : 0;
  const expectedCountry = context?.countryCode ?? geocodeOptions.preferredCountryCodes?.find((code) => selected.countryCode === code);
  const countryOk = !expectedCountry || selected.countryCode === expectedCountry;
  const cityOk = !context || resultMatchesCity(selected, context);
  const stringOk = stringSimilarity(query, selected.name ?? primaryDisplayName(selected)) > 0.7 || searchKey(selected.displayName).includes(searchKey(query));
  if (countryOk && cityOk && stringOk && score > 0.9 && score - second > 0.06) return "high";
  if (countryOk && score > 0.58) return "medium";
  return "low";
}

export function buildGeocodeOptions(places: Place[], trip?: Trip | null): GeocodeOptions {
  const withCoords = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
  const placeCountryCodes = Array.from(new Set(places.map(countryToCode).filter(Boolean))) as string[];
  const tripText = searchKey([trip?.name, trip?.description, trip?.notes, trip?.timezone].filter(Boolean).join(" "));
  const europeTrip = EUROPE_2026_COUNTRY_CODES.some((code) => placeCountryCodes.includes(code)) ||
    ["europe", "munich", "budapest", "prague", "vienna", "athens", "croatia", "montenegro"].some((hint) => tripText.includes(hint));
  const near = withCoords.length
    ? {
        lat: withCoords.reduce((sum, place) => sum + place.latitude!, 0) / withCoords.length,
        lng: withCoords.reduce((sum, place) => sum + place.longitude!, 0) / withCoords.length,
      }
    : undefined;
  return {
    limit: 7,
    near,
    viewbox: europeTrip ? EUROPE_2026_VIEWBOX : undefined,
    countryCodes: !europeTrip && placeCountryCodes.length && placeCountryCodes.length <= 3 ? placeCountryCodes.map((code) => code.toLowerCase()) : undefined,
    preferredCountryCodes: europeTrip ? [...new Set([...placeCountryCodes, ...EUROPE_2026_COUNTRY_CODES])] : placeCountryCodes,
  };
}

export function contextLabel(context?: CityContext) {
  return context?.group ?? "Needs review";
}

export function resultMatchesCity(result: GeocodingResult, context: CityContext) {
  const haystack = searchKey([result.city, result.neighborhood, result.address, result.displayName].filter(Boolean).join(" "));
  return haystack.includes(searchKey(context.city)) || context.aliases.some((alias) => haystack.includes(searchKey(alias)));
}

export function searchKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function lookupKnownSeed(input: string, context?: CityContext) {
  const preprocessed = preprocessPlaceInput(input);
  const keys = [
    `${preprocessed.normalized}|${context?.city ? searchKey(context.city) : ""}`,
    preprocessed.normalized,
    preprocessed.aliasQuery ? searchKey(preprocessed.aliasQuery) : "",
  ].filter(Boolean);
  for (const key of keys) {
    const candidates = KNOWN_BY_KEY.get(key);
    if (!candidates?.length) continue;
    if (context) {
      const inContext = candidates.find((item) => item.countryCode === context.countryCode && searchKey(item.city) === searchKey(context.city));
      if (inContext) return inContext;
      const inCountry = candidates.find((item) => item.countryCode === context.countryCode);
      if (inCountry) return inCountry;
    }
    return candidates[0];
  }
  const scored = SEEDS
    .map((item) => ({ item, score: scoreKnownSeed(preprocessed.normalized, item, context) }))
    .sort((a, b) => b.score - a.score)[0];
  return scored && scored.score > 0.82 ? scored.item : undefined;
}

function scoreKnownSeed(key: string, item: KnownPlaceSeed, context?: CityContext) {
  const keys = seedKeys(item);
  const best = Math.max(...keys.map((candidate) => {
    if (candidate === key) return 1;
    if (candidate.startsWith(key) || key.startsWith(candidate)) return 0.86;
    if (candidate.includes(key) || key.includes(candidate)) return 0.76;
    return stringSimilarity(key, candidate);
  }));
  const contextBoost = context && item.countryCode === context.countryCode ? 0.18 : 0;
  const cityBoost = context && searchKey(item.city) === searchKey(context.city) ? 0.18 : 0;
  return best + contextBoost + cityBoost;
}

function seedKeys(item: KnownPlaceSeed) {
  const keys = [item.name, ...(item.aliases ?? [])].flatMap((alias) => [
    searchKey(alias),
    `${searchKey(alias)}|${searchKey(item.city)}`,
    `${searchKey(alias)} ${searchKey(item.city)}`,
  ]);
  return Array.from(new Set(keys));
}

function uniqueSeeds(items: KnownPlaceSeed[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}|${item.city}|${item.countryCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function seedToResult(item: KnownPlaceSeed): GeocodingResult {
  return {
    lat: item.lat,
    lng: item.lng,
    displayName: `${item.name}, ${item.city}, ${item.country}`,
    name: item.name,
    city: item.city,
    country: item.country,
    countryCode: item.countryCode,
    address: `${item.name}, ${item.city}, ${item.country}`,
    type: item.type ?? "place",
    importance: 0.98,
  };
}

function contextForSeed(item: KnownPlaceSeed) {
  return EUROPE_2026_CONTEXTS.find((context) => context.countryCode === item.countryCode && searchKey(context.city) === searchKey(item.city)) ??
    EUROPE_2026_CONTEXTS.find((context) => context.countryCode === item.countryCode && context.group === item.group) ??
    EUROPE_2026_CONTEXTS.find((context) => context.countryCode === item.countryCode);
}

function inferTripContext(trip?: Trip | null) {
  const tripText = searchKey([trip?.name, trip?.description, trip?.notes, trip?.timezone].filter(Boolean).join(" "));
  return EUROPE_2026_CONTEXTS.find((context) => context.aliases.some((alias) => tripText.includes(searchKey(alias))));
}

function countryToCode(place: Place) {
  const country = place.country ? searchKey(place.country) : "";
  const map: Record<string, string> = {
    austria: "AT",
    hungary: "HU",
    czechia: "CZ",
    "czech republic": "CZ",
    germany: "DE",
    slovenia: "SI",
    croatia: "HR",
    "bosnia and herzegovina": "BA",
    bosnia: "BA",
    montenegro: "ME",
    greece: "GR",
    france: "FR",
    italy: "IT",
    spain: "ES",
    portugal: "PT",
    japan: "JP",
    "united states": "US",
    usa: "US",
    brazil: "BR",
  };
  return map[country];
}

function stringSimilarity(a: string, b: string) {
  const left = searchKey(a);
  const right = searchKey(b);
  const distance = levenshtein.get(left, right);
  return 1 - distance / Math.max(left.length, right.length, 1);
}

function titleCasePreserve(value: string) {
  if (/[A-ZÀ-Ž]/.test(value.slice(1))) return value;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => /^(of|and|the|de|da|do|del|di|la|le|el)$/i.test(part) ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function primaryDisplayName(result: GeocodingResult) {
  return result.displayName.split(",")[0] ?? result.displayName;
}

function seed(
  name: string,
  city: string,
  country: string,
  countryCode: string,
  lat: number,
  lng: number,
  type?: string,
  aliases: string[] = []
): KnownPlaceSeed {
  const context = EUROPE_2026_CONTEXTS.find((item) => item.countryCode === countryCode && searchKey(item.city) === searchKey(city));
  return { name, city, country, countryCode, lat, lng, type, aliases, group: context?.group };
}
