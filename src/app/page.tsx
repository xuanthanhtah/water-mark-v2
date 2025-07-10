"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react"; // Icon đóng
import { Button } from "@/components/ui/button";
import DialogHandleFile from "./components/home/DialogHandleFile";

export default function Home() {
  const [firstImg, setFirstImg] = useState<File>();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
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
              onChange={handleChange}
            />
          </div>
          <div>
            <Button onClick={() => setIsOpen(true)}>gắn watermark</Button>
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
              <Image
                src={preview}
                alt={`Image ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <DialogHandleFile
        file={images}
        isOpen={isOpen}
        close={() => setIsOpen(false)}
      />
    </>
  );
}
