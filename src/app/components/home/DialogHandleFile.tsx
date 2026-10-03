"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Move,
  Circle,
  Download,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Type,
  ImageIcon,
  Grid3X3,
  FileDown,
  Layers,
  Palette,
} from "lucide-react";
import {
  DialogHandleFileProps,
  WatermarkConfig,
  WatermarkMode,
  WatermarkPosition,
} from "@/types/watermark";
import {
  drawWatermarkOnCanvas,
  getWatermarkBounds,
  isPointInsideWatermark,
  processImageWatermark,
  processVideoWatermark,
} from "@/utils/watermark";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// requestVideoFrameCallback is not yet in every TS DOM lib version
type VideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const PRESET_FONTS = [
  { id: "Outfit, sans-serif", name: "Outfit (Hiện đại)" },
  { id: "Inter, sans-serif", name: "Inter (Tối giản)" },
  { id: "Montserrat, sans-serif", name: "Montserrat (Mạnh mẽ)" },
  { id: "'Playfair Display', serif", name: "Playfair Display (Cổ điển)" },
  { id: "Pacifico, cursive", name: "Pacifico (Viết tay nghệ thuật)" },
  { id: "'Roboto Mono', monospace", name: "Roboto Mono (Công nghệ)" },
];

const PRESET_COLORS = [
  { label: "Trắng", value: "#ffffff" },
  { label: "Đen", value: "#000000" },
  { label: "Vàng Gold", value: "#fbbf24" },
  { label: "Đỏ", value: "#ef4444" },
  { label: "Xanh Cyan", value: "#06b6d4" },
  { label: "Lục Emerald", value: "#10b981" },
];

const POSITION_PRESETS: { id: WatermarkPosition; label: string; short: string }[] = [
  { id: "top-left", label: "Góc trái trên", short: "TL" },
  { id: "top-right", label: "Góc phải trên", short: "TR" },
  { id: "center", label: "Chính giữa", short: "C" },
  { id: "bottom-left", label: "Góc trái dưới", short: "BL" },
  { id: "bottom-right", label: "Góc phải dưới", short: "BR" },
];

export default function DialogHandleFile({
  files,
  isOpen,
  close,
  chooseWM,
}: DialogHandleFileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = files[currentIndex];
  const currentFile = currentItem?.file;
  const isVideo =
    currentItem?.type === "video" ||
    (currentFile ? currentFile.type.startsWith("video/") : false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Radix Dialog mounts its Portal content one commit AFTER `open` becomes true,
  // so `videoRef.current` is still null when effects first run on open.
  // Tracking the node in state re-triggers the load effect once it is mounted.
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [watermark, setWatermark] = useState<HTMLImageElement | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Mode: "image" or "text"
  const [mode, setMode] = useState<WatermarkMode>("image");

  // Common parameters
  const [opacity, setOpacity] = useState(0.8);
  const [scale, setScale] = useState(0.25);
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Tiling mode
  const [isTiled, setIsTiled] = useState(false);
  const [tileGap, setTileGap] = useState(120);

  // Text watermark state
  const [text, setText] = useState("© BẢN QUYỀN HÌNH ẢNH");
  const [fontFamily, setFontFamily] = useState("Outfit, sans-serif");
  const [textColor, setTextColor] = useState("#ffffff");
  const [hasShadow, setHasShadow] = useState(true);

  // Canvas direct drag interaction
  const [isHoveringWatermark, setIsHoveringWatermark] = useState(false);
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  }>({ startX: 0, startY: 0, initialOffsetX: 0, initialOffsetY: 0 });

  // Video preview player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Processing state
  const [loading, setLoading] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const isBusy = isProcessingAll || isProcessingSingle;

  // Build current WatermarkConfig object with useMemo
  const currentConfig: WatermarkConfig = useMemo(
    () => ({
      mode,
      opacity,
      scale,
      position,
      rotation,
      offsetX,
      offsetY,
      isTiled,
      tileGap,
      textConfig: {
        text,
        fontFamily,
        color: textColor,
        hasShadow,
        shadowColor: "rgba(0, 0, 0, 0.85)",
      },
    }),
    [
      mode,
      opacity,
      scale,
      position,
      rotation,
      offsetX,
      offsetY,
      isTiled,
      tileGap,
      text,
      fontFamily,
      textColor,
      hasShadow,
    ]
  );

  // Compute visual-to-original coordinate scale factor for preview canvas
  const getPreviewScale = useCallback(() => {
    if (
      !canvasRef.current ||
      !originalDimensions.width ||
      originalDimensions.width === 0 ||
      canvasRef.current.width === 0
    ) {
      return 1;
    }
    const scaleX = canvasRef.current.width / originalDimensions.width;
    const scaleY = canvasRef.current.height / originalDimensions.height;
    return Math.min(scaleX, scaleY) || 1;
  }, [originalDimensions]);

  // Keyboard navigation for nudge offsets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isBusy || isTiled) return;

      // Don't intercept arrow keys if user is focused inside an input or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight"
      ) {
        return;
      }

      e.preventDefault();

      const scale = getPreviewScale();
      // On-screen visual step: 2px for normal, 10px when Shift is held
      const visualStep = e.shiftKey ? 10 : 2;
      // Convert to underlying coordinate step
      const actualStep = Math.max(1, Math.round(visualStep / scale));

      switch (e.key) {
        case "ArrowUp":
          setOffsetY((prev) => prev - actualStep);
          break;
        case "ArrowDown":
          setOffsetY((prev) => prev + actualStep);
          break;
        case "ArrowLeft":
          setOffsetX((prev) => prev - actualStep);
          break;
        case "ArrowRight":
          setOffsetX((prev) => prev + actualStep);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isBusy, isTiled, getPreviewScale]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setOffsetX(0);
      setOffsetY(0);
      setCurrentIndex(0);
      setProgress(0);
      setProcessingStatus("");
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsDraggingWatermark(false);
      setIsHoveringWatermark(false);
    }
  }, [isOpen]);

  // Calculate canvas size to fit preview container keeping aspect ratio
  const calculateCanvasSize = useCallback(
    (mediaWidth: number, mediaHeight: number) => {
      if (!previewContainerRef.current || mediaWidth === 0 || mediaHeight === 0) {
        return { width: 0, height: 0 };
      }

      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth || 600;
      const containerHeight = container.clientHeight || 450;

      const mediaRatio = mediaWidth / mediaHeight;
      const containerRatio = containerWidth / containerHeight;

      let width = 0;
      let height = 0;

      if (containerRatio > mediaRatio) {
        height = Math.min(mediaHeight, containerHeight);
        width = height * mediaRatio;
      } else {
        width = Math.min(mediaWidth, containerWidth);
        height = width / mediaRatio;
      }

      return { width, height };
    },
    []
  );

  // Pure canvas draw function for preview
  const drawPreview = useCallback(() => {
    if (!canvasRef.current || originalDimensions.width === 0) {
      return;
    }

    if (mode === "image" && (!watermark || watermark.width === 0)) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background media
    if (!isVideo && image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else if (isVideo && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Calculate preview scale factor
    const scaleX = canvas.width / originalDimensions.width;
    const scaleY = canvas.height / originalDimensions.height;
    const previewScale = Math.min(scaleX, scaleY);

    // Draw watermark using unified rendering utility
    drawWatermarkOnCanvas({
      ctx,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      watermark,
      config: currentConfig,
      previewScale,
    });
  }, [
    image,
    watermark,
    originalDimensions,
    isVideo,
    mode,
    currentConfig,
  ]);

  // Always-fresh reference for native event listeners / frame loops (avoids stale closures
  // and avoids re-subscribing listeners every time a control changes)
  const drawPreviewRef = useRef(drawPreview);
  useEffect(() => {
    drawPreviewRef.current = drawPreview;
  }, [drawPreview]);

  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());

  // Helper to preload an image by index
  const preloadIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= files.length) return;
      const target = files[index];
      if (!target || target.type === "video" || imageCacheRef.current.has(index)) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCacheRef.current.set(index, img);
      };
      img.src = target.preview;
    },
    [files]
  );

  // Preload adjacent images in the background for zero-latency slide switching
  useEffect(() => {
    if (!isOpen) {
      imageCacheRef.current.clear();
      return;
    }
    preloadIndex(currentIndex);
    preloadIndex(currentIndex + 1);
    preloadIndex(currentIndex - 1);
    preloadIndex(currentIndex + 2);
  }, [isOpen, currentIndex, preloadIndex]);

  // Load watermark ONLY when dialog opens or chooseWM changes (not on every slide!)
  useEffect(() => {
    if (!isOpen) return;

    let activeWmUrl = "";
    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.onload = () => {
      setWatermark(wm);
    };

    if (chooseWM) {
      activeWmUrl = URL.createObjectURL(chooseWM);
      wm.src = activeWmUrl;
    } else {
      wm.src = "/watermark.png";
    }

    return () => {
      if (activeWmUrl) {
        URL.revokeObjectURL(activeWmUrl);
      }
    };
  }, [isOpen, chooseWM]);

  // Smooth media switching without jarring flash or black skeleton
  useEffect(() => {
    if (!isOpen || !currentItem) return;

    setIsPlaying(false);
    setCurrentTime(0);

    if (!isVideo) {
      const applyLoadedImage = (img: HTMLImageElement) => {
        setOriginalDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        const { width, height } = calculateCanvasSize(
          img.naturalWidth,
          img.naturalHeight
        );
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
        setImage(img);
        setLoading(false);
      };

      // Check if image is already cached
      const cached = imageCacheRef.current.get(currentIndex);
      if (cached && cached.complete && cached.naturalWidth > 0) {
        // INSTANT 0ms switch without blanking or showing skeleton!
        applyLoadedImage(cached);
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCacheRef.current.set(currentIndex, img);
          applyLoadedImage(img);
        };
        img.onerror = () => {
          setLoading(false);
          console.error("Failed to load image");
        };
        img.src = currentItem.preview;
      }
    } else {
      // For video: size the canvas as soon as metadata is known, but only hide the
      // loader once the first frame is decoded so the preview never appears blank.
      setLoading(true);
      if (!videoElement) return; // Effect re-runs when the <video> node mounts

      const handleMetadata = () => {
        setOriginalDimensions({
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
        });
        setDuration(videoElement.duration || 0);

        const { width, height } = calculateCanvasSize(
          videoElement.videoWidth,
          videoElement.videoHeight
        );

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      };

      // First frame decoded -> flipping `loading` triggers the paused redraw effect below
      const handleFirstFrame = () => setLoading(false);

      // Paint the exact frame once a seek has finished decoding
      const handleSeeked = () => drawPreviewRef.current();

      const handleError = () => {
        setLoading(false);
        console.error("Failed to load video");
      };

      videoElement.addEventListener("loadedmetadata", handleMetadata);
      videoElement.addEventListener("loadeddata", handleFirstFrame);
      videoElement.addEventListener("canplay", handleFirstFrame);
      videoElement.addEventListener("seeked", handleSeeked);
      videoElement.addEventListener("error", handleError);

      if (videoElement.src !== currentItem.preview) {
        videoElement.src = currentItem.preview;
      } else {
        // Same source already attached: events may have fired already
        if (videoElement.readyState >= 1) handleMetadata();
        if (videoElement.readyState >= 2) handleFirstFrame();
      }

      return () => {
        videoElement.pause();
        videoElement.removeEventListener("loadedmetadata", handleMetadata);
        videoElement.removeEventListener("loadeddata", handleFirstFrame);
        videoElement.removeEventListener("canplay", handleFirstFrame);
        videoElement.removeEventListener("seeked", handleSeeked);
        videoElement.removeEventListener("error", handleError);
      };
    }
  }, [currentIndex, isOpen, isVideo, currentItem, calculateCanvasSize, videoElement]);

  // Playback render loop: paint only when the decoder delivers a new frame.
  // No React state is updated per frame (currentTime is synced via `timeupdate`).
  useEffect(() => {
    const video = videoRef.current as VideoElementWithFrameCallback | null;
    if (!isVideo || !isPlaying || !video) return;

    const requestFrame = video.requestVideoFrameCallback?.bind(video);
    const cancelFrame = video.cancelVideoFrameCallback?.bind(video);
    let rafId = 0;
    let frameCallbackId = 0;
    let isActive = true;

    const renderFrame = () => {
      if (!isActive) return;
      drawPreviewRef.current();
      if (requestFrame) {
        frameCallbackId = requestFrame(renderFrame);
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      isActive = false;
      cancelAnimationFrame(rafId);
      if (cancelFrame && frameCallbackId) cancelFrame(frameCallbackId);
    };
  }, [isVideo, isPlaying]);

  // Re-draw preview when controls change while video is paused or media is image,
  // and as soon as media finishes loading (first video frame becomes available)
  useEffect(() => {
    if (!isPlaying && !loading) {
      drawPreview();
    }
  }, [isPlaying, loading, drawPreview]);

  // Helper to convert pointer/touch event into internal Canvas coordinate space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Direct canvas pointer move: handles dragging with capture, or hover hit-test
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isTiled || isBusy) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    const scale = getPreviewScale();

    if (isDraggingWatermark) {
      e.preventDefault();
      const deltaX = (coords.x - dragStartRef.current.startX) / scale;
      const deltaY = (coords.y - dragStartRef.current.startY) / scale;
      setOffsetX(Math.round(dragStartRef.current.initialOffsetX + deltaX));
      setOffsetY(Math.round(dragStartRef.current.initialOffsetY + deltaY));
      return;
    }

    // Check hit test for hover cursor state
    const bounds = getWatermarkBounds({
      ctx,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      watermark,
      config: currentConfig,
      previewScale: scale,
    });

    const isHit = isPointInsideWatermark(coords.x, coords.y, bounds, rotation, 16);
    setIsHoveringWatermark(isHit);
  };

  // Direct canvas pointer down: click-to-place OR grab existing watermark with capture
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only respond to primary mouse button / touch
    if (!canvasRef.current || isTiled || isBusy) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const coords = getCanvasCoords(e);
    const scale = getPreviewScale();

    const currentBounds = getWatermarkBounds({
      ctx,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      watermark,
      config: currentConfig,
      previewScale: scale,
    });

    const isHit = isPointInsideWatermark(coords.x, coords.y, currentBounds, rotation, 20);

    if (isHit) {
      // Grab existing watermark seamlessly from contact point
      setIsDraggingWatermark(true);
      dragStartRef.current = {
        startX: coords.x,
        startY: coords.y,
        initialOffsetX: offsetX,
        initialOffsetY: offsetY,
      };
    } else {
      // Clicked anywhere on image: place watermark center directly at click point & start dragging
      const baseBounds = getWatermarkBounds({
        ctx,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        watermark,
        config: { ...currentConfig, offsetX: 0, offsetY: 0 },
        previewScale: scale,
      });

      const newOffsetX = Math.round((coords.x - baseBounds.centerX) / scale);
      const newOffsetY = Math.round((coords.y - baseBounds.centerY) / scale);

      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);

      setIsDraggingWatermark(true);
      dragStartRef.current = {
        startX: coords.x,
        startY: coords.y,
        initialOffsetX: newOffsetX,
        initialOffsetY: newOffsetY,
      };
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingWatermark) {
      setIsDraggingWatermark(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
  };

  // Video play/pause toggle
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Video play failed:", err));
    }
  };

  // Video seek handler
  const handleSeek = (values: number[]) => {
    const newTime = values[0];
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    // Frame is painted by the `seeked` listener once the new frame is decoded
  };

  // Video mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Quick snap to preset position and reset manual offset
  const handleQuickSnapPosition = (pos: WatermarkPosition) => {
    setPosition(pos);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Export ONLY the currently displayed file
  const handleDownloadCurrent = async () => {
    if (mode === "image" && !watermark) return;
    if (!currentItem) return;

    setIsProcessingSingle(true);
    setProgress(0);
    setProcessingStatus(`Đang xuất: ${currentFile.name}...`);

    try {
      const baseName = currentFile.name.replace(/\.[^/.]+$/, "");

      if (isVideo) {
        const { blob, extension } = await processVideoWatermark(
          currentFile,
          watermark,
          currentConfig,
          (percent) => {
            setProgress(percent);
            setProcessingStatus(`Đang xuất video: ${currentFile.name} (${percent}%)`);
          }
        );
        saveAs(blob, `${baseName}_watermarked.${extension}`);
      } else {
        const { blob, extension } = await processImageWatermark(
          currentFile,
          watermark,
          currentConfig
        );
        saveAs(blob, `${baseName}_watermarked.${extension}`);
      }
    } catch (error) {
      console.error("Lỗi khi tải tệp đơn:", error);
      alert(
        "Không thể xuất tệp này: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsProcessingSingle(false);
      setProgress(0);
      setProcessingStatus("");
    }
  };

  // Sequential batch export for all files
  const handleAddWaterAll = async () => {
    if (mode === "image" && !watermark) return;

    setIsProcessingAll(true);
    setProgress(0);
    setProcessingStatus("Bắt đầu xử lý hàng loạt...");

    try {
      const zip = new JSZip();
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const item = files[i];
        const file = item.file;
        const isItemVideo =
          item.type === "video" || file.type.startsWith("video/");
        const fileNumberStr = `[${i + 1}/${totalFiles}]`;
        const baseName = file.name.replace(/\.[^/.]+$/, "");

        setProcessingStatus(`${fileNumberStr} Đang xử lý: ${file.name}`);

        if (isItemVideo) {
          const { blob, extension } = await processVideoWatermark(
            file,
            watermark,
            currentConfig,
            (videoPercent) => {
              const overallPercent = Math.round(
                ((i + videoPercent / 100) / totalFiles) * 100
              );
              setProgress(overallPercent);
              setProcessingStatus(
                `${fileNumberStr} Đang render video: ${file.name} (${videoPercent}%)`
              );
            }
          );
          zip.file(`${baseName}_watermarked.${extension}`, blob);
        } else {
          const { blob, extension } = await processImageWatermark(
            file,
            watermark,
            currentConfig
          );
          zip.file(`${baseName}_watermarked.${extension}`, blob);
        }

        const overallDone = Math.round(((i + 1) / totalFiles) * 100);
        setProgress(overallDone);
      }

      setProcessingStatus("Đang nén tệp ZIP và chuẩn bị tải về...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "watermarked_media.zip");
      close();
    } catch (error) {
      console.error("Lỗi khi xử lý watermark:", error);
      alert(
        "Đã xảy ra sự cố trong quá trình xuất: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsProcessingAll(false);
      setProgress(0);
      setProcessingStatus("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isBusy ? undefined : close}>
      <DialogContent className="w-[96vw] max-w-6xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden shadow-2xl rounded-2xl border">
        {/* Header with Title and Mode Switch Tabs */}
        <DialogHeader className="pb-4 border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Studio Chỉnh Sửa Watermark</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Xem trước thời gian thực và tùy biến con dấu bản quyền cho ảnh & video
              </DialogDescription>
            </div>

            {/* Mode Switch Tabs */}
            <Tabs
              value={mode}
              onValueChange={(val) => setMode(val as WatermarkMode)}
              className="w-auto shrink-0"
            >
              <TabsList className="h-9 p-1 bg-muted/80 border">
                <TabsTrigger value="image" className="text-xs gap-1.5 px-3.5 h-7">
                  <ImageIcon className="w-3.5 h-3.5" /> Logo Ảnh
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs gap-1.5 px-3.5 h-7">
                  <Type className="w-3.5 h-3.5" /> Chữ Bản Quyền
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* Studio Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-auto py-2 pr-1">
          {/* Left Column: Watermark Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-1">
            {/* Mode Specific Controls: Text Watermark */}
            {mode === "text" && (
              <div className="p-4 bg-muted/40 border border-border/70 rounded-xl space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Type className="w-3.5 h-3.5" /> Cài đặt văn bản chữ
                </div>

                {/* Text Content */}
                <div>
                  <Label htmlFor="wm-text" className="text-xs font-medium mb-1 block">
                    Nội dung văn bản
                  </Label>
                  <Input
                    id="wm-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ví dụ: © THANH STUDIO"
                    className="h-9 text-xs"
                    disabled={isBusy}
                  />
                </div>

                {/* Font Family */}
                <div>
                  <Label className="text-xs font-medium mb-1 block">Phông chữ</Label>
                  <Select
                    value={fontFamily}
                    onValueChange={setFontFamily}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_FONTS.map((font) => (
                        <SelectItem
                          key={font.id}
                          value={font.id}
                          style={{ fontFamily: font.id }}
                          className="text-xs"
                        >
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Text Color Swatches & Custom Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Palette className="w-3 h-3 text-muted-foreground" /> Màu chữ
                    </Label>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase">
                      {textColor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setTextColor(col.value)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer",
                          textColor.toLowerCase() === col.value.toLowerCase()
                            ? "scale-110 border-primary ring-2 ring-primary/40 shadow-xs"
                            : "border-border/70 hover:scale-105"
                        )}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      >
                        {textColor.toLowerCase() === col.value.toLowerCase() && (
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              col.value === "#ffffff" ? "bg-black" : "bg-white"
                            )}
                          />
                        )}
                      </button>
                    ))}

                    {/* Native custom color input */}
                    <div className="relative flex items-center ml-1">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded-full border border-border/80 cursor-pointer p-0 bg-transparent overflow-hidden"
                        title="Chọn mã màu tùy ý"
                      />
                    </div>
                  </div>
                </div>

                {/* Drop shadow checkbox */}
                <label className="flex items-center gap-2.5 p-2 bg-background/60 border rounded-lg cursor-pointer hover:bg-background transition-colors">
                  <input
                    type="checkbox"
                    checked={hasShadow}
                    onChange={(e) => setHasShadow(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-medium text-foreground">
                    Đổ bóng tương phản (giúp chữ nổi bật trên mọi màu nền)
                  </span>
                </label>
              </div>
            )}

            {/* Scale control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="scale-slider" className="text-xs font-medium">
                  {mode === "text" ? "Cỡ chữ" : "Kích thước con dấu"}
                </Label>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <Slider
                id="scale-slider"
                min={0.05}
                max={1.5}
                step={0.05}
                value={[scale]}
                onValueChange={([val]) => setScale(val)}
                disabled={isBusy}
              />
            </div>

            {/* Opacity control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="opacity-slider" className="text-xs font-medium">
                  Độ mờ đục (Opacity)
                </Label>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <Slider
                id="opacity-slider"
                min={0.05}
                max={1}
                step={0.05}
                value={[opacity]}
                onValueChange={([val]) => setOpacity(val)}
                disabled={isBusy}
              />
            </div>

            {/* Rotation control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="rotation-slider" className="text-xs font-medium">
                  Góc xoay
                </Label>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {rotation}°
                </span>
              </div>
              <Slider
                id="rotation-slider"
                min={-180}
                max={180}
                step={1}
                value={[rotation]}
                onValueChange={([val]) => setRotation(val)}
                disabled={isBusy}
              />
            </div>

            {/* Position Controls: Quick 5 buttons + Select */}
            {!isTiled && (
              <div className="space-y-2">
                <Label className="text-xs font-medium block">Vị trí con dấu</Label>

                {/* Quick 5 Corner Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {POSITION_PRESETS.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant={position === p.id && offsetX === 0 && offsetY === 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickSnapPosition(p.id)}
                      disabled={isBusy}
                      className="h-8 text-[11px] font-semibold px-1"
                      title={p.label}
                    >
                      {p.short}
                    </Button>
                  ))}
                </div>

                <Select
                  value={position}
                  onValueChange={(val) => handleQuickSnapPosition(val as WatermarkPosition)}
                  disabled={isBusy}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Chọn vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Góc phải dưới (Mặc định)</SelectItem>
                    <SelectItem value="bottom-left">Góc trái dưới</SelectItem>
                    <SelectItem value="top-right">Góc phải trên</SelectItem>
                    <SelectItem value="top-left">Góc trái trên</SelectItem>
                    <SelectItem value="center">Chính giữa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tiling pattern toggle */}
            <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" />
                  <div>
                    <div className="text-xs font-semibold">Chế độ phủ kín (Lưới lặp lại)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Chống cắt xén ảnh (Anti-crop protection)
                    </div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isTiled}
                  onChange={(e) => setIsTiled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  disabled={isBusy}
                />
              </div>

              {isTiled && (
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Khoảng cách lưới</span>
                    <span className="font-mono">{tileGap}px</span>
                  </div>
                  <Slider
                    min={60}
                    max={240}
                    step={10}
                    value={[tileGap]}
                    onValueChange={([val]) => setTileGap(val)}
                  />
                </div>
              )}
            </div>

            {/* Interactive hint & Reset toolbar */}
            <div className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-xl text-xs">
              <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5">
                <p>💡 <span className="font-medium text-foreground">Kéo thả chuột trên ảnh</span> để đặt vị trí.</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Phím mũi tên (Shift = 10px).</span>
                  {(offsetX !== 0 || offsetY !== 0) && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                      X: {offsetX > 0 ? `+${offsetX}` : offsetX} | Y: {offsetY > 0 ? `+${offsetY}` : offsetY}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      disabled={isBusy || (offsetX === 0 && offsetY === 0)}
                      className="h-7 px-2 text-xs"
                    >
                      <Move className="h-3.5 w-3.5 mr-1" />
                      <span>Vị trí</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Đặt lại vị trí ban đầu (0, 0)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation(0)}
                      disabled={isBusy || rotation === 0}
                      className="h-7 px-2 text-xs"
                    >
                      <RotateCw className="h-3.5 w-3.5 mr-1" />
                      <span>Góc 0°</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Đặt lại góc xoay về 0°</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right Column: Preview Studio & Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[420px]">
            {/* Canvas Container with subtle dark studio texture */}
            <div
              ref={previewContainerRef}
              className={cn(
                "relative border rounded-2xl overflow-hidden flex items-center justify-center min-h-[380px] lg:min-h-[440px] flex-1 select-none shadow-inner",
                "bg-[#0f172a] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]",
                isDraggingWatermark
                  ? "cursor-grabbing"
                  : isHoveringWatermark && !isTiled
                  ? "cursor-grab"
                  : "cursor-default"
              )}
            >
              {loading && (
                <div className="flex flex-col absolute inset-0 z-10 bg-black/40 backdrop-blur-xs items-center justify-center pointer-events-none transition-opacity">
                  <Circle className="w-8 h-8 animate-spin text-primary" />
                  <p className="mt-2 text-xs text-white/80 font-medium">
                    Đang nạp {isVideo ? "video" : "ảnh"}...
                  </p>
                </div>
              )}

              {/* Status pills on top of preview */}
              {!loading && !isTiled && (
                <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white/90 text-[11px] px-3 py-1 rounded-full border border-white/15 flex items-center gap-1.5 shadow-sm">
                  <Move className="w-3 h-3 text-primary" />
                  <span>Kéo con dấu tự do</span>
                </div>
              )}

              {!loading && isTiled && (
                <div className="absolute top-3 left-3 z-10 bg-indigo-600/90 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full border border-indigo-400/30 flex items-center gap-1.5 shadow-sm">
                  <Grid3X3 className="w-3 h-3" />
                  <span>Đang bật lưới lặp lại</span>
                </div>
              )}

              {/* Visually hidden (but still rendered) video used as canvas frame source.
                  Avoiding display:none keeps frame decoding & requestVideoFrameCallback
                  active in every browser (notably Safari). */}
              <video
                ref={setVideoNode}
                aria-hidden="true"
                className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none"
                playsInline
                muted={isMuted}
                loop
                preload="auto"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setIsPlaying(false)}
              />

              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className={cn(
                  "max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-150 touch-none select-none",
                  isTiled
                    ? "cursor-default"
                    : isDraggingWatermark
                    ? "cursor-grabbing"
                    : isHoveringWatermark
                    ? "cursor-grab"
                    : "cursor-crosshair"
                )}
              />
            </div>

            {/* Video Controls bar */}
            {isVideo && !loading && (
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-muted/60 border rounded-xl text-xs shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Slider
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  className="flex-1"
                />

                <span className="tabular-nums font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Slide Navigation Bar with clean non-wrapping pagination */}
            {files.length > 1 && (
              <div className="flex items-center justify-between gap-3 p-2 bg-muted/40 border border-border/70 rounded-xl shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0 || isBusy}
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                </Button>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold px-3 py-1 bg-background border shadow-2xs rounded-full whitespace-nowrap tabular-nums text-foreground">
                    {currentIndex + 1} / {files.length}
                  </span>

                  <span
                    className="text-xs text-muted-foreground truncate hidden sm:inline-block max-w-[220px]"
                    title={currentFile?.name}
                  >
                    {currentFile?.name}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === files.length - 1 || isBusy}
                  className="h-8 px-3 text-xs"
                >
                  Tiếp <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Processing Progress Notification */}
        {isBusy && (
          <div className="mt-2 p-3 bg-muted/80 rounded-xl space-y-2 border shrink-0">
            <div className="flex justify-between text-xs font-medium">
              <span className="truncate pr-2">{processingStatus}</span>
              <span className="tabular-nums font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Dialog Footer Actions */}
        <DialogFooter className="pt-3 border-t border-border/70 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={close}
            disabled={isBusy}
            className="w-full sm:w-auto h-9"
          >
            Đóng
          </Button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Single Download button */}
            <Button
              variant="secondary"
              onClick={handleDownloadCurrent}
              disabled={isBusy || loading}
              className="gap-2 flex-1 sm:flex-initial h-9"
            >
              {isProcessingSingle ? (
                <>
                  <Circle className="h-4 w-4 animate-spin text-primary" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  <span>Tải tệp này</span>
                </>
              )}
            </Button>

            {/* Batch ZIP Download button */}
            <Button
              onClick={handleAddWaterAll}
              disabled={isBusy || loading}
              className="gap-2 flex-1 sm:flex-initial h-9 font-semibold shadow-md shadow-primary/20"
            >
              {isProcessingAll ? (
                <>
                  <Circle className="h-4 w-4 animate-spin" />
                  <span>Đang đóng gói ({progress}%)</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Tải tất cả ZIP ({files.length})</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
