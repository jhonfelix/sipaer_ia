"use client";

import { Check } from "lucide-react";
import { PROJECT_COLORS } from "./constants";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((color) => {
        const active = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          >
            {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
