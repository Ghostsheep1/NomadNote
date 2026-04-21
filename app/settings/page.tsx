"use client";
import React, { useState } from "react";
import { Shield, Trash2, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/store/ui";
import { useTripsStore } from "@/store/trips";
import { clearAllData } from "@/lib/db";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings } = useUIStore();
  const { loadTrips } = useTripsStore();
  const [clearConfirm, setClearConfirm] = useState(false);

  const setTheme = (value: "light" | "dark" | "system") => {
    updateSettings({ theme: value });
    const root = document.documentElement;
    if (value === "dark") root.classList.add("dark");
    else if (value === "light") root.classList.remove("dark");
    else {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", sys);
    }
  };

  const handleClearData = async () => {
    await clearAllData();
    await loadTrips();
    setClearConfirm(false);
    toast.success("All data cleared.");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Customize NomadNote to your preferences.</p>

      <div className="mb-8 p-5 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-1">Your data never leaves your device</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              NomadNote stores everything in your browser's IndexedDB. No server, no account,
              no sync, no tracking. Export JSON to back up or transfer your data.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="success">No tracking</Badge>
              <Badge variant="success">No analytics</Badge>
              <Badge variant="success">No ads</Badge>
              <Badge variant="success">No server</Badge>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <Label>Theme</Label>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {([
              { value: "light" as const, icon: <Sun className="h-3.5 w-3.5" />, label: "Light" },
              { value: "system" as const, icon: <Monitor className="h-3.5 w-3.5" />, label: "System" },
              { value: "dark" as const, icon: <Moon className="h-3.5 w-3.5" />, label: "Dark" },
            ]).map(({ value, icon, label }) => (
              <button key={value} onClick={() => setTheme(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  settings.theme === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator className="mb-8" />

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">Regional</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Distance unit</Label>
              <p className="text-xs text-muted-foreground">Used in travel time estimates</p>
            </div>
            <Select value={settings.distanceUnit} onValueChange={(v) => updateSettings({ distanceUnit: v as "km" | "mi" })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers</SelectItem>
                <SelectItem value="mi">Miles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Default currency</Label>
            </div>
            <Select value={settings.defaultCurrency} onValueChange={(v) => updateSettings({ defaultCurrency: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","INR","BRL"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator className="mb-8" />

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-1">Data management</h2>
        <p className="text-sm text-muted-foreground mb-4">All data lives in this browser only.</p>
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Clear all data</p>
            <p className="text-xs text-muted-foreground">Permanently delete all trips, places, and settings</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setClearConfirm(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
          </Button>
        </div>
      </section>

      <Separator className="mb-8" />

      <section>
        <h2 className="font-display text-lg font-semibold mb-4">About</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>NomadNote v1.0 · Built with Next.js, Dexie, MapLibre GL</p>
          <p>Map tiles from <a href="https://openfreemap.org" className="underline text-primary" target="_blank" rel="noopener">OpenFreeMap</a> · Geocoding via <a href="https://nominatim.openstreetmap.org" className="underline text-primary" target="_blank" rel="noopener">Nominatim</a></p>
          <p>Free to use. No paid APIs. No account needed.</p>
        </div>
      </section>

      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete everything?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes ALL trips, places, packing lists, and settings. This cannot be undone.
            Export any trips you want to keep first.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setClearConfirm(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleClearData} className="flex-1">Delete everything</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
