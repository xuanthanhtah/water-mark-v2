import { WatermarkConfig, WatermarkPosition } from "@/types/watermark";

export interface DrawWatermarkOptions {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  watermark: HTMLImageElement | null;
  config: WatermarkConfig;
  previewScale?: number; // 1 for full resolution export, or previewScale < 1 for preview canvas
}

export interface WatermarkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculates the bounding box and center coordinate of the watermark
 * before rotation is applied.
 */
export function getWatermarkBounds({
  ctx,
  canvasWidth,
  canvasHeight,
  watermark,
  config,
  previewScale = 1,
}: DrawWatermarkOptions): WatermarkBounds {
  const { mode, scale, position, offsetX, offsetY, textConfig } = config;

  let wmWidth = 100;
  let wmHeight = 100;

  if (mode === "text") {
    const text = textConfig?.text || "© WATERMARK";
    const fontFamily = textConfig?.fontFamily || "Inter, sans-serif";
    const fontSize = Math.max(12, 120 * scale * previewScale);
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    wmWidth = metrics.width;
    wmHeight = fontSize;
  } else if (watermark && watermark.width > 0) {
    wmWidth = watermark.width * scale * previewScale;
    wmHeight = watermark.height * scale * previewScale;
  }

  const padding = 16 * previewScale;
  let x = 0;
  let y = 0;

  switch (position) {
    case "bottom-right":
      x = canvasWidth - wmWidth - padding;
      y = canvasHeight - wmHeight - padding;
      break;
    case "bottom-left":
      x = padding;
      y = canvasHeight - wmHeight - padding;
      break;
    case "top-right":
      x = canvasWidth - wmWidth - padding;
      y = padding;
      break;
    case "top-left":
      x = padding;
      y = padding;
      break;
    case "center":
      x = (canvasWidth - wmWidth) / 2;
      y = (canvasHeight - wmHeight) / 2;
      break;
  }

  // Apply manual offsets
  x += offsetX * previewScale;
  y += offsetY * previewScale;

  return {
    x,
    y,
    width: wmWidth,
    height: wmHeight,
    centerX: x + wmWidth / 2,
    centerY: y + wmHeight / 2,
  };
}

/**
 * Checks if a point (px, py) on the canvas falls inside the rotated watermark bounding box.
 */
export function isPointInsideWatermark(
  px: number,
  py: number,
  bounds: WatermarkBounds,
  rotationDegrees: number,
  hitTolerance: number = 16
): boolean {
  const rad = (-rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = px - bounds.centerX;
  const dy = py - bounds.centerY;

  // Unrotate point around center
  const unrotatedX = bounds.centerX + dx * cos - dy * sin;
  const unrotatedY = bounds.centerY + dx * sin + dy * cos;

  // Hit test with customizable tolerance
  return (
    unrotatedX >= bounds.x - hitTolerance &&
    unrotatedX <= bounds.x + bounds.width + hitTolerance &&
    unrotatedY >= bounds.y - hitTolerance &&
    unrotatedY <= bounds.y + bounds.height + hitTolerance
  );
}

/**
 * Draws the watermark onto a canvas 2D context using uniform coordinates and math.
 * Handles both Image and Text modes, Single position and Tiling (Pattern) mode.
 */
export function drawWatermarkOnCanvas({
  ctx,
  canvasWidth,
  canvasHeight,
  watermark,
  config,
  previewScale = 1,
}: DrawWatermarkOptions) {
  const { mode, opacity, rotation, isTiled, textConfig } = config;

  if (mode === "image" && (!watermark || watermark.width === 0)) {
    return;
  }

  const bounds = getWatermarkBounds({
    ctx,
    canvasWidth,
    canvasHeight,
    watermark,
    config,
    previewScale,
  });

  const wmWidth = bounds.width;
  const wmHeight = bounds.height;

  // 1. Tiling Grid Mode (Pattern Watermark)
  if (isTiled) {
    ctx.save();
    ctx.globalAlpha = opacity;

    const gap = (config.tileGap || 100) * previewScale;
    const stepX = wmWidth + gap;
    const stepY = wmHeight + gap;

    for (let py = -canvasHeight; py < canvasHeight * 2; py += stepY) {
      for (let px = -canvasWidth; px < canvasWidth * 2; px += stepX) {
        ctx.save();
        const centerX = px + wmWidth / 2;
        const centerY = py + wmHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);

        if (mode === "text") {
          const text = textConfig?.text || "© WATERMARK";
          const fontFamily = textConfig?.fontFamily || "Inter, sans-serif";
          const fontSize = Math.max(12, 120 * config.scale * previewScale);
          ctx.font = `600 ${fontSize}px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          if (textConfig?.hasShadow) {
            ctx.shadowColor = textConfig.shadowColor || "rgba(0, 0, 0, 0.75)";
            ctx.shadowBlur = 6 * previewScale;
            ctx.shadowOffsetX = 2 * previewScale;
            ctx.shadowOffsetY = 2 * previewScale;
          }

          ctx.fillStyle = textConfig?.color || "#ffffff";
          ctx.fillText(text, 0, 0);
        } else if (watermark) {
          ctx.drawImage(watermark, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
        }

        ctx.restore();
      }
    }

    ctx.restore();
    return;
  }

  // 2. Single Placement Mode
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(bounds.centerX, bounds.centerY);
  ctx.rotate((rotation * Math.PI) / 180);

  if (mode === "text") {
    const text = textConfig?.text || "© WATERMARK";
    const fontFamily = textConfig?.fontFamily || "Inter, sans-serif";
    const fontSize = Math.max(12, 120 * config.scale * previewScale);
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (textConfig?.hasShadow) {
      ctx.shadowColor = textConfig.shadowColor || "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8 * previewScale;
      ctx.shadowOffsetX = 2 * previewScale;
      ctx.shadowOffsetY = 2 * previewScale;
    }

    ctx.fillStyle = textConfig?.color || "#ffffff";
    ctx.fillText(text, 0, 0);
  } else if (watermark) {
    ctx.drawImage(watermark, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
  }

  ctx.restore();
}

/**
 * Detects the best video MIME type supported by the current browser.
 */
export function getBestVideoMimeType(): { mimeType: string; extension: string } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "", extension: "webm" };
  }

  const candidates: { mimeType: string; extension: string }[] = [
    { mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];

  for (const candidate of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    } catch {
      // Continue checking next candidate
    }
  }

  return { mimeType: "", extension: "webm" };
}

/**
 * Processes a single image file with the watermark.
 */
export async function processImageWatermark(
  file: File,
  watermark: HTMLImageElement | null,
  config: WatermarkConfig
): Promise<{ blob: Blob; extension: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Không thể khởi tạo Canvas 2D cho ảnh"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawWatermarkOnCanvas({
          ctx,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          watermark,
          config,
          previewScale: 1,
        });

        const format = file.type.startsWith("image/") ? file.type : "image/jpeg";
        const extension = format.split("/")[1] || "jpg";

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve({ blob, extension });
            } else {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) {
                    resolve({ blob: fallbackBlob, extension: "jpg" });
                  } else {
                    reject(new Error("Lỗi khi chuyển Canvas thành Blob"));
                  }
                },
                "image/jpeg",
                0.95
              );
            }
          },
          format,
          0.95
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Không thể tải hình ảnh ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Processes a video file by playing it through a Canvas stream and recording with MediaRecorder.
 * Preserves audio when possible and tracks rendering progress.
 */
export async function processVideoWatermark(
  file: File,
  watermark: HTMLImageElement | null,
  config: WatermarkConfig,
  onProgress?: (progressPercent: number) => void
): Promise<{ blob: Blob; extension: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    let audioContext: AudioContext | null = null;
    let animFrameId: number | null = null;
    let isTerminated = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      isTerminated = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
      if (audioContext && audioContext.state !== "closed") {
        try {
          audioContext.close();
        } catch {
          // ignore
        }
      }
      URL.revokeObjectURL(videoUrl);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Lỗi tải video: ${file.name}`));
    };

    video.onloadedmetadata = async () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration || 1;

        if (width === 0 || height === 0) {
          cleanup();
          reject(new Error("Video không có kích thước hợp lệ"));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          cleanup();
          reject(new Error("Không thể khởi tạo Canvas 2D"));
          return;
        }

        // Pre-draw the first frame
        ctx.drawImage(video, 0, 0, width, height);
        drawWatermarkOnCanvas({
          ctx,
          canvasWidth: width,
          canvasHeight: height,
          watermark,
          config,
          previewScale: 1,
        });

        // 30 FPS stream
        const stream = canvas.captureStream(30);

        // Attempt audio routing via Web Audio API (silent to speakers)
        try {
          const AudioCtxClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtxClass) {
            audioContext = new AudioCtxClass();
            if (audioContext.state === "suspended") {
              await audioContext.resume();
            }
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            const audioTracks = destination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              stream.addTrack(audioTracks[0]);
            }
          }
        } catch (audioErr) {
          console.warn("Could not capture video audio, fallback to silent stream:", audioErr);
        }

        const { mimeType: bestMime, extension } = getBestVideoMimeType();
        const recorderOptions: MediaRecorderOptions = {};
        if (bestMime) {
          recorderOptions.mimeType = bestMime;
        }

        let mediaRecorder: MediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, recorderOptions);
        } catch {
          mediaRecorder = new MediaRecorder(stream);
        }

        const recordedChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        let hasFinished = false;
        const finishRecording = () => {
          if (hasFinished) return;
          hasFinished = true;
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          const finalMime = recorderOptions.mimeType || "video/webm";
          const finalBlob = new Blob(recordedChunks, { type: finalMime });
          resolve({ blob: finalBlob, extension });
        };

        mediaRecorder.onerror = (err) => {
          cleanup();
          reject(err);
        };

        mediaRecorder.start(100);

        // Frame rendering loop
        const renderLoop = () => {
          if (isTerminated || hasFinished) return;

          if (video.ended || video.currentTime >= duration - 0.05) {
            finishRecording();
            return;
          }

          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, width, height);
            drawWatermarkOnCanvas({
              ctx,
              canvasWidth: width,
              canvasHeight: height,
              watermark,
              config,
              previewScale: 1,
            });

            if (onProgress && duration > 0) {
              const currentPercent = Math.min(
                100,
                Math.round((video.currentTime / duration) * 100)
              );
              onProgress(currentPercent);
            }
          }

          if ("requestVideoFrameCallback" in video) {
            (video as HTMLVideoElement & {
              requestVideoFrameCallback: (cb: () => void) => void;
            }).requestVideoFrameCallback(renderLoop);
          } else {
            animFrameId = requestAnimationFrame(renderLoop);
          }
        };

        video.onended = () => {
          finishRecording();
        };

        // Safety timeout
        const maxDurationMs = Math.max(5000, (duration + 3) * 1000);
        timeoutId = setTimeout(() => {
          finishRecording();
        }, maxDurationMs);

        // Start playback
        try {
          await video.play();
        } catch {
          video.muted = true;
          await video.play();
        }

        renderLoop();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}
