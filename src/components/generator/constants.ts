import { QR_SYSTEM } from "@/lib/qrConstants";
import type { DotStyle, EyeDotStyle, EyeStyle, ShapeType, StyleOptions } from "./types";

export const MAX_PAYLOAD_BYTES = 2953;

export const defaultStyle: StyleOptions = {
  exportSize: QR_SYSTEM.EXPORT.DEFAULT_SIZE,
  marginPercent: QR_SYSTEM.MARGIN.DEFAULT,
  errorCorrection: "H",
  foreground: "#000000",
  background: "#ffffff",
  dotStyle: "rounded",
  eyeOuter: "square",
  eyeInner: "square",
  logoSize: 18,
  shape: "square",
  dotSpacing: 0,
  useDotsGradient: false,
  dotsGradient: {
    type: "linear",
    rotation: 0,
    colorStops: [
      { offset: 0, color: "#0b1220" },
      { offset: 1, color: "#4a5568" }
    ]
  },
  useBackgroundGradient: false,
  backgroundGradient: {
    type: "linear",
    rotation: 0,
    colorStops: [
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#f7fafc" }
    ]
  },
  useCornersGradient: false,
  cornersGradient: {
    type: "linear",
    rotation: 0,
    colorStops: [
      { offset: 0, color: "#0b1220" },
      { offset: 1, color: "#4a5568" }
    ]
  },
  hideBackgroundDots: true,
  exportFormat: "png"
};

// Color presets
export const COLOR_PRESETS = [
  { name: "Классический", emoji: "⚫", fg: "#000000", bg: "#ffffff" },
  { name: "Современный", emoji: "🔵", fg: "#667eea", bg: "#f0f4ff" },
  { name: "Природа", emoji: "🌿", fg: "#2d5016", bg: "#f5f1e8" },
  { name: "Закат", emoji: "🌅", fg: "#ff6b35", bg: "#ffe5d9" }
];

// Template mapping for QR types - ALL 10 TYPES
export const QR_TEMPLATES = [
  { type: "url", emoji: "🌐", name: "URL", desc: "Ссылка на сайт" },
  { type: "text", emoji: "📄", name: "Текст", desc: "Произвольный текст" },
  { type: "tel", emoji: "📞", name: "Телефон", desc: "Звонок" },
  { type: "sms", emoji: "💬", name: "SMS", desc: "Сообщение" },
  { type: "mailto", emoji: "📧", name: "Email", desc: "Почта" },
  { type: "geo", emoji: "📍", name: "Геометка", desc: "Координаты" },
  { type: "wifi", emoji: "📶", name: "Wi-Fi", desc: "Подключение" },
  { type: "vcard", emoji: "👤", name: "vCard", desc: "Визитка" },
  { type: "mecard", emoji: "💳", name: "MeCard", desc: "Компакт визитка" },
  { type: "ics", emoji: "📅", name: "Событие", desc: "Календарь" }
] as const;

// Style presets (id derived from dotStyle to avoid redundant data)
export const STYLE_PRESETS: { emoji: string; label: string; dotStyle: DotStyle }[] = [
  { emoji: "⬛", label: "Квадраты", dotStyle: "square" },
  { emoji: "⚫", label: "Точки", dotStyle: "dots" },
  { emoji: "🔘", label: "Скругленные", dotStyle: "rounded" },
  { emoji: "💎", label: "Элегантный", dotStyle: "extra-rounded" }
];

export const DOT_STYLE_OPTIONS: { value: DotStyle; label: string }[] = [
  { value: "square", label: "Квадраты" },
  { value: "rounded", label: "Скругленные" },
  { value: "extra-rounded", label: "Очень скругленные" },
  { value: "dots", label: "Точки" },
  { value: "classy", label: "Classy" },
  { value: "classy-rounded", label: "Classy Rounded" }
];

export const EYE_OUTER_OPTIONS: { value: EyeStyle; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "extra-rounded", label: "Скруглённый" },
  { value: "dot", label: "Точка" }
];

export const EYE_INNER_OPTIONS: { value: EyeDotStyle; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "dot", label: "Точка" }
];

export const SHAPE_OPTIONS: { value: ShapeType; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "circle", label: "Круг" }
];

export const LOGO_SIZE_LIMITS: Record<StyleOptions["errorCorrection"], number> = {
  L: 15,
  M: 20,
  Q: 25,
  H: 30
};

export function fieldKey(type: string, field: string) {
  return `${type}.${field}`;
}
