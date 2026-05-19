import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "danger" | "success";

export const CALLOUT_ICONS: Record<CalloutVariant, string> = {
  info: "ℹ",
  warning: "⚠",
  danger: "⛔",
  success: "✓",
};

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) =>
          (el.getAttribute("data-variant") as CalloutVariant) || "info",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = (HTMLAttributes["data-variant"] as CalloutVariant) || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: `callout callout-${variant}`,
      }),
      ["div", { class: "callout-icon", contenteditable: "false" }, CALLOUT_ICONS[variant]],
      ["div", { class: "callout-content" }, 0],
    ];
  },
});
