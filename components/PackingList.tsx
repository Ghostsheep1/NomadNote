"use client";
import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Check, Package, ChevronDown } from "lucide-react";
import { db, packingRepo } from "@/lib/db";
import { id as genId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PackingItem } from "@/lib/types";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

const DEFAULT_CATEGORIES = [
  "Documents", "Tech", "Clothing", "Toiletries", "Health",
  "Money", "Snacks", "Entertainment", "Misc",
];

const TEMPLATES: Record<string, Omit<PackingItem, "id" | "tripId">[]> = {
  "Documents": [
    { category: "Documents", name: "Passport", quantity: 1, packed: false },
    { category: "Documents", name: "Travel insurance", quantity: 1, packed: false },
    { category: "Documents", name: "Visa printouts", quantity: 1, packed: false },
    { category: "Documents", name: "Booking confirmations", quantity: 1, packed: false },
  ],
  "Tech": [
    { category: "Tech", name: "Phone + charger", quantity: 1, packed: false },
    { category: "Tech", name: "Power bank", quantity: 1, packed: false },
    { category: "Tech", name: "Universal adapter", quantity: 1, packed: false },
    { category: "Tech", name: "Headphones", quantity: 1, packed: false },
    { category: "Tech", name: "Camera", quantity: 1, packed: false },
  ],
  "Clothing": [
    { category: "Clothing", name: "Comfortable walking shoes", quantity: 1, packed: false },
    { category: "Clothing", name: "Light rain jacket", quantity: 1, packed: false },
    { category: "Clothing", name: "Sunglasses", quantity: 1, packed: false },
  ],
};

interface PackingListProps {
  tripId: string;
}

export function PackingList({ tripId }: PackingListProps) {
  const items = useLiveQuery(
    () => db.packingItems.where("tripId").equals(tripId).toArray(),
    [tripId]
  ) ?? [];

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Misc");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(DEFAULT_CATEGORIES));

  const grouped = DEFAULT_CATEGORIES.reduce<Record<string, PackingItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  // Also include custom categories
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    if (!grouped[item.category].includes(item)) grouped[item.category].push(item);
  });

  const packed = items.filter((i) => i.packed).length;
  const total = items.length;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await packingRepo.create({
      id: genId(),
      tripId,
      category: newCategory,
      name: newName.trim(),
      quantity: 1,
      packed: false,
    });
    setNewName("");
  };

  const handleToggle = async (item: PackingItem) => {
    await packingRepo.update(item.id, { packed: !item.packed });
  };

  const handleDelete = async (id: string) => {
    await packingRepo.delete(id);
  };

  const loadTemplate = async (category: string) => {
    const template = TEMPLATES[category];
    if (!template) return;
    const toAdd = template.filter((t) => !items.some((i) => i.name === t.name));
    if (!toAdd.length) { toast.info("Template items already added"); return; }
    await packingRepo.bulkCreate(toAdd.map((t) => ({ ...t, id: genId(), tripId })));
    toast.success(`${toAdd.length} items added from template`);
  };

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      {total > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium">{packed} / {total} packed</span>
              <span className="text-muted-foreground">{total > 0 ? Math.round((packed / total) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${total > 0 ? (packed / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add item */}
      <div className="flex gap-2">
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input
          placeholder="Item name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Template quick-add buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Quick add:</span>
        {Object.keys(TEMPLATES).map((cat) => (
          <button
            key={cat}
            onClick={() => loadTemplate(cat)}
            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            + {cat}
          </button>
        ))}
      </div>

      {/* Category groups */}
      {Object.entries(grouped).map(([cat, catItems]) => {
        if (catItems.length === 0) return null;
        const packedCount = catItems.filter((i) => i.packed).length;
        return (
          <div key={cat} className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between p-3 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{cat}</span>
                <span className="text-xs text-muted-foreground">{packedCount}/{catItems.length}</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedCats.has(cat) && "rotate-180")} />
            </button>

            <AnimatePresence>
              {expandedCats.has(cat) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-border border-t border-border">
                    {catItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 group">
                        <button
                          onClick={() => handleToggle(item)}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0",
                            item.packed
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input hover:border-primary"
                          )}
                        >
                          {item.packed && <Check className="h-3 w-3" />}
                        </button>
                        <span className={cn("text-sm flex-1", item.packed && "line-through text-muted-foreground")}>
                          {item.name}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {total === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Add items or use the quick-add buttons above
        </div>
      )}
    </div>
  );
}
