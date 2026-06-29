import type { Options } from "qr-code-styling";
import type { StyleOptions } from "./types";

interface BuildArgs {
  size: number;
  margin: number;
  data: string;
}

/**
 * Builds the qr-code-styling options bag shared by both the live preview and
 * the export render. The only things that differ between the two are
 * width/height/margin/data, which are passed explicitly.
 *
 * Note: `moduleSpacing` is a custom field consumed by `spacingExtension`, not
 * part of the library `Options` type, hence the cast on return.
 */
export function buildQrOptions(style: StyleOptions, { size, margin, data }: BuildArgs): Options {
  return {
    type: "svg",
    data,
    width: size,
    height: size,
    image: style.logoDataUrl,
    shape: style.shape,
    margin,
    moduleSpacing: (style.dotSpacing ?? 0) / 100,
    qrOptions: {
      errorCorrectionLevel: style.errorCorrection,
      mode: "Byte"
    },
    dotsOptions: {
      ...(style.useDotsGradient && style.dotsGradient
        ? { gradient: style.dotsGradient }
        : { color: style.foreground }),
      type: style.dotStyle
    },
    backgroundOptions: {
      ...(style.useBackgroundGradient && style.backgroundGradient
        ? { gradient: style.backgroundGradient }
        : { color: style.background })
    },
    cornersSquareOptions: {
      ...(style.useCornersGradient && style.cornersGradient
        ? { gradient: style.cornersGradient }
        : { color: style.foreground }),
      type: style.eyeOuter
    },
    cornersDotOptions: {
      ...(style.useCornersGradient && style.cornersGradient
        ? { gradient: style.cornersGradient }
        : { color: style.foreground }),
      type: style.eyeInner
    },
    imageOptions: {
      imageSize: style.logoSize / 100,
      margin: 4,
      hideBackgroundDots: style.hideBackgroundDots,
      saveAsBlob: true
    }
  } as Options;
}
