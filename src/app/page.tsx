"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Sparkles,
  Layers,
  Trash2,
  Play,
  ImageIcon,
  VideoIcon,
  Shield,
  Zap,
  HardDrive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import DialogHandleFile from "./components/home/DialogHandleFile";
import AlertShow from "./components/home/AlertShow";
import MediaDropzone from "@/components/home/MediaDropzone";
import WatermarkDropzone from "@/components/home/WatermarkDropzone";
import { convertHeicToJpeg } from "@/utils/convertHeicToJpeg";
import { MediaFileItem } from "@/types/watermark";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Home() {
  const [files, setFiles] = useState<MediaFileItem[]>([]);
  const [waterMark, setWatermark] = useState<File | undefined>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenAlert, setIsOpenAlert] = useState<boolean>(false);
  const [loadedStates, setLoadedStates] = useState<boolean[]>([]);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);

  const handleWatermarkSelected = async (file: File) => {
    if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
      const converted = await convertHeicToJpeg(file);
      if (converted) {
        setWatermark(converted);
      }
    } else {
      setWatermark(file);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const item = files[indexToRemove];
    if (item && item.preview) {
      URL.revokeObjectURL(item.preview);
    }
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setLoadedStates((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleClearAll = () => {
    files.forEach((item) => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setFiles([]);
    setLoadedStates([]);
  };

  const handleFilesSelected = async (incomingFiles: File[]) => {
    setIsConvertingHeic(true);
    const convertedItems = await Promise.all(
      incomingFiles.map(async (file) => {
        // HEIC conversion
        if (
          file.type === "image/heic" ||
          file.name.toLowerCase().endsWith(".heic")
        ) {
          try {
            const converted = await convertHeicToJpeg(file);
            if (converted) {
              return {
                file: converted,
                preview: URL.createObjectURL(converted),
                type: "image" as const,
              };
            }
          } catch (err) {
            console.error("Chuyển đổi HEIC thất bại:", err);
            return null;
          }
        } else if (file.type.startsWith("video/")) {
          return {
            file,
            preview: URL.createObjectURL(file),
            type: "video" as const,
          };
        } else if (file.type.startsWith("image/")) {
          return {
            file,
            preview: URL.createObjectURL(file),
            type: "image" as const,
          };
        }
        return null;
      })
    );

    const validItems = convertedItems.filter(
      (item): item is MediaFileItem => item !== null
    );

    setFiles((prev) => [...prev, ...validItems]);
    setLoadedStates((prev) => [...prev, ...validItems.map(() => false)]);
    setIsConvertingHeic(false);
  };

  // Stats calculation
  const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0);
  const imageCount = files.filter((f) => f.type === "image").length;
  const videoCount = files.filter((f) => f.type === "video").length;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Watermark Studio v2.0 • Pro Edition</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
              Đóng Dấu Ảnh & Video Chuyên Nghiệp
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Bảo vệ bản quyền truyền thông với logo trong suốt hoặc chữ nghệ thuật. Hỗ trợ hàng loạt ảnh, video HD, chuyển đổi HEIC tức thì và xử lý 100% trên máy tính của bạn.
            </p>
          </div>

          {/* Quick value badges */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-lg border shadow-xs">
              <Shield className="w-4 h-4 text-emerald-500" /> Bản quyền an toàn
            </span>
            <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-lg border shadow-xs">
              <Zap className="w-4 h-4 text-amber-500" /> Tốc độ xử lý cao
            </span>
            <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-lg border shadow-xs">
              <HardDrive className="w-4 h-4 text-blue-500" /> Offline riêng tư
            </span>
          </div>
        </header>

        {/* Upload Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Media Dropzone */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>1. Tải lên tệp phương tiện (Ảnh hoặc Video)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Kéo thả nhiều ảnh, video từ máy tính hoặc bấm để chọn.
              </p>
            </div>

            <MediaDropzone
              onFilesSelected={handleFilesSelected}
              disabled={isConvertingHeic}
            />
          </div>

          {/* Watermark Config Box */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>2. Chọn Logo Watermark (Tùy chọn)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Mặc định dùng logo mẫu, hoặc tải file PNG/JPG của riêng bạn.
              </p>
            </div>

            <WatermarkDropzone
              watermarkFile={waterMark}
              onWatermarkSelected={handleWatermarkSelected}
              onWatermarkCleared={() => setWatermark(undefined)}
            />
          </div>
        </div>

        {/* Floating / Sticky Action Bar when files exist */}
        {files.length > 0 && (
          <div className="sticky top-4 z-30 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-semibold">
                Đã nạp {files.length} tệp ({imageCount > 0 && `${imageCount} ảnh`}
                {imageCount > 0 && videoCount > 0 && ", "}
                {videoCount > 0 && `${videoCount} video`})
              </div>

              <div className="text-xs text-muted-foreground font-mono">
                Tổng dung lượng: {formatFileSize(totalBytes)}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-muted-foreground hover:text-destructive h-9"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Xóa tất cả
              </Button>

              <Button
                size="sm"
                onClick={() => setIsOpen(true)}
                className="h-9 px-5 font-semibold gap-2 shadow-md shadow-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mở Studio Đóng Dấu ({files.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Media Gallery / Grid Showcase */}
        {files.length > 0 ? (
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files.map(({ file, preview, type }, index) => {
                  const ext = file.name.split(".").pop()?.toUpperCase() || type;
                  return (
                    <div
                      key={index}
                      className="group relative w-full aspect-square rounded-xl overflow-hidden shadow-xs border bg-muted/30 transition-all hover:shadow-md hover:border-primary/50"
                    >
                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 pointer-events-none">
                        <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {ext}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemove(index)}
                        title="Xóa tệp này"
                        className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 opacity-90 transition-all shadow-sm cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Skeleton loader */}
                      {!loadedStates[index] && (
                        <Skeleton className="absolute inset-0 w-full h-full" />
                      )}

                      {/* Thumbnail media */}
                      {type === "image" ? (
                        <Image
                          src={preview}
                          alt={file.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          onLoad={() =>
                            setLoadedStates((prev) => {
                              const updated = [...prev];
                              updated[index] = true;
                              return updated;
                            })
                          }
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            src={preview}
                            className="w-full h-full object-cover"
                            onLoadedData={() =>
                              setLoadedStates((prev) => {
                                const updated = [...prev];
                                updated[index] = true;
                                return updated;
                              })
                            }
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                            <div className="w-9 h-9 rounded-full bg-white/80 text-black flex items-center justify-center shadow-md">
                              <Play className="w-4 h-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom file info overlay */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4 text-white pointer-events-none">
                        <p className="text-[11px] truncate font-medium">{file.name}</p>
                        <p className="text-[10px] text-white/70 font-mono">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7" />
            </div>

            <h3 className="text-base font-semibold text-foreground mb-1">
              Chưa có tệp nào được tải lên
            </h3>

            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Hãy kéo thả ảnh hoặc video vào khung bên trên để bắt đầu điều chỉnh watermark và xuất hàng loạt.
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.querySelector('input[type="file"]') as HTMLInputElement;
                el?.click();
              }}
              className="text-xs"
            >
              Chọn tệp ngay
            </Button>
          </div>
        )}

        {/* Dialog Handle File */}
        <DialogHandleFile
          files={files}
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          chooseWM={waterMark}
        />

        {/* Alert when clicking watermark without files */}
        {isOpenAlert && (
          <AlertShow close={() => setIsOpenAlert(false)} isOpen={isOpenAlert} />
        )}
      </div>
    </main>
  );
}
