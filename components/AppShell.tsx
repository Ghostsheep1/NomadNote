"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings, Plus, Command, Home, Search,
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
        "hidden flex-shrink-0 border-r border-border bg-card transition-all duration-200 overflow-hidden md:flex md:flex-col",
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
            <p className="px-1 pt-1 text-[11px] leading-4 text-muted-foreground">
              v{APP_VERSION} · Designed by Henrique Ribeiro
            </p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

          <Button size="sm" onClick={openCapture} className="flex-shrink-0 px-2 sm:px-3">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-[76px] md:pb-0">
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
      <MobileNav pathname={pathname} openCapture={openCapture} />
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
  openCapture,
}: {
  pathname: string;
  openCapture: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
        <MobileNavLink href="/" active={pathname === "/"} icon={<Home className="h-4 w-4" />} label="Trips" />
        <button
          onClick={openCapture}
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
