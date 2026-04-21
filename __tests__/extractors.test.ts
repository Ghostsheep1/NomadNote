/**
 * Tests for the extraction pipeline
 */
import { extractFromInput, inferCategory } from "@/features/capture/extractors";

describe("extractFromInput — Google Maps URLs", () => {
  it("extracts coordinates from @lat,lng format", async () => {
    const results = await extractFromInput(
      "https://www.google.com/maps/@35.7148,139.7967,15z"
    );
    expect(results).toHaveLength(1);
    expect(results[0].latitude).toBeCloseTo(35.7148, 3);
    expect(results[0].longitude).toBeCloseTo(139.7967, 3);
    expect(results[0].sourceType).toBe("maps");
  });

  it("extracts place name from /place/ path", async () => {
    const results = await extractFromInput(
      "https://www.google.com/maps/place/Senso-ji+Temple/@35.7148,139.7967,15z"
    );
    expect(results[0].title).toContain("Senso");
    expect(results[0].latitude).toBeCloseTo(35.7148, 3);
    expect(results[0].confidence).toBe("high");
  });

  it("extracts from q= parameter (text query)", async () => {
    const results = await extractFromInput(
      "https://maps.google.com/maps?q=Eiffel+Tower"
    );
    expect(results[0].title).toBe("Eiffel Tower");
  });

  it("marks Google Maps links with maps source type", async () => {
    const results = await extractFromInput(
      "https://goo.gl/maps/abc123"
    );
    expect(results[0].sourceType).toBe("maps");
  });
});

describe("extractFromInput — Apple Maps URLs", () => {
  it("extracts coordinates and name from ll= and q= params", async () => {
    const results = await extractFromInput(
      "https://maps.apple.com/?ll=48.8566,2.3522&q=Paris"
    );
    expect(results[0].latitude).toBeCloseTo(48.8566, 3);
    expect(results[0].longitude).toBeCloseTo(2.3522, 3);
    expect(results[0].title).toBe("Paris");
  });

  it("handles Apple Maps URL without coordinates", async () => {
    const results = await extractFromInput(
      "https://maps.apple.com/?q=Louvre+Museum"
    );
    expect(results[0].title).toBe("Louvre Museum");
    expect(results[0].confidence).toBe("medium");
  });
});

describe("extractFromInput — OpenStreetMap URLs", () => {
  it("extracts from #map hash", async () => {
    const results = await extractFromInput(
      "https://www.openstreetmap.org/#map=15/48.8566/2.3522"
    );
    expect(results[0].latitude).toBeCloseTo(48.8566, 3);
    expect(results[0].longitude).toBeCloseTo(2.3522, 3);
    expect(results[0].confidence).toBe("high");
  });

  it("extracts from mlat/mlon query params", async () => {
    const results = await extractFromInput(
      "https://www.openstreetmap.org/?mlat=51.5074&mlon=-0.1278"
    );
    expect(results[0].latitude).toBeCloseTo(51.5074, 3);
    expect(results[0].longitude).toBeCloseTo(-0.1278, 3);
  });
});

describe("extractFromInput — coordinate strings", () => {
  it("parses comma-separated lat/lng", async () => {
    const results = await extractFromInput("35.6762, 139.6503");
    expect(results).toHaveLength(1);
    expect(results[0].latitude).toBeCloseTo(35.6762, 3);
    expect(results[0].longitude).toBeCloseTo(139.6503, 3);
    expect(results[0].inputType).toBe("coordinates");
    expect(results[0].confidence).toBe("high");
  });

  it("rejects out-of-range coordinates", async () => {
    const results = await extractFromInput("200.0, 300.0");
    // Should fall through to text extraction
    expect(results[0].inputType).not.toBe("coordinates");
  });
});

describe("extractFromInput — social media URLs", () => {
  it("handles TikTok links with low confidence", async () => {
    const results = await extractFromInput("https://www.tiktok.com/@user/video/12345");
    expect(results[0].sourceType).toBe("tiktok");
    expect(results[0].confidence).toBe("low");
  });

  it("handles Instagram links", async () => {
    const results = await extractFromInput("https://www.instagram.com/p/abc123/");
    expect(results[0].sourceType).toBe("instagram");
  });

  it("handles YouTube links", async () => {
    const results = await extractFromInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(results[0].sourceType).toBe("youtube");
  });
});

describe("extractFromInput — text extraction", () => {
  it("extracts double-quoted place names", async () => {
    const results = await extractFromInput('You should visit "Tsukiji Market" for fresh sushi');
    expect(results.some(r => r.title?.includes("Tsukiji"))).toBe(true);
  });

  it("always returns at least one candidate", async () => {
    const results = await extractFromInput("just some random note");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("limits candidates to max 5", async () => {
    const results = await extractFromInput(
      '"Place A", "Place B", "Place C", "Place D", "Place E", "Place F", "Place G"'
    );
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("marks text results as low confidence", async () => {
    const results = await extractFromInput("a nice cozy cafe in the city");
    expect(results[0].confidence).toBe("low");
  });
});

describe("inferCategory", () => {
  it("infers restaurant", () => {
    expect(inferCategory("Ichiran Ramen")).toBe("restaurant");
  });
  it("infers cafe", () => {
    expect(inferCategory("Blue Bottle Coffee")).toBe("cafe");
  });
  it("infers museum", () => {
    expect(inferCategory("The British Museum")).toBe("museum");
  });
  it("infers park", () => {
    expect(inferCategory("Shinjuku Gyoen Garden")).toBe("park");
  });
  it("infers beach", () => {
    expect(inferCategory("Bondi Beach")).toBe("beach");
  });
  it("defaults to attraction", () => {
    expect(inferCategory("Some Unknown Place")).toBe("attraction");
  });
});
