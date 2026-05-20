"use client";

import { X, FileText, Music, Film, Table2, Image as ImageIcon } from "lucide-react";

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fileStyle(mime: string) {
  if (mime.startsWith("image/")) return { Icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-400/10" };
  if (mime.startsWith("audio/")) return { Icon: Music, color: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (mime.startsWith("video/")) return { Icon: Film, color: "text-purple-400", bg: "bg-purple-400/10" };
  if (mime.includes("pdf")) return { Icon: FileText, color: "text-red-400", bg: "bg-red-400/10" };
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel"))
    return { Icon: Table2, color: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (mime.includes("word") || mime.includes("document"))
    return { Icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" };
  return { Icon: FileText, color: "text-white/45", bg: "bg-white/[0.06]" };
}

interface Props {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2.5">
      {files.map((attached) => {
        const isImage = attached.file.type.startsWith("image/");
        const { Icon, color, bg } = fileStyle(attached.file.type);

        return (
          <div
            key={attached.id}
            className="relative flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] group hover:border-white/[0.14] transition-colors"
          >
            {isImage && attached.preview ? (
              <img
                src={attached.preview}
                alt={attached.file.name}
                className="w-9 h-9 rounded-lg object-cover border border-white/[0.08]"
              />
            ) : (
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            )}
            <div className="min-w-0 max-w-[110px]">
              <p className="text-white/78 text-[11px] font-medium truncate leading-tight">
                {attached.file.name}
              </p>
              <p className="text-white/30 text-[10px] mt-0.5">{formatSize(attached.file.size)}</p>
            </div>
            <button
              onClick={() => onRemove(attached.id)}
              className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-4.5 h-4.5 w-[18px] h-[18px] rounded-full bg-[#0d1b2e] border border-white/[0.15] flex items-center justify-center text-white/55 hover:text-white hover:bg-[#1a2f4a] transition-all"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
