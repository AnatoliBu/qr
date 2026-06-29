import { QR_SYSTEM } from "@/lib/qrConstants";
import { defaultStyle } from "./constants";
import type { GeneratorDraft, Gradient, StyleOptions } from "./types";

/** Legacy fields that older persisted drafts may still carry. */
interface LegacyStyle {
  size?: number;
  margin?: number;
}

function cloneGradient(gradient?: Gradient): Gradient | undefined {
  if (!gradient) return undefined;
  return {
    ...gradient,
    colorStops: gradient.colorStops.map((stop) => ({ ...stop }))
  };
}

/**
 * Pure draft migration. Run once at hydration, never inside render.
 *
 * - `size` (legacy fixed px) -> `exportSize`
 * - `margin` (legacy 0-10 px-ish slider) -> `marginPercent`
 *   The old margin slider ranged ~0-10; the new control is a 0-20 percentage,
 *   so the value is doubled (`*2`) to keep a visually similar quiet zone, then
 *   clamped into the supported MIN..MAX range.
 * - fills any missing fields from `defaultStyle`
 * - deep-clones gradients so the persisted object is never mutated
 */
export function migrateDraft(raw: GeneratorDraft): GeneratorDraft {
  const rawStyle = raw.style as StyleOptions & LegacyStyle;

  // Build a fresh style object; never mutate the persisted one.
  const style: StyleOptions = {
    ...defaultStyle,
    ...rawStyle,
    dotsGradient: cloneGradient(rawStyle.dotsGradient) ?? defaultStyle.dotsGradient,
    backgroundGradient:
      cloneGradient(rawStyle.backgroundGradient) ?? defaultStyle.backgroundGradient,
    cornersGradient: cloneGradient(rawStyle.cornersGradient) ?? defaultStyle.cornersGradient
  };

  // size -> exportSize
  if (!rawStyle.exportSize && rawStyle.size) {
    style.exportSize = rawStyle.size;
  }
  if (!style.exportSize) {
    style.exportSize = QR_SYSTEM.EXPORT.DEFAULT_SIZE;
  }

  // margin -> marginPercent (legacy 0-10 -> percent, doubled then clamped)
  if (rawStyle.marginPercent === undefined && rawStyle.margin !== undefined) {
    style.marginPercent = Math.min(
      QR_SYSTEM.MARGIN.MAX,
      Math.max(QR_SYSTEM.MARGIN.MIN, rawStyle.margin * 2)
    );
  }
  if (style.marginPercent === undefined) {
    style.marginPercent = QR_SYSTEM.MARGIN.DEFAULT;
  }

  // Drop legacy keys from the migrated shape.
  delete (style as StyleOptions & LegacyStyle).size;
  delete (style as StyleOptions & LegacyStyle).margin;

  return { ...raw, style };
}
