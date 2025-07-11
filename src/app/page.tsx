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

export default function Home() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [waterMark, setWatermark] = useState<File>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenAlert, setIsOpenAlert] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const handleChangeWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    console.log(files);
    setWatermark(files[0]);
  };

  const handleRemove = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4">
          <div>
            <Label htmlFor="image-upload">Tải lên ảnh</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="image-upload">Tải lên water mark</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleChangeWatermark}
            />
          </div>
          <div>
            <Button
              onClick={() => {
                if (images.length > 0) {
                  setIsOpen(true);
                } else {
                  setIsOpenAlert(true);
                }
              }}
            >
              gắn watermark
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {images.map(({ preview }, index) => (
            <div
              key={index}
              className="relative w-48 h-48 rounded overflow-hidden shadow"
            >
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 z-10 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 cursor-pointer"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
              {!imageLoaded && <Skeleton className="w-48 h-48 rounded" />}
              <Image
                src={preview}
                alt={`Image ${index + 1}`}
                fill
                className="object-cover"
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          ))}
        </div>
      </div>
      <DialogHandleFile
        files={images}
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        chooseWM={waterMark}
      />
      {isOpenAlert && (
        <AlertShow close={() => setIsOpenAlert(false)} isOpen={isOpenAlert} />
      )}
    </>
  );
}
