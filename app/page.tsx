"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload, Map, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TripCard } from "@/components/TripCard";
import { TripForm } from "@/components/TripForm";
import { HomeDashboard } from "@/components/HomeDashboard";
import { useTripsStore } from "@/store/trips";
import { importTrip } from "@/lib/db";
import { readFileAsText } from "@/lib/utils";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { Trip } from "@/lib/types";

export default function HomePage() {
  const { trips, deleteTrip, loadTrips } = useTripsStore();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const active = trips.filter((t) => !t.archived);
  const archived = trips.filter((t) => t.archived);

  const filtered = (showArchived ? archived : active).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const bundle = JSON.parse(text);
      const trip = await importTrip(bundle);
      await loadTrips();
      toast.success(`"${trip.name}" imported!`);
      router.push(`/trips?id=${encodeURIComponent(trip.id)}`);
    } catch {
      toast.error("Import failed — invalid file format");
    }
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteTrip(deleteTarget.id);
    toast.success("Trip deleted");
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
      <HomeDashboard
        trips={trips}
        onCreateTrip={() => setCreateOpen(true)}
        onImportTrip={() => fileRef.current?.click()}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trips…"
            className="h-10 border-transparent bg-muted/60 pl-9 shadow-none focus-visible:bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            title="Import trip JSON"
            className="flex-1 sm:flex-none"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1.5" /> New trip
          </Button>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{showArchived ? "Archived trips" : "Active trips"}</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} visible · {active.length} active · {archived.length} archived
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {[
            { label: `Active`, value: false },
            { label: `Archived`, value: true },
          ].map(({ label, value }) => (
            <button
              key={String(value)}
              onClick={() => setShowArchived(value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                showArchived === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <Map className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">
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
