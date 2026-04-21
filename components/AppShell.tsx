"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, Settings, Plus, Command, BookOpen, Home,
  ChevronRight, PanelLeftClose, PanelLeft,
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    sidebarOpen, toggleSidebar, captureOpen, openCapture, closeCapture,
    toggleCommandPalette, settings,
  } = useUIStore();
  const { trips, loadTrips } = useTripsStore();

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
        openCapture();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPalette, openCapture]);

  const recentTrips = trips.filter((t) => !t.archived).slice(0, 5);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex-shrink-0 border-r border-border bg-card flex flex-col transition-all duration-200 overflow-hidden",
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
            <Button onClick={openCapture} size="sm" className="w-full justify-start gap-2">
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
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
          <Button size="icon-sm" variant="ghost" onClick={toggleSidebar} className="flex-shrink-0">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>

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

          <Button size="sm" onClick={openCapture} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Capture dialog */}
      <Dialog open={captureOpen} onOpenChange={(open) => !open && closeCapture()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a place</DialogTitle>
          </DialogHeader>
          <CaptureInbox onClose={closeCapture} />
        </DialogContent>
      </Dialog>

      <CommandPalette />
      <Toaster position="bottom-right" richColors closeButton />
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
