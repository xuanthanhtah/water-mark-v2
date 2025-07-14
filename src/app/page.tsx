"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DialogHandleFile from "./components/home/DialogHandleFile";
import { Skeleton } from "@/components/ui/skeleton";
import AlertShow from "./components/home/AlertShow";
import { convertHeicToJpeg } from "@/utils/convertHeicToJpeg";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
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
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
    setLoadedStates((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const heic2any = (await import("heic2any")).default;
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    const convertedImages = await Promise.all(
      fileArray.map(async (file) => {
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
            };
          } catch (err) {
            console.error("Chuyển đổi HEIC thất bại:", err);
            return null;
          }
        } else {
          return {
            file,
            preview: URL.createObjectURL(file),
          };
        }
      })
    );

    const validImages = convertedImages.filter(
      (item): item is { file: File; preview: string } => item !== null
    );

    setImages((prev) => [...prev, ...validImages]);
    setLoadedStates((prev) => [...prev, ...validImages.map(() => false)]);
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Thêm ảnh và watermark</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Tải lên ảnh</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
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
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={images.length === 0}
            onClick={() =>
              images.length > 0 ? setIsOpen(true) : setIsOpenAlert(true)
            }
            className="cursor-pointer"
          >
            Gắn watermark
          </Button>
        </CardFooter>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ảnh đã tải lên</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full max-h-[50vh] pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {images.map(({ preview }, index) => (
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
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <DialogHandleFile
        files={images}
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
