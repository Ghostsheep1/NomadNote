"use client";
import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Map, Plus, Settings, Search, Wand2, Download, Moon, Sun,
  Archive, Globe, Star, Package, Trash2, Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { useTripsStore } from "@/store/trips";
import { usePlacesStore } from "@/store/places";
import { downloadJSON } from "@/lib/utils";
import { exportTrip } from "@/lib/db";
import { toast } from "sonner";

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette, updateSettings, settings } = useUIStore();
  const { trips, activeTrip } = useTripsStore();
  const { places, setSelectedPlace } = usePlacesStore();
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, toggleCommandPalette]);

  const run = useCallback((fn: () => void) => {
    toggleCommandPalette();
    fn();
  }, [toggleCommandPalette]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={toggleCommandPalette} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide">
          <div className="flex items-center border-b border-border px-4 py-3 gap-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Search places, trips, commands…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:block px-1.5 py-0.5 text-xs font-mono bg-muted rounded text-muted-foreground">ESC</kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation">
              <CmdItem icon={<Map />} onSelect={() => run(() => router.push("/"))}>
                Home — All trips
              </CmdItem>
              <CmdItem icon={<Settings />} onSelect={() => run(() => router.push("/settings"))}>
                Settings & Privacy
              </CmdItem>
            </Command.Group>

            {/* Quick actions */}
            <Command.Group heading="Actions">
              <CmdItem icon={<Plus />} onSelect={() => run(() => useUIStore.getState().openCapture())}>
                Add a place
              </CmdItem>
              <CmdItem
                icon={settings.theme === "dark" ? <Sun /> : <Moon />}
                onSelect={() => run(() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" }))}
              >
                Toggle {settings.theme === "dark" ? "light" : "dark"} mode
              </CmdItem>
            </Command.Group>

            {/* Trips */}
            {trips.length > 0 && (
              <Command.Group heading="Trips">
                {trips.slice(0, 6).map((trip) => (
                  <CmdItem
                    key={trip.id}
                    icon={<span className="text-sm">{trip.emoji}</span>}
                    onSelect={() => run(() => router.push(`/trips/${trip.id}`))}
                  >
                    {trip.name}
                    {trip.startDate && <span className="text-muted-foreground text-xs ml-auto">{trip.startDate.slice(0, 7)}</span>}
                  </CmdItem>
                ))}
              </Command.Group>
            )}

            {/* Places in active trip */}
            {activeTrip && places.length > 0 && (
              <Command.Group heading={`Places in ${activeTrip.name}`}>
                {places.slice(0, 8).map((place) => (
                  <CmdItem
                    key={place.id}
                    icon={<Globe className="h-3.5 w-3.5" />}
                    onSelect={() => run(() => {
                      router.push(`/trips/${activeTrip.id}`);
                      setTimeout(() => setSelectedPlace(place.id), 100);
                    })}
                  >
                    {place.title}
                    {place.city && <span className="text-muted-foreground text-xs ml-auto">{place.city}</span>}
                  </CmdItem>
                ))}
              </Command.Group>
            )}

            {/* Export */}
            {activeTrip && (
              <Command.Group heading="Export">
                <CmdItem
                  icon={<Download />}
                  onSelect={() => run(async () => {
                    const bundle = await exportTrip(activeTrip.id);
                    downloadJSON(bundle, `${activeTrip.name}.json`);
                    toast.success("Exported!");
                  })}
                >
                  Export current trip as JSON
                </CmdItem>
              </Command.Group>
            )}
          </Command.List>

          <div className="border-t border-border px-4 py-2 flex gap-4 text-xs text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">⌘K</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function CmdItem({ icon, onSelect, children }: {
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-foreground aria-selected:bg-muted transition-colors"
    >
      <span className="text-muted-foreground flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="flex-1 flex items-center gap-2">{children}</span>
    </Command.Item>
  );
}
