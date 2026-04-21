"use client";
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Clock, Tag, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/utils";
import type { Place, PlaceCategory, PriceLevel, TimeOfDay, IndoorOutdoor, Priority } from "@/lib/types";
import { usePlacesStore } from "@/store/places";
import { toast } from "sonner";
import { geocodeQuery } from "@/features/capture/extractors";

const schema = z.object({
  title: z.string().min(1, "Title required").max(120),
  notes: z.string().max(2000).optional(),
  category: z.string(),
  priceLevel: z.string(),
  priority: z.coerce.number().min(1).max(5),
  estimatedDurationMinutes: z.coerce.number().min(5).max(1440),
  bestTimeOfDay: z.string(),
  indoorOutdoor: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().optional().or(z.literal("")),
  longitude: z.coerce.number().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  isFree: z.boolean().optional(),
  isChildFriendly: z.boolean().optional(),
  isSoloFriendly: z.boolean().optional(),
  isDateNight: z.boolean().optional(),
  tagsRaw: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PlaceFormProps {
  place?: Place;
  tripId?: string;
  initialData?: Partial<Place>;
  onSave?: (place: Place) => void;
  onCancel?: () => void;
}

const CATEGORIES: PlaceCategory[] = [
  "restaurant","cafe","bar","accommodation","attraction","museum",
  "park","shopping","transport","viewpoint","beach","nightlife",
  "market","street","religious","nature","entertainment","health","other",
];

const PRICE_LEVELS: PriceLevel[] = ["free","budget","moderate","expensive","luxury"];
const TIMES: TimeOfDay[] = ["morning","afternoon","evening","night","anytime"];
const INDOOR_OUTDOOR: IndoorOutdoor[] = ["indoor","outdoor","both"];

export function PlaceForm({ place, tripId, initialData, onSave, onCancel }: PlaceFormProps) {
  const { createPlace, updatePlace } = usePlacesStore();
  const [geocoding, setGeocoding] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");

  const defaultValues: Partial<FormData> = {
    title: place?.title ?? initialData?.title ?? "",
    notes: place?.notes ?? initialData?.notes ?? "",
    category: place?.category ?? initialData?.category ?? "other",
    priceLevel: place?.priceLevel ?? initialData?.priceLevel ?? "moderate",
    priority: place?.priority ?? initialData?.priority ?? 3,
    estimatedDurationMinutes: place?.estimatedDurationMinutes ?? initialData?.estimatedDurationMinutes ?? 60,
    bestTimeOfDay: place?.bestTimeOfDay ?? initialData?.bestTimeOfDay ?? "anytime",
    indoorOutdoor: place?.indoorOutdoor ?? initialData?.indoorOutdoor ?? "both",
    city: place?.city ?? initialData?.city ?? "",
    country: place?.country ?? initialData?.country ?? "",
    neighborhood: place?.neighborhood ?? initialData?.neighborhood ?? "",
    address: place?.address ?? initialData?.address ?? "",
    latitude: place?.latitude ?? initialData?.latitude ?? "",
    longitude: place?.longitude ?? initialData?.longitude ?? "",
    sourceUrl: place?.sourceUrl ?? initialData?.sourceUrl ?? "",
    isFree: place?.isFree ?? initialData?.isFree ?? false,
    isChildFriendly: place?.isChildFriendly ?? false,
    isSoloFriendly: place?.isSoloFriendly ?? false,
    isDateNight: place?.isDateNight ?? false,
    tagsRaw: (place?.tags ?? initialData?.tags ?? []).join(", "),
  };

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const titleValue = watch("title");

  const handleGeocode = async () => {
    if (!titleValue) return;
    setGeocoding(true);
    const results = await geocodeQuery(titleValue);
    if (results.length) {
      setValue("latitude", results[0].lat);
      setValue("longitude", results[0].lng);
      if (results[0].city) setValue("city", results[0].city);
      if (results[0].country) setValue("country", results[0].country);
      if (results[0].neighborhood) setValue("neighborhood", results[0].neighborhood);
      toast.success("Location found!");
    } else {
      toast.error("Couldn't find location — try a more specific name");
    }
    setGeocoding(false);
  };

  const onSubmit = handleSubmit(async (data) => {
    const tags = (data.tagsRaw ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const placeData: Partial<Place> = {
      title: data.title,
      notes: data.notes ?? "",
      category: data.category as PlaceCategory,
      priceLevel: data.priceLevel as PriceLevel,
      priority: data.priority as Priority,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      bestTimeOfDay: data.bestTimeOfDay as TimeOfDay,
      indoorOutdoor: data.indoorOutdoor as IndoorOutdoor,
      city: data.city || undefined,
      country: data.country || undefined,
      neighborhood: data.neighborhood || undefined,
      address: data.address || undefined,
      latitude: data.latitude !== "" ? Number(data.latitude) : undefined,
      longitude: data.longitude !== "" ? Number(data.longitude) : undefined,
      sourceUrl: data.sourceUrl || undefined,
      isFree: data.isFree ?? (data.priceLevel === "free"),
      isChildFriendly: data.isChildFriendly,
      isSoloFriendly: data.isSoloFriendly,
      isDateNight: data.isDateNight,
      tags,
    };

    if (place) {
      await updatePlace(place.id, placeData);
      toast.success("Place updated");
      onSave?.({ ...place, ...placeData } as Place);
    } else {
      const newPlace = await createPlace(placeData, tripId);
      toast.success("Place saved");
      onSave?.(newPlace);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Place name *</Label>
        <div className="flex gap-2">
          <Input id="title" {...register("title")} placeholder="e.g. Senso-ji Temple" className="flex-1" />
          <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding}>
            <MapPin className="h-3.5 w-3.5 mr-1" />
            {geocoding ? "…" : "Find"}
          </Button>
        </div>
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Category + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Controller name="priority" control={control} render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">⭐ Must See</SelectItem>
                <SelectItem value="2">🔥 High</SelectItem>
                <SelectItem value="3">📌 Medium</SelectItem>
                <SelectItem value="4">💭 Low</SelectItem>
                <SelectItem value="5">🤷 If Time</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      {/* Price + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Price</Label>
          <Controller name="priceLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICE_LEVELS.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input id="duration" type="number" min={5} max={1440} step={15} {...register("estimatedDurationMinutes")} />
        </div>
      </div>

      {/* Best time + Indoor/Outdoor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Best Time</Label>
          <Controller name="bestTimeOfDay" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label>Setting</Label>
          <Controller name="indoorOutdoor" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDOOR_OUTDOOR.map((i) => (
                  <SelectItem key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      {/* Location fields */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="City" {...register("city")} />
          <Input placeholder="Country" {...register("country")} />
        </div>
        <Input placeholder="Neighborhood / district" {...register("neighborhood")} />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Latitude" {...register("latitude")} />
          <Input placeholder="Longitude" {...register("longitude")} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Tips, hours, reservation info, what to order…" rows={3} />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" {...register("tagsRaw")} placeholder="must-see, breakfast, rooftop (comma separated)" />
      </div>

      {/* Flags */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Flags</Label>
        {[
          { name: "isChildFriendly" as const, label: "👶 Child-friendly" },
          { name: "isSoloFriendly" as const, label: "🎒 Solo-friendly" },
          { name: "isDateNight" as const, label: "💑 Date night" },
          { name: "isFree" as const, label: "🆓 Free entry" },
        ].map(({ name, label }) => (
          <div key={name} className="flex items-center justify-between">
            <Label className="font-normal text-sm cursor-pointer" htmlFor={name}>{label}</Label>
            <Controller name={name} control={control} render={({ field }) => (
              <Switch id={name} checked={field.value ?? false} onCheckedChange={field.onChange} />
            )} />
          </div>
        ))}
      </div>

      {/* Source URL */}
      <div className="space-y-1.5">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input id="sourceUrl" {...register("sourceUrl")} placeholder="https://…" />
        {errors.sourceUrl && <p className="text-xs text-destructive">Invalid URL</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Saving…" : place ? "Update Place" : "Save Place"}
        </Button>
      </div>
    </form>
  );
}
