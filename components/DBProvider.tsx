"use client";
import { useEffect, useState } from "react";
import { ensureSettings } from "@/lib/db";
import { useTripsStore } from "@/store/trips";
import { useUIStore } from "@/store/ui";
import { Onboarding } from "@/components/Onboarding";
import { BrandMark } from "@/components/BrandMark";

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
        <div className="flex flex-col items-center gap-4">
          <BrandMark />
          <p className="atlas-label animate-pulse">Opening field atlas…</p>
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
