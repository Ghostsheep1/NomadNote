"use client";
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Trip, BudgetStyle, ItineraryMode } from "@/lib/types";
import { TRIP_EMOJIS, randomTripEmoji } from "@/lib/utils";
import { useTripsStore } from "@/store/trips";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name required").max(80),
  description: z.string().max(500).optional(),
  emoji: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetStyle: z.string(),
  itineraryMode: z.string(),
  currency: z.string().max(5).optional(),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

interface TripFormProps {
  trip?: Trip;
  onSave?: (trip: Trip) => void;
  onCancel?: () => void;
}

const BUDGET_STYLES: { value: BudgetStyle; label: string; icon: string }[] = [
  { value: "backpacker", label: "Backpacker", icon: "🎒" },
  { value: "budget", label: "Budget", icon: "💸" },
  { value: "moderate", label: "Moderate", icon: "👜" },
  { value: "comfort", label: "Comfort", icon: "🏨" },
  { value: "luxury", label: "Luxury", icon: "💎" },
];

export function TripForm({ trip, onSave, onCancel }: TripFormProps) {
  const { createTrip, updateTrip } = useTripsStore();
  const [selectedEmoji, setSelectedEmoji] = React.useState(trip?.emoji ?? randomTripEmoji());

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: trip?.name ?? "",
      description: trip?.description ?? "",
      emoji: trip?.emoji ?? selectedEmoji,
      startDate: trip?.startDate ?? "",
      endDate: trip?.endDate ?? "",
      budgetStyle: trip?.budgetStyle ?? "moderate",
      itineraryMode: trip?.itineraryMode ?? "balanced",
      currency: trip?.currency ?? "USD",
      notes: trip?.notes ?? "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      ...data,
      emoji: selectedEmoji,
      budgetStyle: data.budgetStyle as BudgetStyle,
      itineraryMode: data.itineraryMode as ItineraryMode,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    };

    if (trip) {
      await updateTrip(trip.id, payload);
      toast.success("Trip updated");
      onSave?.({ ...trip, ...payload });
    } else {
      const newTrip = await createTrip(payload);
      toast.success("Trip created!");
      onSave?.(newTrip);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Emoji picker */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {TRIP_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setSelectedEmoji(emoji)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                selectedEmoji === emoji
                  ? "bg-primary/20 ring-2 ring-primary"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Trip name *</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Tokyo Dream, Italy Summer" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="What's this trip about?" rows={2} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
        </div>
      </div>

      {/* Budget style */}
      <div className="space-y-1.5">
        <Label>Budget style</Label>
        <Controller name="budgetStyle" control={control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUDGET_STYLES.map(({ value, label, icon }) => (
                <SelectItem key={value} value={value}>
                  {icon} {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )} />
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" {...register("currency")} placeholder="USD" maxLength={5} className="uppercase" />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Trip notes</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Visa info, reminders, packing notes…" rows={2} />
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>}
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Saving…" : trip ? "Update Trip" : "Create Trip"}
        </Button>
      </div>
    </form>
  );
}
