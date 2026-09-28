export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center";

export type MediaType = "image" | "video";

export type WatermarkMode = "image" | "text";

export interface MediaFileItem {
  file: File;
  preview: string;
  type: MediaType;
}

export interface TextWatermarkConfig {
  text: string;
  fontFamily: string;
  color: string;
  hasShadow: boolean;
  shadowColor: string;
}

export interface WatermarkConfig {
  mode: WatermarkMode;
  opacity: number;
  scale: number;
  position: WatermarkPosition;
  rotation: number;
  offsetX: number;
  offsetY: number;
  isTiled?: boolean;
  tileGap?: number;
  textConfig?: TextWatermarkConfig;
}

export interface DialogHandleFileProps {
  files: MediaFileItem[];
  isOpen: boolean;
  close: () => void;
  chooseWM?: File;
}

export interface AlertShowProps {
  isOpen: boolean;
  close: () => void;
}
