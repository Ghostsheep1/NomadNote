"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, List, Calendar, Package,
  Settings2, ArrowLeft, Plus, Search,
  Shuffle, Download, Umbrella,
} from "lucide-react";
import { cn, downloadJSON, formatDate, tripDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlaceCard } from "@/components/PlaceCard";
import { PlaceForm } from "@/components/PlaceForm";
import { MapView } from "@/components/MapView";
import { CaptureInbox } from "@/components/CaptureInbox";
import { ItineraryBuilder } from "@/components/ItineraryBuilder";
import { TripForm } from "@/components/TripForm";
import { PackingList } from "@/components/PackingList";
import { TripBrief } from "@/components/TripBrief";
import { useTripsStore } from "@/store/trips";
import { usePlacesStore } from "@/store/places";
import { useUIStore } from "@/store/ui";
import { ItineraryTextExport } from "@/components/ItineraryTextExport";
import { exportTrip } from "@/lib/db";
import { pickRandomSpot, findRainyDayAlternatives } from "@/features/itinerary/algorithm";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { Place, Trip } from "@/lib/types";

type Tab = "places" | "map" | "itinerary" | "packing" | "settings";

export default function TripPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { trips, setActiveTrip } = useTripsStore();
  const { places, loadPlaces, filteredPlaces, setFilters, filters, deletePlace } = usePlacesStore();
  const { activeTripTab, setActiveTripTab } = useUIStore();

  const trip = trips.find((t) => t.id === id);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturePrefill, setCapturePrefill] = useState("");
  const [editPlace, setEditPlace] = useState<Place | null>(null);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [rainyDay, setRainyDay] = useState<Place[] | null>(null);
  const [randomPick, setRandomPick] = useState<Place | null>(null);

  useEffect(() => {
    if (trip) {
      setActiveTrip(trip);
      loadPlaces(trip.id);
    }
  }, [trip?.id]); // eslint-disable-line

  const handleDeletePlace = async () => {
    if (!deleteTarget) return;
    await deletePlace(deleteTarget.id);
    toast.success(`"${deleteTarget.title}" removed`);
    setDeleteTarget(null);
  };

  const handleExport = async () => {
    if (!trip) return;
    const bundle = await exportTrip(trip.id);
    downloadJSON(bundle, `nomadnote-${trip.name.toLowerCase().replace(/\s+/g, "-")}.json`);
    toast.success("Trip exported");
  };

  const handleRandom = () => {
    const pick = pickRandomSpot(filteredPlaces);
    if (!pick) { toast.info("No unvisited places left!"); return; }
    setRandomPick(pick);
  };

  const handleRainyDay = () => {
    const opts = findRainyDayAlternatives(filteredPlaces);
    setRainyDay(opts);
    if (!opts.length) toast.info("No indoor places saved yet");
  };

  const openCaptureWithExample = (example: string) => {
    setCapturePrefill(example);
    setCaptureOpen(true);
  };

  if (!trip) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Trip not found</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to trips
        </Button>
      </div>
    );
  }

  const tab = (activeTripTab as Tab) || "places";
  const duration = tripDuration(trip.startDate, trip.endDate);

  return (
    <div className="flex min-h-full flex-col">
      {/* Trip header */}
      <div className="border-b border-border bg-card px-3 pt-4 pb-0 sm:px-4 sm:pt-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <button onClick={() => router.push("/")} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{trip.emoji}</span>
                <h1 className="truncate font-display text-2xl font-bold leading-none sm:text-3xl">{trip.name}</h1>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {trip.startDate && (
                  <span><Calendar className="inline h-3 w-3 mr-1" />{formatDate(trip.startDate, "MMM d")} – {trip.endDate ? formatDate(trip.endDate, "MMM d, yyyy") : "?"} · {duration}d</span>
                )}
                <span><MapPin className="inline h-3 w-3 mr-1" />{places.length} places</span>
                <Badge variant="secondary" className="capitalize">{trip.budgetStyle}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-shrink-0">
            <Button size="icon-sm" variant="ghost" onClick={handleRandom} title="Random spot picker" aria-label="Random spot picker">
              <Shuffle className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={handleRainyDay} title="Rainy day options" aria-label="Rainy day options">
              <Umbrella className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={handleExport} title="Export trip" aria-label="Export trip">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setEditTripOpen(true)} title="Edit trip" aria-label="Edit trip">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {([
            { value: "places", icon: <List className="h-3.5 w-3.5" />, label: "Places" },
            { value: "map", icon: <MapPin className="h-3.5 w-3.5" />, label: "Map" },
            { value: "itinerary", icon: <Calendar className="h-3.5 w-3.5" />, label: "Itinerary" },
            { value: "packing", icon: <Package className="h-3.5 w-3.5" />, label: "Packing" },
            { value: "settings", icon: <Settings2 className="h-3.5 w-3.5" />, label: "Info" },
          ] as { value: Tab; icon: React.ReactNode; label: string }[]).map(({ value, icon, label }) => (
            <button
              key={value}
              onClick={() => setActiveTripTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap sm:px-4",
                tab === value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {/* PLACES */}
        {tab === "places" && (
          <div className="flex min-h-full flex-col">
            <TripBrief trip={trip} places={places} />
            <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search places…"
                  className="pl-9 h-8 text-sm"
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => { setCapturePrefill(""); setCaptureOpen(true); }} className="px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-2 px-3 py-3 sm:px-4">
              {filteredPlaces.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <MapPin className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">
                    {filters.search ? "No places match your search" : "No places yet — add your first one!"}
                  </p>
                  {!filters.search && (
                    <div className="flex flex-col items-center gap-3">
                      <Button onClick={() => { setCapturePrefill(""); setCaptureOpen(true); }} size="sm">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add a place
                      </Button>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          "Tokyo Station, Tokyo",
                          "35.7148, 139.7967",
                          "https://www.google.com/maps?q=Senso-ji+Temple+Tokyo",
                        ].map((example) => (
                          <button
                            key={example}
                            type="button"
                            onClick={() => openCaptureWithExample(example)}
                            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                          >
                            Try: {example.length > 28 ? `${example.slice(0, 25)}...` : example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      onEdit={setEditPlace}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* MAP */}
        {tab === "map" && (
          <div className="flex min-h-[70vh] flex-col md:flex-row">
            <div className="min-h-[50vh] flex-1 md:min-h-[70vh]">
              <MapView
                places={filteredPlaces}
                className="h-full"
                allowPinDrop
                onPlaceSelect={(p) => setSelectedPlace(p)}
              />
            </div>
            {selectedPlace && (
              <div className="md:w-80 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
                <div className="p-4">
                  <PlaceCard
                    place={selectedPlace}
                    onEdit={setEditPlace}
                    onDelete={setDeleteTarget}
                    selected
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-muted-foreground"
                    onClick={() => setSelectedPlace(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ITINERARY */}
        {tab === "itinerary" && (
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <ItineraryBuilder trip={trip} places={places} />
            {trip.itinerary && trip.itinerary.length > 0 && (
              <div className="mt-6">
                <ItineraryTextExport trip={trip} places={places} days={trip.itinerary} />
              </div>
            )}
          </div>
        )}

        {/* PACKING */}
        {tab === "packing" && (
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <PackingList tripId={trip.id} />
          </div>
        )}

        {/* SETTINGS / INFO */}
        {tab === "settings" && (
          <div className="max-w-xl px-3 py-3 sm:px-4 sm:py-4">
            <TripForm
              trip={trip}
              onSave={() => toast.success("Trip updated")}
            />
          </div>
        )}
      </div>

      {/* Capture dialog */}
      <Dialog open={captureOpen} onOpenChange={(open) => { setCaptureOpen(open); if (!open) setCapturePrefill(""); }}>
        <DialogContent className="overflow-visible sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a place</DialogTitle></DialogHeader>
          <CaptureInbox tripId={trip.id} initialInput={capturePrefill} onClose={() => { setCaptureOpen(false); setCapturePrefill(""); }} />
        </DialogContent>
      </Dialog>

      {/* Edit place dialog */}
      <Dialog open={!!editPlace} onOpenChange={(open) => !open && setEditPlace(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit place</DialogTitle></DialogHeader>
          {editPlace && (
            <PlaceForm
              place={editPlace}
              tripId={trip.id}
              onSave={() => setEditPlace(null)}
              onCancel={() => setEditPlace(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete "{deleteTarget?.title}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This place will be removed permanently.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePlace} className="flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit trip dialog */}
      <Dialog open={editTripOpen} onOpenChange={setEditTripOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit trip</DialogTitle></DialogHeader>
          <TripForm trip={trip} onSave={() => setEditTripOpen(false)} onCancel={() => setEditTripOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Random pick dialog */}
      <Dialog open={!!randomPick} onOpenChange={(open) => !open && setRandomPick(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader><DialogTitle>🎲 Random Pick</DialogTitle></DialogHeader>
          {randomPick && <PlaceCard place={randomPick} />}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleRandom} className="flex-1">Pick another</Button>
            <Button onClick={() => setRandomPick(null)} className="flex-1">Looks good!</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rainy day dialog */}
      <Dialog open={rainyDay !== null} onOpenChange={(open) => !open && setRainyDay(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🌧️ Rainy Day Alternatives</DialogTitle>
          </DialogHeader>
          {rainyDay && rainyDay.length === 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">No indoor places saved yet. Add a museum, cafe, gallery, or bookstore backup near your busiest neighborhood.</p>
              <div className="flex flex-wrap gap-2">
                {["Museum near me", "Cafe near hotel", "Gallery near downtown"].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRainyDay(null);
                      openCaptureWithExample(example);
                    }}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rainyDay?.map((p) => <PlaceCard key={p.id} place={p} compact />)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
