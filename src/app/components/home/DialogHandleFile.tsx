"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImageIcon,
  VideoIcon,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Move,
  Circle,
  Download,
  X,
  Sparkles,
} from "lucide-react";

type Position =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center";

type MediaType = "image" | "video";

export default function DialogHandleFile({
  files,
  isOpen,
  close,
  chooseWM,
}: DialogProps) {
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentFile = files[currentIndex]?.file;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [watermark, setWatermark] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(0.2);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Track container size changes
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Determine media type when currentFile changes
  useEffect(() => {
    if (!currentFile) return;
    setMediaType(currentFile.type.startsWith("video/") ? "video" : "image");
  }, [currentFile]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const step = e.shiftKey ? 10 : 5;
      switch (e.key) {
        case "ArrowUp":
          setOffsetY((prev) => prev - step);
          break;
        case "ArrowDown":
          setOffsetY((prev) => prev + step);
          break;
        case "ArrowLeft":
          setOffsetX((prev) => prev - step);
          break;
        case "ArrowRight":
          setOffsetX((prev) => prev + step);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setOffsetX(0);
      setOffsetY(0);
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [isOpen]);

  // Calculate canvas size based on original image ratio
  const calculateCanvasSize = useCallback(
    (imgWidth: number, imgHeight: number) => {
      if (!previewContainerRef.current) return { width: 0, height: 0 };

      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const maxWidth = Math.min(imgWidth, containerWidth);
      const maxHeight = Math.min(imgHeight, containerHeight);

      const imgRatio = imgWidth / imgHeight;
      const containerRatio = containerWidth / containerHeight;

      let width, height;

      if (containerRatio > imgRatio) {
        height = Math.min(imgHeight, maxHeight);
        width = height * imgRatio;
      } else {
        width = Math.min(imgWidth, maxWidth);
        height = width / imgRatio;
      }

      return { width, height };
    },
    []
  );

  // Draw canvas with proper watermark scaling
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !watermark || originalDimensions.width === 0)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw media
      if (mediaType === "image" && image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } else if (mediaType === "video" && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Calculate scaling factor between preview and original
      const scaleX = canvas.width / originalDimensions.width;
      const scaleY = canvas.height / originalDimensions.height;
      const previewScale = Math.min(scaleX, scaleY);

      // Calculate watermark dimensions with preview scaling
      const wmWidth = watermark.width * scale * previewScale;
      const wmHeight = watermark.height * scale * previewScale;

      // Calculate position with preview scaling
      const padding = 10 * previewScale;
      let x = 0;
      let y = 0;

      switch (position) {
        case "bottom-right":
          x = canvas.width - wmWidth - padding;
          y = canvas.height - wmHeight - padding;
          break;
        case "bottom-left":
          x = padding;
          y = canvas.height - wmHeight - padding;
          break;
        case "top-right":
          x = canvas.width - wmWidth - padding;
          y = padding;
          break;
        case "top-left":
          x = padding;
          y = padding;
          break;
        case "center":
          x = (canvas.width - wmWidth) / 2;
          y = (canvas.height - wmHeight) / 2;
          break;
      }

      // Apply offsets with preview scaling
      x += offsetX * previewScale;
      y += offsetY * previewScale;

      // Draw watermark
      ctx.save();
      ctx.globalAlpha = opacity;
      const centerX = x + wmWidth / 2;
      const centerY = y + wmHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(watermark, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
      ctx.restore();
    });
  }, [
    image,
    watermark,
    opacity,
    scale,
    position,
    rotation,
    offsetX,
    offsetY,
    mediaType,
    originalDimensions,
  ]);

  // Load media and watermark
  useEffect(() => {
    if (!isOpen || !currentFile) return;

    setLoading(true);

    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.onload = () => {
      setWatermark(wm);
    };
    wm.src = chooseWM ? URL.createObjectURL(chooseWM) : "/watermark.png";

    // Reset state before loading new media
    setImage(null);
    setWatermark(null);
    setOriginalDimensions({ width: 0, height: 0 });

    if (mediaType === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        const { width, height } = calculateCanvasSize(img.width, img.height);
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          setImage(img);
          setLoading(false);
        }
      };
      img.onerror = () => {
        setLoading(false);
        console.error("Failed to load image");
      };
      img.src = URL.createObjectURL(currentFile);
    } else {
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(currentFile);
        videoRef.current.onloadedmetadata = () => {
          setOriginalDimensions({
            width: videoRef.current!.videoWidth,
            height: videoRef.current!.videoHeight,
          });
          const { width, height } = calculateCanvasSize(
            videoRef.current!.videoWidth,
            videoRef.current!.videoHeight
          );
          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }
          videoRef.current
            ?.play()
            .catch((e) => console.error("Video play error:", e));
          setLoading(false);
        };
        videoRef.current.onerror = () => {
          setLoading(false);
          console.error("Failed to load video");
        };
      }
    }

    return () => {
      if (image) URL.revokeObjectURL(image.src);
      if (videoRef.current) {
        videoRef.current.pause();
        URL.revokeObjectURL(videoRef.current.src);
      }
      URL.revokeObjectURL(wm.src);
    };
  }, [currentFile, isOpen, chooseWM, mediaType, calculateCanvasSize]);

  // Redraw when state changes
  useEffect(() => {
    if (mediaType === "image" && image && watermark) {
      drawCanvas();
    } else if (mediaType === "video" && videoRef.current && watermark) {
      let animationId: number;

      const drawFrame = () => {
        drawCanvas();
        animationId = requestAnimationFrame(drawFrame);
      };

      animationId = requestAnimationFrame(drawFrame);

      return () => {
        cancelAnimationFrame(animationId);
      };
    }
  }, [drawCanvas, image, watermark, mediaType]);

  const handleAddWaterAll = async () => {
    if (!watermark) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const videoPromises: Promise<void>[] = [];
      const totalFiles = files.length;
      let processedFiles = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;
        const isVideo = file.type.startsWith("video/");

        if (isVideo) {
          const videoPromise = new Promise<void>((resolve) => {
            const video = document.createElement("video");
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = async () => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                processedFiles++;
                setProgress((processedFiles / totalFiles) * 100);
                resolve();
                return;
              }

              const stream = canvas.captureStream();
              const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/mp4",
              });

              const chunks: Blob[] = [];
              mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
              mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "video/mp4" });
                zip.file(`video_${i + 1}.mp4`, blob);
                URL.revokeObjectURL(video.src);
                processedFiles++;
                setProgress((processedFiles / totalFiles) * 100);
                resolve();
              };

              video.play().catch((e) => console.error("Video play error:", e));
              mediaRecorder.start(100);

              const drawVideoFrame = () => {
                if (video.paused || video.ended) {
                  mediaRecorder.stop();
                  return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Calculate watermark size based on original dimensions
                const wmWidth = watermark.width * scale;
                const wmHeight = watermark.height * scale;
                const padding = 10;
                let x = 0;
                let y = 0;

                switch (position) {
                  case "bottom-right":
                    x = canvas.width - wmWidth - padding;
                    y = canvas.height - wmHeight - padding;
                    break;
                  case "bottom-left":
                    x = padding;
                    y = canvas.height - wmHeight - padding;
                    break;
                  case "top-right":
                    x = canvas.width - wmWidth - padding;
                    y = padding;
                    break;
                  case "top-left":
                    x = padding;
                    y = padding;
                    break;
                  case "center":
                    x = (canvas.width - wmWidth) / 2;
                    y = (canvas.height - wmHeight) / 2;
                    break;
                }

                x += offsetX;
                y += offsetY;

                ctx.save();
                ctx.globalAlpha = opacity;
                const centerX = x + wmWidth / 2;
                const centerY = y + wmHeight / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.drawImage(
                  watermark,
                  -wmWidth / 2,
                  -wmHeight / 2,
                  wmWidth,
                  wmHeight
                );
                ctx.restore();

                requestAnimationFrame(drawVideoFrame);
              };

              drawVideoFrame();
            };
            video.onerror = () => {
              console.error("Video loading error");
              processedFiles++;
              setProgress((processedFiles / totalFiles) * 100);
              resolve();
            };
          });
          videoPromises.push(videoPromise);
        } else {
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                processedFiles++;
                setProgress((processedFiles / totalFiles) * 100);
                resolve();
                return;
              }

              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // Calculate watermark size based on original dimensions
              const wmWidth = watermark.width * scale;
              const wmHeight = watermark.height * scale;
              const padding = 10;
              let x = 0;
              let y = 0;

              switch (position) {
                case "bottom-right":
                  x = canvas.width - wmWidth - padding;
                  y = canvas.height - wmHeight - padding;
                  break;
                case "bottom-left":
                  x = padding;
                  y = canvas.height - wmHeight - padding;
                  break;
                case "top-right":
                  x = canvas.width - wmWidth - padding;
                  y = padding;
                  break;
                case "top-left":
                  x = padding;
                  y = padding;
                  break;
                case "center":
                  x = (canvas.width - wmWidth) / 2;
                  y = (canvas.height - wmHeight) / 2;
                  break;
              }

              x += offsetX;
              y += offsetY;

              ctx.save();
              ctx.globalAlpha = opacity;
              const centerX = x + wmWidth / 2;
              const centerY = y + wmHeight / 2;
              ctx.translate(centerX, centerY);
              ctx.rotate((rotation * Math.PI) / 180);
              ctx.drawImage(
                watermark,
                -wmWidth / 2,
                -wmHeight / 2,
                wmWidth,
                wmHeight
              );
              ctx.restore();
              const format = file.type.startsWith("image/")
                ? file.type
                : "image/jpeg";
              const extension = format.split("/")[1];

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    zip.file(`image_${i + 1}.${extension}`, blob);
                    URL.revokeObjectURL(img.src);
                    processedFiles++;
                    setProgress((processedFiles / totalFiles) * 100);
                    resolve();
                  } else {
                    canvas.toBlob(
                      (fallbackBlob) => {
                        if (fallbackBlob) {
                          zip.file(`image_${i + 1}.jpg`, fallbackBlob);
                        }
                        URL.revokeObjectURL(img.src);
                        processedFiles++;
                        setProgress((processedFiles / totalFiles) * 100);
                        resolve();
                      },
                      "image/jpeg",
                      1
                    );
                  }
                },
                format,
                1
              );
            };
            img.onerror = () => {
              console.error("Image loading error");
              processedFiles++;
              setProgress((processedFiles / totalFiles) * 100);
              resolve();
            };
            img.src = URL.createObjectURL(file);
          });
        }
      }

      await Promise.all(videoPromises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "watermarked_media.zip");
      close();
    } catch (error) {
      console.error("Error while processing:", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-5xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span>Điều chỉnh Watermark</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-auto">
          {/* Left column - Controls */}
          <div className="space-y-6">
            {/* Opacity control */}
            <div>
              <Label htmlFor="opacity-slider">
                Độ mờ: {Math.round(opacity * 100)}%
              </Label>
              <Slider
                id="opacity-slider"
                min={0}
                max={1}
                step={0.1}
                value={[opacity]}
                onValueChange={([value]) => setOpacity(value)}
                className="mt-2"
              />
            </div>

            {/* Scale control */}
            <div>
              <Label htmlFor="scale-slider">
                Kích thước: {Math.round(scale * 100)}%
              </Label>
              <Slider
                id="scale-slider"
                min={0.1}
                max={2}
                step={0.1}
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
                className="mt-2"
              />
            </div>

            {/* Position selector */}
            <div>
              <Label>Vị trí</Label>
              <Select
                value={position}
                onValueChange={(value) => setPosition(value as Position)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Chọn vị trí" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Góc phải dưới</SelectItem>
                  <SelectItem value="bottom-left">Góc trái dưới</SelectItem>
                  <SelectItem value="top-right">Góc phải trên</SelectItem>
                  <SelectItem value="top-left">Góc trái trên</SelectItem>
                  <SelectItem value="center">Giữa ảnh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rotation control */}
            <div>
              <Label htmlFor="rotation-slider">Góc xoay: {rotation}°</Label>
              <Slider
                id="rotation-slider"
                min={-180}
                max={180}
                step={1}
                value={[rotation]}
                onValueChange={([value]) => setRotation(value)}
                className="mt-2"
              />
            </div>

            {/* Tips */}
            <div className="text-sm text-muted-foreground">
              <p>Mẹo: Sử dụng phím mũi tên để điều chỉnh vị trí watermark</p>
              <p>Giữ Shift để di chuyển nhanh hơn</p>
            </div>

            {/* Reset buttons */}
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOffsetX(0);
                      setOffsetY(0);
                    }}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset vị trí</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation(0)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset góc xoay</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right column - Preview */}
          <div className="flex flex-col">
            {/* Preview container */}
            <div
              ref={previewContainerRef}
              className="relative border rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              style={{ minHeight: "400px", height: "100%" }}
            >
              {loading && (
                <div className="flex flex-col absolute inset-0 z-10 bg-white/80 dark:bg-gray-900/80 items-center justify-center">
                  <Skeleton className="w-[200px] h-[200px] rounded-full" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Đang tải {mediaType === "image" ? "ảnh" : "video"}, vui lòng
                    chờ...
                  </p>
                </div>
              )}

              {mediaType === "video" && (
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                  muted
                  loop
                  preload="auto"
                />
              )}

              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
                style={{
                  objectFit: "contain",
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>

            {/* Navigation buttons - placed directly below canvas */}
            {files.length > 1 && (
              <div className="flex justify-center gap-4 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center bg-background px-4 py-2 rounded text-sm">
                  {currentIndex + 1} / {files.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === files.length - 1}
                  className="cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Đang xử lý...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Dialog footer */}
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={close}
            disabled={isProcessing}
            className="cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            onClick={handleAddWaterAll}
            disabled={isProcessing}
            className="gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Circle className="h-4 w-4 animate-spin" />
                <span>Đang xử lý ({Math.round(progress)}%)</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Tải xuống tất cả</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DialogProps {
  files: { file: File; preview: string; type: "image" | "video" }[];
  isOpen: boolean;
  close: () => void;
  chooseWM?: File;
}
