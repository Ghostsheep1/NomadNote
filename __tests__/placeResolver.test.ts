import {
  assessConfidence,
  detectCityContext,
  inferBatchCityContext,
  knownTravelPlaceSuggestions,
  lookupKnownTravelPlace,
  preprocessPlaceInput,
  rankGeocoderResults,
  searchKey,
} from "@/features/capture/placeResolver";
import type { GeocodingResult } from "@/features/capture/extractors";

const result = (overrides: Partial<GeocodingResult>): GeocodingResult => ({
  lat: 0,
  lng: 0,
  displayName: "Test",
  name: "Test",
  city: "Test",
  country: "Test",
  countryCode: "XX",
  type: "place",
  importance: 0.5,
  ...overrides,
});

describe("preprocessPlaceInput", () => {
  it("normalizes whitespace and diacritics for comparison while preserving display", () => {
    const input = preprocessPlaceInput("  Széchenyi   Baths ");
    expect(input.trimmed).toBe("Széchenyi Baths");
    expect(input.normalized).toBe("szechenyi baths");
    expect(searchKey("Praha-Holešovice")).toBe("praha holesovice");
  });

  it("expands critical typo aliases", () => {
    expect(preprocessPlaceInput("halstatt").aliasQuery).toBe("Hallstatt Austria");
    expect(preprocessPlaceInput("viena").aliasQuery).toBe("Vienna Austria");
    expect(preprocessPlaceInput("budapesht").aliasQuery).toBe("Budapest Hungary");
    expect(preprocessPlaceInput("praga").aliasQuery).toBe("Prague Czechia");
    expect(preprocessPlaceInput("hofbrauhaus").aliasQuery).toBe("Hofbräuhaus München");
  });
});

describe("inferBatchCityContext", () => {
  it("chains Munich context after a city header", () => {
    const contexts = inferBatchCityContext(["Munich", "Marienplatz", "Neues Rathaus", "Hofbräuhaus"]);
    expect(contexts[1]?.city).toBe("Munich");
    expect(contexts[2]?.city).toBe("Munich");
    expect(contexts[3]?.countryCode).toBe("DE");
  });

  it("moves context as itinerary cities change", () => {
    const contexts = inferBatchCityContext(["Budapest", "K+K Hotel Opera", "Prague", "Charles Bridge", "Vienna", "Figlmüller"]);
    expect(contexts[1]?.city).toBe("Budapest");
    expect(contexts[3]?.city).toBe("Prague");
    expect(contexts[5]?.city).toBe("Vienna");
  });
});

describe("knownTravelPlaceSuggestions", () => {
  it("ranks short Europe queries correctly", () => {
    expect(knownTravelPlaceSuggestions("vie")[0].name).toBe("Vienna");
    expect(knownTravelPlaceSuggestions("bud")[0].city).toBe("Budapest");
    expect(knownTravelPlaceSuggestions("pra")[0].city).toBe("Prague");
    expect(knownTravelPlaceSuggestions("salz")[0].city).toBe("Salzburg");
    expect(knownTravelPlaceSuggestions("bled")[0].countryCode).toBe("SI");
    expect(knownTravelPlaceSuggestions("hvar")[0].countryCode).toBe("HR");
  });

  it("looks up critical Europe 2026 places with correct countries", () => {
    expect(lookupKnownTravelPlace("halstatt")?.countryCode).toBe("AT");
    expect(lookupKnownTravelPlace("Hofbräuhaus")?.city).toBe("Munich");
    expect(lookupKnownTravelPlace("K+K Hotel Opera", detectCityContext("Budapest"))?.countryCode).toBe("HU");
    expect(lookupKnownTravelPlace("Prague")?.countryCode).toBe("CZ");
    expect(lookupKnownTravelPlace("Széchenyi Baths")?.city).toBe("Budapest");
    expect(lookupKnownTravelPlace("Praha-Holešovice")?.city).toBe("Prague");
    expect(lookupKnownTravelPlace("Figlmüller")?.city).toBe("Vienna");
    expect(lookupKnownTravelPlace("Lake Bled")?.countryCode).toBe("SI");
  });
});

describe("rankGeocoderResults and assessConfidence", () => {
  it("keeps Neues Rathaus in Munich above same-name wrong regions", () => {
    const context = detectCityContext("Munich");
    const ranked = rankGeocoderResults("Neues Rathaus", [
      result({ name: "Neues Rathaus", city: "Leonberg", country: "Germany", countryCode: "DE", displayName: "Neues Rathaus, Leonberg, Germany", importance: 0.7 }),
      result({ name: "Neues Rathaus", city: "Munich", country: "Germany", countryCode: "DE", displayName: "Neues Rathaus, Munich, Germany", importance: 0.65 }),
    ], context, { preferredCountryCodes: ["DE"] });
    expect(ranked[0].city).toBe("Munich");
    expect(assessConfidence("Neues Rathaus", ranked[0], ranked, context, { preferredCountryCodes: ["DE"] })).toBe("high");
  });

  it("does not mark unrelated country matches high confidence", () => {
    const context = detectCityContext("Budapest");
    const wrong = result({ name: "K+K Hotel Opera", city: "Sofia", country: "Bulgaria", countryCode: "BG", displayName: "K+K Hotel Opera, Sofia, Bulgaria", importance: 0.9 });
    expect(assessConfidence("K+K Hotel Opera", wrong, [wrong], context, { preferredCountryCodes: ["HU"] })).toBe("low");
  });
});
