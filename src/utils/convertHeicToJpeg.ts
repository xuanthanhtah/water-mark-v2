export const convertHeicToJpeg = async (file: File): Promise<File | null> => {
  try {
    const heic2any = (await import("heic2any")).default;
    const blob = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
    const jpegFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
    return jpegFile;
  } catch (err) {
    console.error("Lỗi chuyển HEIC watermark:", err);
    return null;
  }
};
