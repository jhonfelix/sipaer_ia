"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImageCropDialogProps {
  src: string;
  onConfirm: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}

async function cropToBlob(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const canvas = document.createElement("canvas");
  canvas.width  = Math.round(crop.width  * scaleX);
  canvas.height = Math.round(crop.height * scaleY);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    img,
    Math.round(crop.x * scaleX),
    Math.round(crop.y * scaleY),
    Math.round(crop.width  * scaleX),
    Math.round(crop.height * scaleY),
    0, 0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar recorte"))),
      "image/jpeg",
      0.95,
    );
  });
}

export function ImageCropDialog({ src, onConfirm, onCancel }: ImageCropDialogProps) {
  const imgRef      = useRef<HTMLImageElement>(null);
  const [crop,          setCrop]          = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, width / height, width, height),
        width,
        height,
      ),
    );
  }, []);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await cropToBlob(imgRef.current, completedCrop);
      await onConfirm(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao recortar");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar imagem</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-[60vh]">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={(c) => setCompletedCrop(c)}
            minWidth={20}
            minHeight={20}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Recortar"
              onLoad={onImageLoad}
              className="max-h-[60vh] max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !completedCrop}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>
            ) : (
              "Confirmar recorte"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
