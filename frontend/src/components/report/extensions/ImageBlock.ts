import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageBlockView } from "../ImageBlockView";
import { getToken } from "@/lib/api";

// Called when Delete/Backspace is pressed with an imageBlock node selected.
// Kicks off backend cleanup fire-and-forget, then returns false so TipTap
// performs the actual node deletion via its own command pipeline.
function cleanupOnKeyDelete(editor: Editor): boolean {
  const sel = editor.state.selection as {
    node?: { type: { name: string }; attrs: Record<string, unknown> };
  };
  if (!sel.node || sel.node.type.name !== "imageBlock") return false;

  const src = sel.node.attrs.src as string | null;
  if (src?.startsWith("/media/")) {
    const parts = src.split("/").filter(Boolean);
    const token = getToken();
    fetch(`/api/upload/${parts[1]}/${parts[2]}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }

  return false; // let TipTap delete the node normally
}

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  content: "paragraph?",
  draggable: true,
  isolating: true,
  selectable: true,

  addStorage() {
    return { reportId: null as string | null };
  },

  addKeyboardShortcuts() {
    return {
      Delete:           ({ editor }) => cleanupOnKeyDelete(editor),
      Backspace:        ({ editor }) => cleanupOnKeyDelete(editor),
      // Ctrl+Alt+M → foca a legenda do imageBlock selecionado
      "Ctrl-Alt-m": ({ editor }) => {
        const sel = editor.state.selection as {
          node?: { type: { name: string }; nodeSize: number };
          from: number;
        };
        if (!sel.node || sel.node.type.name !== "imageBlock") return false;
        editor.chain().focus().setTextSelection(sel.from + sel.node.nodeSize - 2).run();
        return true;
      },
      // Ctrl+D → duplica o imageBlock selecionado
      "Ctrl-d": ({ editor }) => {
        const sel = editor.state.selection as {
          node?: { type: { name: string }; nodeSize: number; attrs: Record<string, unknown> };
          from: number;
        };
        if (!sel.node || sel.node.type.name !== "imageBlock") return false;
        const { src, alt, align, width } = sel.node.attrs;
        editor.chain()
          .insertContentAt(sel.from + sel.node.nodeSize, {
            type: "imageBlock",
            attrs: { src, alt, align, width },
            content: [{ type: "paragraph" }],
          })
          .run();
        return true;
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).querySelector("img")?.getAttribute("src") ?? null,
        renderHTML: () => ({}),
      },
      alt: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).querySelector("img")?.getAttribute("alt") ?? "",
        renderHTML: () => ({}),
      },
      align: {
        default: "center",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-align") ?? "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-width") ?? null,
        renderHTML: (attrs) => attrs.width ? { "data-width": attrs.width } : {},
      },
    };
  },

  parseHTML() {
    return [{
      tag: "figure[data-image-block]",
      getAttrs: (el) => ({
        src: (el as HTMLElement).querySelector("img")?.getAttribute("src") ?? null,
        alt: (el as HTMLElement).querySelector("img")?.getAttribute("alt") ?? "",
        align: (el as HTMLElement).getAttribute("data-align") ?? "center",
        width: (el as HTMLElement).getAttribute("data-width") ?? null,
      }),
    }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, alt } = node.attrs as { src: string | null; alt: string };
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-image-block": "" }),
      ["img", { src: src ?? "", alt: alt ?? "" }],
      ["figcaption", 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});
