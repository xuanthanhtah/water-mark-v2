"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, Video as VideoIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function MediaDropzone({
  onFilesSelected,
  disabled = false,
}: MediaDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const validFiles: File[] = [];
      const filesArray = Array.from(fileList);

      for (const file of filesArray) {
        if (
          file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          file.name.toLowerCase().endsWith(".heic")
        ) {
          validFiles.push(file);
        }
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  // Clipboard paste support (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || !e.clipboardData) return;

      const items = e.clipboardData.items;
      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        handleFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, handleFiles]);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center select-none overflow-hidden",
        isDragOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]"
          : "border-border/80 hover:border-primary/60 hover:bg-muted/40 bg-card/60",
        disabled && "opacity-60 cursor-not-allowed pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.heic"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Decorative ambient gradient backdrop */}
      <div
        className={cn(
          "absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-opacity duration-500",
          isDragOver ? "bg-primary/20 opacity-100" : "bg-primary/10 opacity-0 group-hover:opacity-100"
        )}
      />

      {/* Icon cluster */}
      <div className="relative mb-4 flex items-center justify-center">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300",
            isDragOver
              ? "bg-primary text-primary-foreground scale-110 rotate-3"
              : "bg-muted text-foreground group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary"
          )}
        >
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="absolute -top-1 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-sm">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      {/* Primary message */}
      <h3 className="text-base font-semibold text-foreground mb-1">
        {isDragOver ? "Thả tệp vào đây ngay!" : "Kéo thả ảnh hoặc video vào đây"}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-3">
        Hoặc <span className="text-primary font-medium underline underline-offset-4">duyệt từ máy tính</span> hay nhấn <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded font-mono">Ctrl + V</kbd> để dán
      </p>

      {/* Format pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground/80">
        <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full border border-border/50">
          <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> JPG, PNG, HEIC, WEBP
        </span>
        <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full border border-border/50">
          <VideoIcon className="w-3.5 h-3.5 text-purple-500" /> MP4, MOV, WEBM
        </span>
      </div>
    </div>
  );
}
