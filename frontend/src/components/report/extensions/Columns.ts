import { Node, mergeAttributes } from "@tiptap/core";

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-column": "", class: "editor-column" }),
      0,
    ];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (el) => parseInt(el.getAttribute("data-count") || "2", 10),
        renderHTML: (attrs) => ({ "data-count": String(attrs.count) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const count = HTMLAttributes["data-count"] || "2";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-columns": "",
        class: `editor-columns editor-columns-${count}`,
      }),
      0,
    ];
  },
});
