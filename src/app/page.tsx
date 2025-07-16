"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import DialogHandleFile from "./components/home/DialogHandleFile";
import AlertShow from "./components/home/AlertShow";
import { convertHeicToJpeg } from "@/utils/convertHeicToJpeg";
import { Button } from "@/components/ui/button";

export default function Home() {
  // Chứa cả ảnh và video, kiểu file: File, preview: string, type: "image" | "video"
  const [files, setFiles] = useState<
    { file: File; preview: string; type: "image" | "video" }[]
  >([]);
  const [waterMark, setWatermark] = useState<File>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenAlert, setIsOpenAlert] = useState<boolean>(false);
  const [loadedStates, setLoadedStates] = useState<boolean[]>([]);

  const handleChangeWatermark = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (
      file.type === "image/heic" ||
      file.name.toLowerCase().endsWith(".heic")
    ) {
      const converted = await convertHeicToJpeg(file);
      if (converted) {
        setWatermark(converted);
      }
    } else {
      setWatermark(file);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setLoadedStates((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const heic2any = (await import("heic2any")).default;
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);

    const convertedFiles = await Promise.all(
      fileArray.map(async (file) => {
        // Xử lý ảnh HEIC
        if (
          file.type === "image/heic" ||
          file.name.toLowerCase().endsWith(".heic")
        ) {
          try {
            const blob = (await heic2any({
              blob: file,
              toType: "image/jpeg",
            })) as Blob;
            const jpegFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
              }
            );
            return {
              file: jpegFile,
              preview: URL.createObjectURL(jpegFile),
              type: "image" as const,
            };
          } catch (err) {
            console.error("Chuyển đổi HEIC thất bại:", err);
            return null;
          }
        }
        // Nếu file là video, preview dùng URL, type = "video"
        else if (file.type.startsWith("video/")) {
          return {
            file,
            preview: URL.createObjectURL(file),
            type: "video" as const,
          };
        }
        // Là ảnh bình thường
        else if (file.type.startsWith("image/")) {
          return {
            file,
            preview: URL.createObjectURL(file),
            type: "image" as const,
          };
        } else {
          // Bỏ qua các file không phải image/video nếu muốn
          return null;
        }
      })
    );

    const validFiles = convertedFiles.filter(
      (
        item
      ): item is { file: File; preview: string; type: "image" | "video" } =>
        item !== null
    );

    setFiles((prev) => [...prev, ...validFiles]);
    setLoadedStates((prev) => [...prev, ...validFiles.map(() => false)]);
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">
            Thêm ảnh, video và watermark
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Tải lên ảnh hoặc video</Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="watermark-upload">Tải lên watermark</Label>
            <Input
              id="watermark-upload"
              type="file"
              accept="image/*"
              onChange={handleChangeWatermark}
            />
            <div className="text-sm text-muted-foreground">
              <p>
                *Nếu không upload water mark sẽ mặc định lấy logo BTN HIỆP PHÚ
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-4">
          <Button
            disabled={files.length === 0}
            onClick={() => setFiles([])}
            className="cursor-pointer "
          >
            Xóa tất cả
          </Button>
          <Button
            disabled={files.length === 0}
            onClick={() =>
              files.length > 0 ? setIsOpen(true) : setIsOpenAlert(true)
            }
            className="cursor-pointer"
          >
            Gắn watermark
          </Button>
        </CardFooter>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tệp đã tải lên</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full h-fit pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {files.map(({ preview, type }, index) => (
                  <div
                    key={index}
                    className="relative w-full aspect-square rounded overflow-hidden shadow"
                  >
                    <button
                      onClick={() => handleRemove(index)}
                      className="absolute top-1 right-1 z-10 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>

                    {!loadedStates[index] && (
                      <Skeleton className="absolute inset-0 w-full h-full" />
                    )}

                    {type === "image" ? (
                      <Image
                        src={preview}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover"
                        onLoad={() =>
                          setLoadedStates((prev) => {
                            const updated = [...prev];
                            updated[index] = true;
                            return updated;
                          })
                        }
                      />
                    ) : (
                      <video
                        src={preview}
                        controls
                        className="w-full h-full object-cover rounded"
                        onLoadedData={() =>
                          setLoadedStates((prev) => {
                            const updated = [...prev];
                            updated[index] = true;
                            return updated;
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <DialogHandleFile
        files={files}
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        chooseWM={waterMark}
      />

      {isOpenAlert && (
        <AlertShow close={() => setIsOpenAlert(false)} isOpen={isOpenAlert} />
      )}
    </main>
  );
}
