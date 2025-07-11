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
import { DialogProps } from "@/types/Home";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DialogHandleFile({ file, isOpen, close }: DialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(
    null
  );

  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(0.3);
  const [position, setPosition] = useState("bottom-right");

  const [loading, setLoading] = useState(true);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;

    setLoading(true);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to match base image
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0);

    if (watermarkImage) {
      const wmWidth = watermarkImage.width * scale;
      const wmHeight = watermarkImage.height * scale;

      let x = 0;
      let y = 0;
      const padding = 10;

      switch (position) {
        case "top-left":
          x = padding;
          y = padding;
          break;
        case "top-right":
          x = canvas.width - wmWidth - padding;
          y = padding;
          break;
        case "bottom-left":
          x = padding;
          y = canvas.height - wmHeight - padding;
          break;
        case "bottom-right":
          x = canvas.width - wmWidth - padding;
          y = canvas.height - wmHeight - padding;
          break;
        case "center":
          x = canvas.width / 2 - wmWidth / 2;
          y = canvas.height / 2 - wmHeight / 2;
          break;
      }

      ctx.globalAlpha = opacity;
      ctx.drawImage(watermarkImage, x, y, wmWidth, wmHeight);
      ctx.globalAlpha = 1;
    }

    setTimeout(() => setLoading(false), 300); // simulate delay
  }, [baseImage, watermarkImage, scale, opacity, position]);

  // Load base image
  useEffect(() => {
    if (!file[0]?.file) return;

    setLoading(true);
    const img = new Image();
    img.onload = () => setBaseImage(img);
    img.src = URL.createObjectURL(file[0].file);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [file]);

  // Load watermark image
  useEffect(() => {
    const wm = new Image();
    wm.onload = () => setWatermarkImage(wm);
    wm.src = "/watermark.jpg"; // Hoặc user chọn
  }, []);

  // Redraw every time inputs change
  useEffect(() => {
    if (baseImage && watermarkImage) drawCanvas();
  }, [drawCanvas, baseImage, watermarkImage]);

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
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="bottom-right">Góc phải dưới</option>
                <option value="bottom-left">Góc trái dưới</option>
                <option value="top-right">Góc phải trên</option>
                <option value="top-left">Góc trái trên</option>
                <option value="center">Giữa ảnh</option>
              </select>
            </div>
          </div>

          {/* Canvas preview */}
          <div
            className="relative border rounded overflow-auto"
            style={{ maxWidth: 500, maxHeight: 500, minHeight: 300 }}
          >
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
                <Skeleton className="w-[200px] h-[200px] rounded" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={close}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;

              const dataUrl = canvas.toDataURL("image/png");
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = "watermarked.png";
              a.click();
            }}
          >
            Lưu ảnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
