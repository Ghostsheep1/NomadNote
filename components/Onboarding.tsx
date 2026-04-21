"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Lock, Zap, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui";
import { seedDemoData } from "@/lib/demo";
import { useTripsStore } from "@/store/trips";
import { toast } from "sonner";

const STEPS = [
  {
    icon: "✈️",
    title: "Plan trips the smart way",
    description: "Paste any link — TikTok, Instagram, Google Maps, blogs — and NomadNote extracts the place for you. Or type it manually. Your call.",
    highlight: "Works with any link or text",
  },
  {
    icon: "🗺️",
    title: "See everything on one map",
    description: "All your saved places visualized. Cluster by neighborhood. Filter by category, price, or vibe. Plan your route visually.",
    highlight: "No paid map API needed",
  },
  {
    icon: "🔒",
    title: "Your data stays with you",
    description: "Everything is stored locally in your browser. No account. No email. No tracking. Export or import JSON anytime.",
    highlight: "100% private & offline-capable",
  },
  {
    icon: "🪄",
    title: "Build smart itineraries",
    description: "The auto-builder groups nearby places, respects time-of-day, and minimizes backtracking. Drag to reorder, lock favorites.",
    highlight: "Algorithm explains every decision",
  },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const { completeOnboarding, openCapture } = useUIStore();
  const { loadTrips } = useTripsStore();

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleLoadDemo = async () => {
    await seedDemoData();
    await loadTrips();
    completeOnboarding();
    toast.success("Demo trips loaded! Explore Tokyo & Lisbon 🗺️");
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleStart = () => {
    completeOnboarding();
    openCapture();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center text-center gap-6"
          >
            {/* Step indicator */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
              <span className="text-5xl">{current.icon}</span>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold">{current.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{current.description}</p>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {current.highlight}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-10 flex flex-col gap-3">
          {!isLast ? (
            <Button onClick={() => setStep((s) => s + 1)} size="lg" className="w-full">
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button onClick={handleLoadDemo} size="lg" className="w-full" variant="default">
                <Sparkles className="h-4 w-4 mr-2" />
                Load demo trips
              </Button>
              <Button onClick={handleStart} size="lg" className="w-full" variant="outline">
                Start fresh
              </Button>
            </>
          )}
          <Button onClick={handleSkip} variant="ghost" size="sm" className="text-muted-foreground">
            {isLast ? "Skip" : "Skip intro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
