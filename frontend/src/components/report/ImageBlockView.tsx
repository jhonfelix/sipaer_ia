"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  ImageIcon, Upload, Link, AlignLeft, AlignCenter, AlignRight, X, Loader2,
  MoreHorizontal, Copy, Download, Type, Files, Trash2, RefreshCw, Crop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { media } from "@/lib/api";
import { ImageCropDialog } from "./ImageCropDialog";

const SIZE_PRESETS = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: "100%" },
];

export function ImageBlockView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const { src, alt, align, width } = node.attrs as {
    src: string | null;
    alt: string;
    align: "left" | "center" | "right";
    width: string | null;
  };

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const swapInputRef  = useRef<HTMLInputElement>(null);
  const imgWrapRef    = useRef<HTMLDivElement>(null);
  const menuRef       = useRef<HTMLDivElement>(null);

  const [tab,         setTab]         = useState<"upload" | "url">("upload");
  const [urlValue,    setUrlValue]    = useState("");
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMenu,    setShowMenu]    = useState(false);
  const [showCrop,    setShowCrop]    = useState(false);

  // ── Fechar menu ao clicar fora ─────────────────────────────────────────
  useEffect(() => {
    if (!showMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showMenu]);

  // ── Upload ─────────────────────────────────────────────────────────────
  const applyFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportId = (editor.storage as any).imageBlock?.reportId as string | undefined;
      const result = await media.upload(file, reportId);
      updateAttributes({ src: result.url, alt: file.name.replace(/\.[^/.]+$/, "") });
    } catch {
      setUploadError("Falha no upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [editor, updateAttributes]);

  const applyUrl = useCallback(() => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
    setUrlValue("");
  }, [urlValue, updateAttributes]);

  // ── Remover nó + limpar backend ────────────────────────────────────────
  const handleRemove = useCallback(async () => {
    setShowMenu(false);
    if (src?.startsWith("/media/")) {
      const parts = src.split("/").filter(Boolean);
      try { await media.remove(parts[1], parts[2]); } catch { /* ignore */ }
    }
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos === "number") {
      editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
    } else {
      updateAttributes({ src: null });
    }
  }, [src, editor, getPos, node.nodeSize, updateAttributes]);

  // ── Ações do menu ──────────────────────────────────────────────────────
  const handleSwap = useCallback(() => {
    setShowMenu(false);
    swapInputRef.current?.click();
  }, []);

  const handleCopyImage = useCallback(async () => {
    setShowMenu(false);
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      await navigator.clipboard.writeText(src).catch(() => {});
    }
  }, [src]);

  const handleDownload = useCallback(() => {
    setShowMenu(false);
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "imagem";
    a.click();
  }, [src, alt]);

  const handleCaption = useCallback(() => {
    setShowMenu(false);
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos === "number") {
      // coloca cursor dentro do parágrafo da legenda (filho do nó)
      editor.chain().focus().setTextSelection(pos + node.nodeSize - 2).run();
    }
  }, [editor, getPos, node.nodeSize]);

  const handleDuplicate = useCallback(() => {
    setShowMenu(false);
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos === "number") {
      editor.chain()
        .insertContentAt(pos + node.nodeSize, {
          type: "imageBlock",
          attrs: { src, alt, align, width },
          content: [{ type: "paragraph" }],
        })
        .run();
    }
  }, [editor, getPos, node.nodeSize, src, alt, align, width]);

  // ── Crop ───────────────────────────────────────────────────────────────
  const handleCropOpen = useCallback(() => {
    setShowMenu(false);
    setShowCrop(true);
  }, []);

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportId = (editor.storage as any).imageBlock?.reportId as string | undefined;
    const file = new File([blob], "crop.jpg", { type: "image/jpeg" });
    const result = await media.upload(file, reportId);
    if (src?.startsWith("/media/")) {
      const parts = src.split("/").filter(Boolean);
      media.remove(parts[1], parts[2]).catch(() => {});
    }
    updateAttributes({ src: result.url });
    setShowCrop(false);
  }, [editor, src, updateAttributes]);

  // ── Drag-to-resize ─────────────────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = imgWrapRef.current;
    if (!wrap) return;
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
      wrap.style.maxWidth = "";
      updateAttributes({ width: `${pct}%` });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editor, updateAttributes]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  // ── Hidden file inputs (compartilhados entre card e imagem) ────────────
  const sharedInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ""; }}
      />
      <input
        ref={swapInputRef}
        type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ""; }}
      />
    </>
  );

  // ── No src: upload card ────────────────────────────────────────────────
  if (!src) {
    return (
      <NodeViewWrapper>
        {sharedInputs}
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
              {uploading ? (
                <div className="ib-uploading">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enviando…</span>
                </div>
              ) : (
                <button className="ib-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  Escolher arquivo
                </button>
              )}
              {uploadError && <p className="ib-error">{uploadError}</p>}
              <p className="ib-hint">ou arraste e solte aqui</p>
            </>
          ) : (
            <div className="ib-url-row">
              <input
                type="url" className="ib-url-input"
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
        <div style={{ display: "none" }}><NodeViewContent /></div>
      </NodeViewWrapper>
    );
  }

  // ── Has src: imagem + legenda ──────────────────────────────────────────
  const wrapStyle = width ? { maxWidth: width } : undefined;

  return (
    <NodeViewWrapper>
      {sharedInputs}
      <figure
        className={cn("ib-figure", `ib-figure--${align}`, selected && "ib-figure--selected")}
        data-image-block=""
        data-align={align}
      >
        <div ref={imgWrapRef} className="ib-img-wrap" style={wrapStyle} contentEditable={false}>
          <img src={src} alt={alt} className="ib-img" draggable={false} />

          {/* Handles de resize — visíveis ao hover, funcionam sem seleção */}
          <div className="ib-resize-handle" onMouseDown={startResize}
            title="Arrastar para redimensionar" />
          <div className="ib-resize-corner" onMouseDown={startResize}
            title="Arrastar para redimensionar" />

          {/* Toolbar flutuante (selecionado) */}
          {selected && (
            <div className="ib-toolbar" contentEditable={false}>
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

              {SIZE_PRESETS.map(({ label, value }) => (
                <button key={value}
                  className={cn("ib-tb-btn ib-tb-size", width === value && "ib-tb-btn--active")}
                  onClick={() => updateAttributes({ width: value })} title={`Largura ${label}`}>
                  {label}
                </button>
              ))}
              {width && (
                <button className="ib-tb-btn ib-tb-size"
                  onClick={() => updateAttributes({ width: null })} title="Tamanho original">
                  ↺
                </button>
              )}

              <div className="ib-tb-sep" />

              <button className="ib-tb-btn" title="Substituir imagem"
                onClick={handleSwap}>
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button className="ib-tb-btn ib-tb-btn--danger" title="Remover imagem (Del)"
                onClick={handleRemove}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Botões de hover (não selecionado) */}
          {!selected && (
            <div className="ib-hover-actions" contentEditable={false} ref={menuRef}>
              {/* Baixar */}
              <button
                className="ib-hover-btn"
                title="Baixar"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* ⋯ Mais opções */}
              <button
                className="ib-hover-btn"
                title="Mais opções"
                onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown de ações */}
              {showMenu && (
                <div className="ib-menu">
                  <p className="ib-menu-label">Imagem</p>

                  <button className="ib-menu-item" onClick={handleSwap}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Substituir</span>
                  </button>

                  <button className="ib-menu-item" onClick={handleCopyImage}>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar imagem</span>
                  </button>

                  <button className="ib-menu-item" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>

                  <button className="ib-menu-item" onClick={handleCaption}>
                    <Type className="w-3.5 h-3.5" />
                    <span>Legenda</span>
                    <kbd className="ib-menu-kbd">Ctrl+Alt+M</kbd>
                  </button>

                  <button className="ib-menu-item" onClick={handleCropOpen}>
                    <Crop className="w-3.5 h-3.5" />
                    <span>Recortar imagem</span>
                  </button>

                  <div className="ib-menu-divider" />

                  <button className="ib-menu-item" onClick={handleDuplicate}>
                    <Files className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                    <kbd className="ib-menu-kbd">Ctrl+D</kbd>
                  </button>

                  <div className="ib-menu-divider" />

                  <button className="ib-menu-item ib-menu-item--danger" onClick={handleRemove}>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                    <kbd className="ib-menu-kbd">Del</kbd>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <NodeViewContent as={"figcaption" as any} className="ib-caption" style={wrapStyle} />
      </figure>

      {showCrop && src && (
        <ImageCropDialog
          src={src}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
