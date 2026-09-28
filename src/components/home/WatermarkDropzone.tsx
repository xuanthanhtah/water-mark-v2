"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WatermarkDropzoneProps {
  watermarkFile?: File;
  onWatermarkSelected: (file: File) => void;
  onWatermarkCleared: () => void;
  disabled?: boolean;
}

export default function WatermarkDropzone({
  watermarkFile,
  onWatermarkSelected,
  onWatermarkCleared,
  disabled = false,
}: WatermarkDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic")) {
      onWatermarkSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const previewUrl = watermarkFile ? URL.createObjectURL(watermarkFile) : "/watermark.png";

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-4 transition-all duration-200 flex flex-col justify-between min-h-[140px]",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border/80 hover:border-primary/50 bg-card/60",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
            e.target.value = "";
          }
        }}
        disabled={disabled}
      />

      <div className="flex items-center gap-4">
        {/* Thumbnail preview */}
        <div className="relative w-16 h-16 rounded-xl border bg-muted/50 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
          <Image
            src={previewUrl}
            alt="Watermark preview"
            width={60}
            height={60}
            className="object-contain max-w-full max-h-full"
            unoptimized
          />
        </div>

        {/* Info & status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold truncate text-foreground">
              {watermarkFile ? watermarkFile.name : "Logo mặc định (BTN Hiệp Phú)"}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          </div>

          <p className="text-xs text-muted-foreground">
            {watermarkFile
              ? `Tùy chỉnh • ${(watermarkFile.size / 1024).toFixed(1)} KB`
              : "Đang dùng logo mẫu hệ thống. Bạn có thể tải logo của riêng bạn."}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
        {watermarkFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onWatermarkCleared}
            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Dùng lại mặc định
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="text-xs h-8"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          {watermarkFile ? "Thay đổi logo" : "Tải logo của bạn"}
        </Button>
      </div>
    </div>
  );
}
