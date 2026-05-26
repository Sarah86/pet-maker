"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type CatCategory = "body" | "eyes" | "nose" | "tail";
type Variant = 1 | 2 | 3 | 4 | 5;

interface PartSelectorProps {
  category: CatCategory;
  label: string;
  selected: Variant;
  onSelect: (variant: Variant) => void;
  variants: readonly Variant[];
}

export function PartSelector({
  category,
  label,
  selected,
  onSelect,
  variants,
}: PartSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="flex gap-2">
        {variants.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={selected === v}
            onClick={() => onSelect(v)}
            className={cn(
              "relative h-16 w-16 rounded-lg border-2 overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected === v
                ? "border-primary"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <Image
              src={`/cat-parts/${category}/${category}_${v}.png`}
              alt={`${label} ${v}`}
              fill
              className="object-contain p-1"
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
