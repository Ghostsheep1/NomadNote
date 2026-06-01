"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Map, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TripCard } from "@/components/TripCard";
import { TripForm } from "@/components/TripForm";
import { HomeDashboard } from "@/components/HomeDashboard";
import { useTripsStore } from "@/store/trips";
import { resetDemoData } from "@/lib/demo";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { Trip } from "@/lib/types";

export default function HomePage() {
  const { trips, deleteTrip, loadTrips } = useTripsStore();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const router = useRouter();

  const active = trips.filter((t) => !t.archived);
  const archived = trips.filter((t) => t.archived);

  const filtered = (showArchived ? archived : active).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteTrip(deleteTarget.id);
    toast.success("Trip deleted");
    setDeleteTarget(null);
  };

  const handleLoadDemo = async () => {
    await resetDemoData();
    await loadTrips();
    toast.success("Demo trips loaded");
    router.push("/trips?id=demo-tokyo");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 py-4 sm:gap-7 sm:px-6 sm:py-6 lg:px-8">
      <HomeDashboard
        trips={trips}
        onCreateTrip={() => setCreateOpen(true)}
        onImportTrip={() => window.dispatchEvent(new CustomEvent("nomadnote:open-actions"))}
      />

      {/* Toolbar */}
      <div className="atlas-card rounded-md p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trips…"
            className="h-10 bg-muted/60 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-black leading-none">{showArchived ? "Archived trips" : "Active trips"}</h2>
          <p className="atlas-label mt-1">
            {filtered.length} visible · {active.length} active · {archived.length} archived
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border-2 border-foreground bg-muted p-1 sm:flex">
          {[
            { label: `Active`, value: false },
            { label: `Archived`, value: true },
          ].map(({ label, value }) => (
            <button
              key={String(value)}
              onClick={() => setShowArchived(value)}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-extrabold transition-all ${
                showArchived === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Trip grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={setDeleteTarget} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 flex flex-col items-center gap-4"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-foreground bg-accent shadow-[5px_5px_0_hsl(var(--foreground))]">
            <Map className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-display text-3xl font-black">
              {search ? "No trips match your search" : showArchived ? "No archived trips" : "No trips yet"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {!search && !showArchived && "Create your first trip or load the demo to explore"}
            </p>
          </div>
          {!search && !showArchived && (
            <div className="flex gap-3">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> New trip
              </Button>
              <Button variant="outline" onClick={handleLoadDemo}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Load sample trip
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Create trip dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New trip</DialogTitle>
          </DialogHeader>
          <TripForm
            onSave={(trip) => {
              setCreateOpen(false);
              router.push(`/trips?id=${encodeURIComponent(trip.id)}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this trip and all its places. This cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
