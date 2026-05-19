import { Node, mergeAttributes } from "@tiptap/core";

export const SectionDivider = Node.create({
  name: "sectionDivider",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      subsectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-subsection-id"),
        renderHTML: (attributes) =>
          attributes.subsectionId
            ? { "data-subsection-id": attributes.subsectionId }
            : {},
      },
      sectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-section-id"),
        renderHTML: (attributes) =>
          attributes.sectionId
            ? { "data-section-id": attributes.sectionId }
            : {},
      },
      title: {
        default: "",
        parseHTML: (element) => element.textContent || "",
        renderHTML: () => ({}),
      },
      level: {
        default: "subsection",
        parseHTML: (element) =>
          element.getAttribute("data-divider-level") || "subsection",
        renderHTML: (attributes) => ({
          "data-divider-level": attributes.level,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-subsection-id]" },
      { tag: "div[data-section-id]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { subsectionId, sectionId, level } = node.attrs;
    const id = subsectionId
      ? `anchor-${subsectionId}`
      : `anchor-section-${sectionId}`;

    return [
      "div",
      mergeAttributes(
        {
          id,
          class: `section-divider section-divider--${level}`,
          contenteditable: "false",
        },
        HTMLAttributes
      ),
      node.attrs.title,
    ];
  },
});
