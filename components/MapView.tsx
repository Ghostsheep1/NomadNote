"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_ICONS, haversineKm } from "@/lib/utils";
import type { Place } from "@/lib/types";
import { usePlacesStore } from "@/store/places";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { Layers, Navigation, Plus } from "lucide-react";
import { toast } from "sonner";
import { reverseGeocode } from "@/features/capture/extractors";

interface MapViewProps {
  places: Place[];
  className?: string;
  onPlaceSelect?: (place: Place) => void;
  onMapClick?: (lat: number, lng: number) => void;
  allowPinDrop?: boolean;
}

const MAP_STYLES = {
  streets: "https://tiles.openfreemap.org/styles/liberty",
  satellite: "https://tiles.openfreemap.org/styles/liberty",
  topo: "https://tiles.openfreemap.org/styles/fiord-color",
};

export function MapView({ places, className, onPlaceSelect, onMapClick, allowPinDrop = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pinDropMode, setPinDropMode] = useState(false);

  const { mapView, setMapView, mapStyle } = useUIStore();
  const { selectedPlaceId, setSelectedPlace } = usePlacesStore();

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: import("maplibre-gl").Map;

    const initMap = async () => {
      const maplibre = await import("maplibre-gl");

      map = new maplibre.Map({
        container: containerRef.current!,
        style: MAP_STYLES[mapStyle] ?? MAP_STYLES.streets,
        center: [mapView.lng, mapView.lat],
        zoom: mapView.zoom,
        attributionControl: { compact: true },
      });

      mapRef.current = map;

      map.on("load", () => setMapLoaded(true));

      map.on("moveend", () => {
        const center = map.getCenter();
        setMapView({ lng: center.lng, lat: center.lat, zoom: map.getZoom() });
      });

      map.on("click", async (e) => {
        if (!pinDropMode) return;
        const { lat, lng } = e.lngLat;
        onMapClick?.(lat, lng);
        setPinDropMode(false);
        toast.success(`Pin dropped at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers ─────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const updateMarkers = async () => {
      const maplibre = await import("maplibre-gl");
      const map = mapRef.current!;

      // Remove stale markers
      for (const [id, marker] of markersRef.current) {
        if (!places.find((p) => p.id === id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }

      // Add/update markers
      for (const place of places) {
        if (!place.latitude || !place.longitude) continue;

        let marker = markersRef.current.get(place.id);

        if (!marker) {
          const el = document.createElement("div");
          el.className = cn("place-marker", selectedPlaceId === place.id && "active");
          el.style.background = CATEGORY_COLORS[place.category];
          const inner = document.createElement("div");
          inner.className = "place-marker-inner";
          inner.textContent = CATEGORY_ICONS[place.category];
          inner.style.fontSize = "10px";
          el.appendChild(inner);

          el.addEventListener("click", (e) => {
            e.stopPropagation();
            setSelectedPlace(place.id);
            onPlaceSelect?.(place);
          });

          marker = new maplibre.Marker({ element: el, anchor: "bottom" })
            .setLngLat([place.longitude, place.latitude])
            .addTo(map);

          markersRef.current.set(place.id, marker);
        } else {
          marker.setLngLat([place.longitude, place.latitude]);
          const el = marker.getElement();
          el.classList.toggle("active", selectedPlaceId === place.id);
        }
      }
    };

    updateMarkers();
  }, [places, mapLoaded, selectedPlaceId, setSelectedPlace, onPlaceSelect]);

  // ── Fit bounds when places change ──────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const withCoords = places.filter((p) => p.latitude && p.longitude);
    if (withCoords.length === 0) return;

    const fitBoundsAsync = async () => {
      const maplibre = await import("maplibre-gl");
      if (withCoords.length === 1) {
        mapRef.current!.flyTo({
          center: [withCoords[0].longitude!, withCoords[0].latitude!],
          zoom: 14,
          duration: 1000,
        });
        return;
      }

      const bounds = new maplibre.LngLatBounds();
      withCoords.forEach((p) => bounds.extend([p.longitude!, p.latitude!]));
      mapRef.current!.fitBounds(bounds, { padding: 60, duration: 1000, maxZoom: 15 });
    };

    fitBoundsAsync();
  }, [mapLoaded, places.length]); // eslint-disable-line

  // ── Fly to selected place ───────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place?.latitude || !place?.longitude) return;
    mapRef.current.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 600,
    });
  }, [selectedPlaceId, mapLoaded, places]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current!.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1000,
        });
      },
      () => toast.error("Location access denied")
    );
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <Button size="icon-sm" variant="outline" onClick={handleLocateMe} className="bg-card/90 backdrop-blur-sm shadow-md border-border">
          <Navigation className="h-3.5 w-3.5" />
        </Button>
        {allowPinDrop && (
          <Button
            size="icon-sm"
            variant={pinDropMode ? "default" : "outline"}
            onClick={() => {
              setPinDropMode(!pinDropMode);
              if (!pinDropMode) toast.info("Click on map to drop a pin");
            }}
            className="bg-card/90 backdrop-blur-sm shadow-md border-border"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {pinDropMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in">
          Click anywhere to drop a pin
        </div>
      )}

      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-muted-foreground text-sm animate-pulse">Loading map…</div>
        </div>
      )}
    </div>
  );
}
