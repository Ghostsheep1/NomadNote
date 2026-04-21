"use client";
import { useEffect, useState } from "react";
import { ensureSettings } from "@/lib/db";
import { useTripsStore } from "@/store/trips";
import { useUIStore } from "@/store/ui";
import { Onboarding } from "@/components/Onboarding";

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { loadTrips } = useTripsStore();
  const { onboardingComplete } = useUIStore();

  useEffect(() => {
    const init = async () => {
      await ensureSettings();
      await loadTrips();
      setReady(true);
    };
    init();
  }, []); // eslint-disable-line

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!onboardingComplete && <Onboarding />}
      {children}
    </>
  );
}
