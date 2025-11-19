/// <reference lib="webworker" />

import type { DecodeHintType as DecodeHintTypeKey } from "@zxing/library";
import * as ZXing from "@zxing/library";

const { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } = ZXing;

type DecodeHints = Map<DecodeHintTypeKey, unknown>;

interface DecodeRequest {
  type: "decode";
  requestId: number;
  imageData: ImageData;
  enhance?: boolean;
}

interface ResetRequest {
  type: "reset";
}

type WorkerRequest = DecodeRequest | ResetRequest;

interface DecodeSuccess {
  type: "result";
  requestId: number;
  text: string;
  format: string | null;
  rawBytes?: number[];
}

interface DecodeError {
  type: "error";
  requestId: number;
  name: string;
  message: string;
  notFound?: boolean;
}

type WorkerResponse = DecodeSuccess | DecodeError;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

const reader = new MultiFormatReader();

const tryHarderHints: DecodeHints = new Map([[DecodeHintType.TRY_HARDER, true]]);

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function enhanceContrast(pixels: Uint8ClampedArray, factor = 1.4) {
  const intercept = 128 * (1 - factor);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = clamp(pixels[index] * factor + intercept);
    pixels[index + 1] = clamp(pixels[index + 1] * factor + intercept);
    pixels[index + 2] = clamp(pixels[index + 2] * factor + intercept);
  }
}

function toBinaryBitmap(imageData: ImageData) {
  const luminanceSource = new RGBLuminanceSource(imageData.data, imageData.width, imageData.height);
  return new BinaryBitmap(new HybridBinarizer(luminanceSource));
}

function decode(imageData: ImageData, hints?: DecodeHints) {
  const bitmap = toBinaryBitmap(imageData);
  reader.reset();
  if (hints) {
    reader.setHints(hints);
  } else {
    reader.setHints(null);
  }
  return reader.decodeWithState(bitmap);
}

async function handleDecode(request: DecodeRequest) {
  const { requestId, imageData, enhance = true } = request;
  const attempts: { hints?: DecodeHints; image: ImageData }[] = [];

  const basePixels = new Uint8ClampedArray(imageData.data);
  const baseImage = new ImageData(basePixels, imageData.width, imageData.height);
  attempts.push({ image: baseImage });
  attempts.push({ image: baseImage, hints: tryHarderHints });

  if (enhance) {
    const enhancedPixels = new Uint8ClampedArray(basePixels);
    enhanceContrast(enhancedPixels);
    attempts.push({
      image: new ImageData(enhancedPixels, imageData.width, imageData.height),
      hints: tryHarderHints
    });
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = decode(attempt.image, attempt.hints);
      const text = result.getText();
      const formatEnum = result.getBarcodeFormat();
      const format = typeof formatEnum === "number" ? BarcodeFormat[formatEnum] ?? null : null;
      const raw = result.getRawBytes?.();
      const payload: DecodeSuccess = {
        type: "result",
        requestId,
        text,
        format,
        rawBytes: raw ? Array.from(raw) : undefined
      };
      ctx.postMessage(payload satisfies WorkerResponse);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  const error = lastError as { name?: string; message?: string } | undefined;
  ctx.postMessage({
    type: "error",
    requestId,
    name: error?.name ?? "DecodeError",
    message: error?.message ?? "Не удалось распознать QR-код",
    notFound: error?.name === "NotFoundException"
  } satisfies WorkerResponse);
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;
  if (payload.type === "reset") {
    reader.reset();
    return;
  }
  void handleDecode(payload);
};

