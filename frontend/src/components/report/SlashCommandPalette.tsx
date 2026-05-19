"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { SlashCommandItem, SlashMenuState } from "./extensions/SlashCommand";

interface SlashCommandPaletteProps {
  menu: SlashMenuState | null;
  onSelect: (item: SlashCommandItem) => void;
  onIndexChange: (index: number) => void;
}

export function SlashCommandPalette({ menu, onSelect, onIndexChange }: SlashCommandPaletteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu?.clientRect || !ref.current) return;
    const rect = menu.clientRect();
    if (!rect) return;
    const el = ref.current;
    const menuHeight = el.offsetHeight || 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    el.style.top =
      spaceBelow < menuHeight && rect.top > menuHeight
        ? `${rect.top + window.scrollY - menuHeight - 8}px`
        : `${rect.bottom + window.scrollY + 8}px`;
    const spaceRight = window.innerWidth - rect.left;
    el.style.left =
      spaceRight < 256
        ? `${rect.right + window.scrollX - 256}px`
        : `${rect.left + window.scrollX}px`;
  });

  if (!menu || menu.items.length === 0) return null;

  // Group items by category, preserving order
  const grouped: { category: string; items: { item: SlashCommandItem; globalIndex: number }[] }[] = [];
  const catMap = new Map<string, number>();
  menu.items.forEach((item, i) => {
    const cat = item.category;
    if (!catMap.has(cat)) {
      catMap.set(cat, grouped.length);
      grouped.push({ category: cat, items: [] });
    }
    grouped[catMap.get(cat)!].items.push({ item, globalIndex: i });
  });

  return createPortal(
    <div ref={ref} className="slash-palette" style={{ position: "absolute", zIndex: 9999 }}>
      {grouped.map(({ category, items }) => (
        <div key={category}>
          <p className="slash-palette-label">{category}</p>
          {items.map(({ item, globalIndex }) => (
            <button
              key={item.title}
              className={cn(
                "slash-palette-item",
                globalIndex === menu.selectedIndex && "slash-palette-item--active"
              )}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onIndexChange(globalIndex)}
            >
              <span className={cn("slash-palette-icon", item.category === "IA" && "slash-palette-icon--ai")}>
                {item.icon}
              </span>
              <div className="slash-palette-text">
                <span className="slash-palette-title">{item.title}</span>
                <span className="slash-palette-desc">{item.description}</span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
