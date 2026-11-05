"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { skills as skillsApi } from "@/lib/api";
import type { Skill } from "@/lib/api";
import { MAX_SELECTED_SKILLS } from "./SkillPicker";

/**
 * Estado das skills num campo de mensagem (usado pelo /chat e pela /da):
 * skills disponíveis, selecionadas, atalho "/" e "/identificador mensagem".
 */
export function useChatSkills(opts?: { preselectFromUrl?: boolean }) {
  const [available, setAvailable] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const preselect = opts?.preselectFromUrl ?? false;

  useEffect(() => {
    skillsApi
      .list()
      .then((list) => {
        const usable = list.filter((s) => s.isActive && s.canUse);
        setAvailable(usable);
        if (preselect) {
          const pre = new URLSearchParams(window.location.search).get("skill");
          const found = pre ? usable.find((s) => s.name === pre) : undefined;
          if (found) setSelected([found]);
        }
      })
      .catch(() => {});
  }, [preselect]);

  function add(skill: Skill) {
    setSelected((prev) =>
      prev.some((s) => s.id === skill.id) || prev.length >= MAX_SELECTED_SKILLS ? prev : [...prev, skill]
    );
  }

  function toggle(skill: Skill) {
    setSelected((prev) =>
      prev.some((s) => s.id === skill.id)
        ? prev.filter((s) => s.id !== skill.id)
        : prev.length >= MAX_SELECTED_SKILLS
          ? prev
          : [...prev, skill]
    );
  }

  function remove(skill: Skill) {
    setSelected((prev) => prev.filter((s) => s.id !== skill.id));
  }

  /** Sugestões do atalho "/" — ativo enquanto o campo contém só "/<prefixo>". */
  function slashMatches(input: string): Skill[] {
    const q = /^\/([a-z0-9-]*)$/.exec(input)?.[1];
    if (q === undefined) return [];
    return available.filter((s) => s.name.startsWith(q) || s.title.toLowerCase().includes(q)).slice(0, 6);
  }

  /**
   * Teclas do menu "/" (↑↓, Enter/Tab, Esc). Retorna true se tratou a tecla.
   * `onPicked` limpa o campo depois de escolher.
   */
  function handleSlashKey(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    input: string,
    onPicked: () => void
  ): boolean {
    const matches = slashMatches(input);
    if (matches.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setSlashIndex((i) => (i + delta + matches.length) % matches.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      add(matches[Math.min(slashIndex, matches.length - 1)]);
      setSlashIndex(0);
      onPicked();
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onPicked();
      return true;
    }
    return false;
  }

  /** "/identificador mensagem": ativa a skill só para esta mensagem. Retorna texto e ids. */
  function resolveMessage(text: string): { text: string; skillIds: number[] } {
    const ids = selected.map((s) => s.id);
    const inline = /^\/([a-z0-9-]+)\s+([\s\S]+)$/.exec(text);
    if (inline) {
      const found = available.find((s) => s.name === inline[1]);
      if (found) {
        if (!ids.includes(found.id) && ids.length < MAX_SELECTED_SKILLS) ids.push(found.id);
        return { text: inline[2].trim(), skillIds: ids };
      }
    }
    return { text, skillIds: ids };
  }

  return {
    available,
    selected,
    setSelected,
    add,
    toggle,
    remove,
    slashIndex,
    setSlashIndex,
    slashMatches,
    handleSlashKey,
    resolveMessage,
  };
}
