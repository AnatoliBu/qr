import { BrowserMultiFormatReader } from "@zxing/browser";

/**
 * Anything we can hand to the QR decoder, in order of cheapness:
 * - string: a dataURL or any image URL (zxing loads it via <img>)
 * - Blob/File: an in-memory image; wrapped in an object URL for decoding
 * - HTMLCanvasElement: already-rasterised pixels (e.g. a generator preview)
 */
export type DecodeQrInput = string | Blob | HTMLCanvasElement;

// Reuse a single reader instance — BrowserMultiFormatReader is stateless
// across one-shot image decodes, and constructing it per call is wasteful.
let sharedReader: BrowserMultiFormatReader | null = null;

function getReader(): BrowserMultiFormatReader {
  if (!sharedReader) {
    sharedReader = new BrowserMultiFormatReader();
  }
  return sharedReader;
}

/**
 * Decode a QR image to its text payload, browser-side, using @zxing/browser
 * (the same engine the camera scanner uses — single source of truth).
 *
 * Returns the decoded string, or `null` if the input cannot be decoded
 * (no QR found, unreadable image). Never throws for an undecodable image;
 * only genuinely unexpected failures propagate.
 *
 * @param input dataURL/image URL string, a Blob/File, or an HTMLCanvasElement.
 */
export async function decodeQr(input: DecodeQrInput): Promise<string | null> {
  const reader = getReader();

  // String URL (incl. dataURL): hand straight to zxing.
  if (typeof input === "string") {
    try {
      const result = await reader.decodeFromImageUrl(input);
      return result.getText();
    } catch {
      return null;
    }
  }

  // Canvas: decode pixels directly, no URL round-trip.
  if (typeof HTMLCanvasElement !== "undefined" && input instanceof HTMLCanvasElement) {
    try {
      const result = reader.decodeFromCanvas(input);
      return result.getText();
    } catch {
      return null;
    }
  }

  // Blob/File: wrap in an object URL, decode, then always revoke it.
  const url = URL.createObjectURL(input as Blob);
  try {
    const result = await reader.decodeFromImageUrl(url);
    return result.getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
