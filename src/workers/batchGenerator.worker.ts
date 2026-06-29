import QRCode from "qrcode";
import JSZip from "jszip";

interface BatchItem {
  index: number;
  type: string;
  payload: string;
  slug: string;
}

interface BatchJob {
  id: string;
  items: BatchItem[];
  format: "png" | "svg";
  options: {
    errorCorrection: "L" | "M" | "Q" | "H";
    margin: number;
    size: number;
    foreground: string;
    background: string;
    chunk: number;
  };
}

type WorkerResponse =
  | { id: string; progress: number; processed: number; total: number }
  | { id: string; error: string }
  | { id: string; done: true; blob: Blob; failed: number };

interface WorkerScope {
  onmessage: ((event: MessageEvent<BatchJob>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const ctx = self as unknown as WorkerScope;

ctx.onmessage = async (event: MessageEvent<BatchJob>) => {
  const job = event.data;
  try {
    const total = job.items.length;
    const chunk = Math.max(1, job.options.chunk || 250);
    let processed = 0;
    let failed = 0;
    const zip = new JSZip();
    const failures: string[] = [];

    const qrOptions = {
      width: job.options.size,
      errorCorrectionLevel: job.options.errorCorrection,
      margin: job.options.margin,
      color: {
        dark: job.options.foreground,
        light: job.options.background
      }
    };

    for (const item of job.items) {
      const filename = `${String(item.index).padStart(4, "0")}_${item.type}_${item.slug}.${job.format}`;
      try {
        if (job.format === "svg") {
          const svg = await QRCode.toString(item.payload, { ...qrOptions, type: "svg" });
          zip.file(filename, svg);
        } else {
          const dataUrl = await QRCode.toDataURL(item.payload, qrOptions);
          const base64 = dataUrl.split(",")[1];
          zip.file(filename, base64, { base64: true });
        }
      } catch (itemError: unknown) {
        failed += 1;
        const message = itemError instanceof Error ? itemError.message : "неизвестная ошибка";
        failures.push(`${filename}: ${message}`);
      }

      processed += 1;
      if (processed % chunk === 0 || processed === total) {
        const response: WorkerResponse = {
          id: job.id,
          progress: processed / total,
          processed,
          total
        };
        ctx.postMessage(response);
      }
    }

    if (failures.length > 0) {
      zip.file("errors.txt", failures.join("\n"));
    }

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 7 }
    });

    const response: WorkerResponse = { id: job.id, done: true, blob, failed };
    ctx.postMessage(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ошибка генерации";
    const response: WorkerResponse = { id: job.id, error: message };
    ctx.postMessage(response);
  }
};
