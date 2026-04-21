"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Archive, Upload, Sparkles, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TripCard } from "@/components/TripCard";
import { TripForm } from "@/components/TripForm";
import { useTripsStore } from "@/store/trips";
import { importTrip, db } from "@/lib/db";
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
      router.push(`/trips/${trip.id}`);
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Your trips</h1>
        <p className="text-muted-foreground">
          {active.length} active trip{active.length !== 1 ? "s" : ""} · All data stored locally
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trips…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileRef.current?.click()}
          title="Import trip JSON"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New trip
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* Tabs: active / archived */}
      <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
        {[
          { label: `Active (${active.length})`, value: false },
          { label: `Archived (${archived.length})`, value: true },
        ].map(({ label, value }) => (
          <button
            key={String(value)}
            onClick={() => setShowArchived(value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              showArchived === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Trip grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4">
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
              router.push(`/trips/${trip.id}`);
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
