"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings, Plus, Command, Home, Search, Upload, Sparkles,
  PanelLeftClose, PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/ui";
import { useTripsStore } from "@/store/trips";
import { CommandPalette } from "@/components/CommandPalette";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaptureInbox } from "@/components/CaptureInbox";
import { Toaster } from "sonner";
import { APP_VERSION } from "@/lib/version";
import { TripForm } from "@/components/TripForm";
import { EXPORT_SCHEMA_VERSION, importTrip, validateImportBundle } from "@/lib/db";
import { readFileAsText } from "@/lib/utils";
import { toast } from "sonner";
import type { ExportBundle, Trip } from "@/lib/types";

type ImportPreview = {
  fileName: string;
  bundle: ExportBundle;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarOpen, toggleSidebar, captureOpen, closeCapture,
    toggleCommandPalette, settings,
  } = useUIStore();
  const { trips, activeTrip, loadTrips } = useTripsStore();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [captureTripId, setCaptureTripId] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else if (settings.theme === "light") root.classList.remove("dark");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings.theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openActions();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPalette]);

  useEffect(() => {
    const handler = () => openActions();
    window.addEventListener("nomadnote:open-actions", handler);
    return () => window.removeEventListener("nomadnote:open-actions", handler);
  }, [activeTrip?.id, trips.length]);

  const recentTrips = trips.filter((t) => !t.archived).slice(0, 5);
  const activeTrips = trips.filter((t) => !t.archived);

  const openActions = () => setActionsOpen(true);

  const openCaptureForTrip = (tripId: string) => {
    setCaptureTripId(tripId);
    setActionsOpen(false);
    setTripPickerOpen(false);
    useUIStore.getState().openCapture();
  };

  const handleAddPlace = () => {
    if (activeTrip?.id && pathname === "/trips") openCaptureForTrip(activeTrip.id);
    else setTripPickerOpen(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await previewImportFile(file);
    e.target.value = "";
  };

  const previewImportFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const result = validateImportBundle(parsed);
      if (!result.valid) {
        setImportPreview(null);
        setImportError(result.reason);
        return;
      }
      setImportPreview({ fileName: file.name, bundle: result.bundle });
      setImportError(null);
    } catch {
      setImportPreview(null);
      setImportError("Import failed: invalid JSON file.");
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const trip = await importTrip(importPreview.bundle);
      await loadTrips();
      toast.success(`"${trip.name}" imported as a local copy`);
      router.push(`/trips?id=${encodeURIComponent(trip.id)}`);
      setActionsOpen(false);
      setImportOpen(false);
      setImportPreview(null);
      setImportError(null);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "sticky top-0 hidden h-screen flex-shrink-0 border-r border-border bg-card transition-all duration-200 overflow-hidden md:flex md:flex-col",
        sidebarOpen ? "w-60" : "w-0 md:w-14"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0", !sidebarOpen && "md:justify-center md:px-0")}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground text-sm font-bold">N</span>
              </div>
              <span className="font-display font-semibold text-base truncate">NomadNote</span>
            </Link>
          )}
          {!sidebarOpen && (
            <Link href="/" className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center hidden md:flex">
              <span className="text-primary-foreground text-xs font-bold">N</span>
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-hidden">
          <SidebarLink href="/" icon={<Home />} label="Trips" open={sidebarOpen} active={pathname === "/"} />
          <SidebarLink href="/settings" icon={<Settings />} label="Settings" open={sidebarOpen} active={pathname === "/settings"} />

          {sidebarOpen && recentTrips.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recent trips
              </p>
              {recentTrips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips?id=${encodeURIComponent(trip.id)}`}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors",
                    pathname === "/trips"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="text-base flex-shrink-0">{trip.emoji ?? "✈️"}</span>
                  <span className="truncate">{trip.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Quick add + command palette */}
        {sidebarOpen && (
          <div className="p-3 border-t border-border flex flex-col gap-2">
            <Button onClick={openActions} size="sm" className="w-full justify-start gap-2">
              <Plus className="h-3.5 w-3.5" /> Add Place
            </Button>
            <Button
              onClick={toggleCommandPalette}
              variant="outline"
              size="sm"
              className="w-full justify-between text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <Command className="h-3.5 w-3.5" /> Command
              </span>
              <kbd className="text-xs font-mono bg-muted px-1 rounded">⌘K</kbd>
            </Button>
            <p className="px-1 pt-1 text-[11px] leading-4 text-muted-foreground">
              v{APP_VERSION} · Designed by Henrique Ribeiro
            </p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0">
          <Button size="icon-sm" variant="ghost" onClick={toggleSidebar} className="hidden flex-shrink-0 md:inline-flex">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>

          <Link href="/" className="flex items-center gap-2 min-w-0 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-bold">N</span>
            </div>
            <span className="font-display text-lg font-semibold truncate">NomadNote</span>
          </Link>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCommandPalette}
            className="hidden md:flex items-center gap-2 text-muted-foreground text-sm border border-border rounded-lg px-3 py-1.5 hover:bg-muted"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-2 text-xs font-mono bg-muted px-1.5 rounded">⌘K</kbd>
          </Button>

          <Button size="icon-sm" variant="ghost" onClick={toggleCommandPalette} className="md:hidden flex-shrink-0">
            <Search className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={openActions} className="flex-shrink-0 px-2 sm:px-3" aria-label="Open quick actions">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="min-h-0 flex-1 pb-[76px] md:pb-0">
          {children}
        </main>
      </div>

      {/* Capture dialog */}
      <Dialog open={captureOpen} onOpenChange={(open) => !open && closeCapture()}>
        <DialogContent className="overflow-visible sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a place</DialogTitle>
          </DialogHeader>
          <CaptureInbox tripId={captureTripId} onClose={closeCapture} />
        </DialogContent>
      </Dialog>

      <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick action</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <ActionButton icon={<Plus />} label="Add place" description="Choose a trip, then paste links or notes." onClick={handleAddPlace} />
            <ActionButton icon={<Sparkles />} label="New trip" description="Start a fresh private travel workspace." onClick={() => { setActionsOpen(false); setCreateTripOpen(true); }} />
            <ActionButton icon={<Upload />} label="Import JSON" description="Preview a local export before merging." onClick={() => { setActionsOpen(false); setImportOpen(true); }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportPreview(null); setImportError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import NomadNote JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Imports are private and local-only. NomadNote expects schema version {EXPORT_SCHEMA_VERSION} and creates a new local copy of the trip instead of overwriting existing trips.
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void previewImportFile(event.dataTransfer.files[0]);
              }}
              className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <Upload className="mb-2 h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Drag & drop JSON here</span>
              <span className="text-xs text-muted-foreground">or choose file to preview before merging</span>
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
            {importError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{importError}</p>}
            {importPreview && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ready to import</p>
                <p className="mt-1 text-sm font-semibold">{importPreview.bundle.trip.emoji ?? "✈️"} {importPreview.bundle.trip.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{importPreview.fileName}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <ImportStat label="Places" value={importPreview.bundle.places.length} />
                  <ImportStat label="Lists" value={importPreview.bundle.collections.length} />
                  <ImportStat label="Packing" value={importPreview.bundle.packingItems.length} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmImport} disabled={!importPreview || importing}>
                {importing ? "Importing..." : "Import local copy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createTripOpen} onOpenChange={setCreateTripOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New trip</DialogTitle>
          </DialogHeader>
          <TripForm
            onSave={(trip: Trip) => {
              setCreateTripOpen(false);
              router.push(`/trips?id=${encodeURIComponent(trip.id)}`);
            }}
            onCancel={() => setCreateTripOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={tripPickerOpen} onOpenChange={setTripPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a trip</DialogTitle>
          </DialogHeader>
          {activeTrips.length > 0 ? (
            <div className="grid gap-2">
              {activeTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => openCaptureForTrip(trip.id)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="text-xl">{trip.emoji ?? "✈️"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{trip.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{trip.description ?? "Add a place to this trip"}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Create a trip before adding places.
              <Button className="mt-3 w-full" onClick={() => { setTripPickerOpen(false); setCreateTripOpen(true); }}>
                <Sparkles className="mr-2 h-4 w-4" /> New trip
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CommandPalette />
      <Toaster position="bottom-right" richColors closeButton />
      <MobileNav pathname={pathname} openActions={openActions} activeTrip={activeTrip} />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2">
      <div className="font-bold tabular-nums">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function SidebarLink({ href, icon, label, open, active }: {
  href: string; icon: React.ReactNode; label: string; open: boolean; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors",
        active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        !open && "md:justify-center md:px-0"
      )}
    >
      <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {open && <span className="truncate">{label}</span>}
    </Link>
  );
}

function MobileNav({
  pathname,
  openActions,
  activeTrip,
}: {
  pathname: string;
  openActions: () => void;
  activeTrip?: Trip | null;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        <MobileNavLink href="/" active={pathname === "/"} icon={<Home className="h-4 w-4" />} label="Trips" />
        <MobileNavLink
          href={activeTrip ? `/trips?id=${encodeURIComponent(activeTrip.id)}` : "/"}
          active={pathname === "/trips"}
          icon={<Sparkles className="h-4 w-4" />}
          label="Radar"
        />
        <button
          onClick={openActions}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
        <MobileNavLink href="/settings" active={pathname === "/settings"} icon={<Settings className="h-4 w-4" />} label="Settings" />
      </div>
    </nav>
  );
}

function MobileNavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-semibold transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
