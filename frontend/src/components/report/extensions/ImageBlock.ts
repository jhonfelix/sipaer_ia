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

  addStorage() {
    return { reportId: null as string | null };
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
