import type { QRType } from "@/lib/qrTypes";

export type ErrorCorrection = "L" | "M" | "Q" | "H";
export type DotStyle = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
export type EyeStyle = "square" | "extra-rounded" | "dot";
export type EyeDotStyle = "square" | "dot";
export type ShapeType = "square" | "circle";
export type GradientType = "linear" | "radial";
export type GradientKey = "dotsGradient" | "backgroundGradient" | "cornersGradient";
export type ExportFormat = "png" | "svg";

export interface ColorStop {
  offset: number;
  color: string;
}

export interface Gradient {
  type: GradientType;
  rotation?: number;
  colorStops: ColorStop[];
}

export interface StyleOptions {
  /** Размер для ЭКСПОРТА (256-4096px) - НЕ влияет на preview */
  exportSize: number;
  /** Margin в процентах (0-20%) - автоматически масштабируется */
  marginPercent: number;
  errorCorrection: ErrorCorrection;
  foreground: string;
  background: string;
  dotStyle: DotStyle;
  eyeOuter: EyeStyle;
  eyeInner: EyeDotStyle;
  logoDataUrl?: string;
  logoSize: number;
  shape: ShapeType;
  dotSpacing: number;
  useDotsGradient: boolean;
  dotsGradient?: Gradient;
  useBackgroundGradient: boolean;
  backgroundGradient?: Gradient;
  useCornersGradient: boolean;
  cornersGradient?: Gradient;
  hideBackgroundDots: boolean;
  /** Формат файла при скачивании */
  exportFormat: ExportFormat;
}

export interface GeneratorDraft {
  type: QRType;
  formValues: Record<string, string>;
  style: StyleOptions;
}
