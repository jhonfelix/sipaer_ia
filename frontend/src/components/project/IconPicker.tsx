"use client";

import { PROJECT_ICONS } from "./constants";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  color: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, color, onChange }: Props) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {Object.entries(PROJECT_ICONS).map(([name, Icon]) => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center border transition-all",
              active
                ? "border-transparent"
                : "border-border/60 hover:bg-muted/40 text-muted-foreground/70"
            )}
            style={active ? { backgroundColor: `${color}22`, color } : undefined}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
