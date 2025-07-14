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

type Position =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center";

export default function DialogHandleFile({
  files,
  isOpen,
  close,
  chooseWM,
}: DialogProps) {
  const file = files[0]?.file;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [watermark, setWatermark] = useState<HTMLImageElement | null>(null);

  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(0.2);
  const [position, setPosition] = useState<Position>("bottom-right");

  const [loading, setLoading] = useState(true);

  const [rotation, setRotation] = useState(0);

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const step = 5; // bước di chuyển

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

  useEffect(() => {
    if (!isOpen) {
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [isOpen]);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image || !watermark) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const wmWidth = watermark.width * scale;
    const wmHeight = watermark.height * scale;

    const padding = 10;
    let x = 0;
    let y = 0;

    // Tính vị trí gốc
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

    // Áp dụng offset từ bàn phím
    x += offsetX;
    y += offsetY;

    // Vẽ watermark có xoay, scale, opacity
    ctx.save();
    ctx.globalAlpha = opacity;

    const centerX = x + wmWidth / 2;
    const centerY = y + wmHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.drawImage(watermark, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }, [image, watermark, opacity, scale, position, rotation, offsetX, offsetY]);

  // Load images on dialog open
  useEffect(() => {
    if (!isOpen || !file) return;

    const img = new Image();
    const wm = new Image();

    setLoading(true);

    img.onload = () => {
      setImage(img); // đặt ảnh nền trước
    };

    wm.onload = () => {
      setWatermark(wm); // chỉ setWatermark sau khi đã load hoàn tất
      setLoading(false);
    };

    // Reset image trước khi load cái mới (tránh bị đè)
    setImage(null);
    setWatermark(null);

    img.src = URL.createObjectURL(file);
    wm.src = chooseWM ? URL.createObjectURL(chooseWM) : "/watermark.jpg";

    // cleanup object URLs khi component unmount hoặc file/chooseWM thay đổi
    return () => {
      URL.revokeObjectURL(img.src);
      URL.revokeObjectURL(wm.src);
    };
  }, [file, isOpen, chooseWM]);

  // Redraw when state changes
  useEffect(() => {
    if (!image || !watermark) return;
    drawCanvas();
  }, [image, watermark, opacity, scale, position, drawCanvas]);

  const handleAddWaterAll = async () => {
    if (!watermark) return;

    setIsProcessing(true);

    try {
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;

        const img = new Image();
        const imageLoad = new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });

        const loadedImage = await imageLoad;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = loadedImage.width;
        canvas.height = loadedImage.height;

        ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

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

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.95)
        );
        if (blob) {
          zip.file(`image_${i + 1}.jpg`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "watermarked_images.zip");

      close(); // đóng dialog
    } catch (error) {
      console.error("Error while processing:", error);
    } finally {
      setIsProcessing(false); // ✅ hoàn tất
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Watermark</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Tùy chọn */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Độ mờ</label>
              <Input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Kích thước</label>
              <Input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Vị trí</label>
              <select
                className="w-full border rounded p-2"
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
              >
                <option value="bottom-right">Góc phải dưới</option>
                <option value="bottom-left">Góc trái dưới</option>
                <option value="top-right">Góc phải trên</option>
                <option value="top-left">Góc trái trên</option>
                <option value="center">Giữa ảnh</option>
              </select>
            </div>
            <>
              <label>Góc xoay</label>
              <Input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
              />
            </>
          </div>

          {/* Canvas preview */}
          <div
            className="relative border rounded overflow-auto"
            style={{ maxWidth: 500, maxHeight: 500, minHeight: 300 }}
          >
            {loading && (
              <div className="flex flex-col absolute inset-0 z-10 bg-white/80 items-center justify-center">
                <Skeleton className="w-[200px] h-[200px] rounded" />
                <p className="leading-7 [&:not(:first-child)]:mt-6">
                  Đang tải ảnh, Vui lòng chờ!
                </p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="secondary"
            onClick={close}
            className=" cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            onClick={handleAddWaterAll}
            disabled={isProcessing}
            className=" cursor-pointer"
          >
            gắn toàn bộ ảnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
