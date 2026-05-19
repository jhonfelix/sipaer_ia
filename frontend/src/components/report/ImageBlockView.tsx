"use client";

import { useRef, useState, useCallback } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  ImageIcon, Upload, Link, AlignLeft, AlignCenter, AlignRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: "100%" },
];

export function ImageBlockView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, align, width } = node.attrs as {
    src: string | null;
    alt: string;
    align: "left" | "center" | "right";
    width: string | null;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlValue, setUrlValue] = useState("");
  const [dragging, setDragging] = useState(false);

  const applyFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    updateAttributes({ src: url, alt: file.name.replace(/\.[^/.]+$/, "") });
  }, [updateAttributes]);

  const applyUrl = useCallback(() => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
    setUrlValue("");
  }, [urlValue, updateAttributes]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  // ── Drag-to-resize ─────────────────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wrap = imgWrapRef.current;
    if (!wrap) return;

    // Use the editor DOM width as the 100% reference
    const containerWidth = (editor.view.dom as HTMLElement).clientWidth || 800;
    const startX = e.clientX;
    const startWidthPx = wrap.getBoundingClientRect().width;

    const onMove = (ev: MouseEvent) => {
      const newPx = Math.max(80, startWidthPx + (ev.clientX - startX));
      const pct = Math.min(100, Math.max(10, Math.round((newPx / containerWidth) * 100)));
      wrap.style.maxWidth = `${pct}%`;
    };

    const onUp = (ev: MouseEvent) => {
      const newPx = Math.max(80, startWidthPx + (ev.clientX - startX));
      const pct = Math.min(100, Math.max(10, Math.round((newPx / containerWidth) * 100)));
      wrap.style.maxWidth = ""; // clear inline; attribute now controls it
      updateAttributes({ width: `${pct}%` });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editor, updateAttributes]);

  // ── No src: show upload card ───────────────────────────────────────────
  if (!src) {
    return (
      <NodeViewWrapper>
        <div
          className={cn("ib-card", dragging && "ib-card--drag")}
          contentEditable={false}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <ImageIcon className="w-8 h-8 opacity-30 mb-3" />
          <p className="ib-card-title">Adicionar imagem</p>

          <div className="ib-tabs">
            <button className={cn("ib-tab", tab === "upload" && "ib-tab--active")}
              onClick={() => setTab("upload")}>
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <button className={cn("ib-tab", tab === "url" && "ib-tab--active")}
              onClick={() => setTab("url")}>
              <Link className="w-3.5 h-3.5" /> URL
            </button>
          </div>

          {tab === "upload" ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) applyFile(file);
                }}
              />
              <button className="ib-upload-btn" onClick={() => fileInputRef.current?.click()}>
                Escolher arquivo
              </button>
              <p className="ib-hint">ou arraste e solte aqui</p>
            </>
          ) : (
            <div className="ib-url-row">
              <input
                type="url"
                className="ib-url-input"
                placeholder="https://exemplo.com/imagem.jpg"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyUrl()}
                autoFocus
              />
              <button className="ib-url-confirm" onClick={applyUrl}>Inserir</button>
            </div>
          )}
        </div>
        {/* Keep NodeViewContent mounted but hidden so content is preserved */}
        <div style={{ display: "none" }}>
          <NodeViewContent />
        </div>
      </NodeViewWrapper>
    );
  }

  // ── Has src: show image + caption ─────────────────────────────────────
  const wrapStyle = width ? { maxWidth: width } : undefined;

  return (
    <NodeViewWrapper>
      <figure
        className={cn("ib-figure", `ib-figure--${align}`, selected && "ib-figure--selected")}
        data-image-block=""
        data-align={align}
      >
        {/* Image wrapper — constrained to `width` */}
        <div
          ref={imgWrapRef}
          className="ib-img-wrap"
          style={wrapStyle}
          contentEditable={false}
        >
          <img
            src={src}
            alt={alt}
            className="ib-img"
            draggable={false}
          />

          {/* Drag-to-resize handle (right edge) */}
          {selected && (
            <div
              className="ib-resize-handle"
              onMouseDown={startResize}
              title="Arrastar para redimensionar"
            />
          )}

          {/* Floating toolbar */}
          {selected && (
            <div className="ib-toolbar" contentEditable={false}>
              {/* Alignment */}
              <button className={cn("ib-tb-btn", align === "left" && "ib-tb-btn--active")}
                onClick={() => updateAttributes({ align: "left" })} title="Alinhar à esquerda">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button className={cn("ib-tb-btn", align === "center" && "ib-tb-btn--active")}
                onClick={() => updateAttributes({ align: "center" })} title="Centralizar">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button className={cn("ib-tb-btn", align === "right" && "ib-tb-btn--active")}
                onClick={() => updateAttributes({ align: "right" })} title="Alinhar à direita">
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <div className="ib-tb-sep" />

              {/* Size presets */}
              {SIZE_PRESETS.map(({ label, value }) => (
                <button
                  key={value}
                  className={cn("ib-tb-btn ib-tb-size", width === value && "ib-tb-btn--active")}
                  onClick={() => updateAttributes({ width: value })}
                  title={`Largura ${label}`}
                >
                  {label}
                </button>
              ))}
              {width && (
                <button
                  className="ib-tb-btn ib-tb-size"
                  onClick={() => updateAttributes({ width: null })}
                  title="Tamanho original"
                >
                  ↺
                </button>
              )}

              <div className="ib-tb-sep" />

              {/* Swap / Remove */}
              <button className="ib-tb-btn" title="Trocar imagem"
                onClick={() => {
                  const url = window.prompt("Nova URL da imagem:", src);
                  if (url) updateAttributes({ src: url });
                }}>
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button className="ib-tb-btn ib-tb-btn--danger" title="Remover imagem"
                onClick={() => updateAttributes({ src: null })}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Editable caption — matches image width */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <NodeViewContent as={"figcaption" as any} className="ib-caption" style={wrapStyle} />
      </figure>
    </NodeViewWrapper>
  );
}
