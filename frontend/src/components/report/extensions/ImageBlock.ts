import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageBlockView } from "../ImageBlockView";

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  content: "paragraph?",
  draggable: true,
  isolating: true,
  selectable: true,

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
      }),
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-image-block": "" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});
