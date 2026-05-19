import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface InlineSuggestion {
  id: string;
  from: number;
  to: number;
  type: "grammar" | "clarity" | "style";
  message: string;
  fix: string;
}

export const suggestionPluginKey = new PluginKey<{ suggestions: InlineSuggestion[] }>(
  "inlineSuggestions"
);

export function setSuggestions(editor: Editor, suggestions: InlineSuggestion[]) {
  editor.view.dispatch(
    editor.state.tr.setMeta(suggestionPluginKey, suggestions)
  );
}

export function acceptSuggestion(editor: Editor, suggestion: InlineSuggestion) {
  const { suggestions } = suggestionPluginKey.getState(editor.state) ?? { suggestions: [] };
  const remaining = suggestions.filter((s) => s.id !== suggestion.id);

  const tr = editor.state.tr
    .replaceWith(
      suggestion.from,
      suggestion.to,
      editor.state.schema.text(suggestion.fix)
    )
    .setMeta(suggestionPluginKey, remaining);

  editor.view.dispatch(tr);
}

export function dismissSuggestion(editor: Editor, id: string) {
  const { suggestions } = suggestionPluginKey.getState(editor.state) ?? { suggestions: [] };
  editor.view.dispatch(
    editor.state.tr.setMeta(
      suggestionPluginKey,
      suggestions.filter((s) => s.id !== id)
    )
  );
}

export const SuggestionDecorations = Extension.create({
  name: "suggestionDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionPluginKey,
        state: {
          init: () => ({ suggestions: [] as InlineSuggestion[] }),
          apply(tr, value) {
            const newSuggestions = tr.getMeta(suggestionPluginKey);
            if (newSuggestions !== undefined) {
              return { suggestions: newSuggestions };
            }
            if (tr.docChanged && value.suggestions.length > 0) {
              const mapped = value.suggestions
                .map((s) => {
                  const from = tr.mapping.map(s.from);
                  const to = tr.mapping.map(s.to);
                  if (from >= to) return null;
                  return { ...s, from, to };
                })
                .filter(Boolean) as InlineSuggestion[];
              return { suggestions: mapped };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            const pluginState = suggestionPluginKey.getState(state);
            if (!pluginState?.suggestions?.length) return DecorationSet.empty;

            const decorations = pluginState.suggestions.map((s) =>
              Decoration.inline(s.from, s.to, {
                class: `suggestion-inline suggestion-${s.type}`,
                "data-suggestion-id": s.id,
                "data-suggestion-type": s.type,
                "data-suggestion-fix": s.fix,
                "data-suggestion-message": s.message,
              })
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

const PATTERNS = [
  {
    pattern: /\bpiloto\b/gi,
    type: "style" as const,
    message: 'Considere usar "comandante em exercício" para maior precisão técnica SIPAER.',
    fix: "comandante em exercício",
  },
  {
    pattern: /\bVMC\b/g,
    type: "clarity" as const,
    message: "Expandir a sigla na primeira ocorrência.",
    fix: "VMC (Visual Meteorological Conditions)",
  },
  {
    pattern: /\baeronave\b/gi,
    type: "style" as const,
    message: "Especifique a matrícula da aeronave quando possível.",
    fix: "aeronave (especificar matrícula)",
  },
];

export function generateMockSuggestions(editor: Editor) {
  const doc = editor.state.doc;
  const suggestions: InlineSuggestion[] = [];
  const used = new Set<string>();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    for (const { pattern, type, message, fix } of PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(node.text)) !== null) {
        const key = `${type}-${pos + match.index}`;
        if (used.has(key)) continue;
        used.add(key);

        suggestions.push({
          id: key,
          from: pos + match.index,
          to: pos + match.index + match[0].length,
          type,
          message,
          fix,
        });

        if (suggestions.length >= 6) return false;
      }
    }
  });

  setSuggestions(editor, suggestions);
}
