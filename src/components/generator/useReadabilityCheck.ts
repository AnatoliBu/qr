"use client";

import { useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import { decodeQr } from "@/lib/decodeQr";
import { calculateMarginPx } from "@/lib/qrConstants";
import { bytesToBinaryString } from "@/lib/binary";
import { buildQrOptions } from "./buildQrOptions";
import { spacingExtension } from "./svgExtension";
import type { StyleOptions } from "./types";

type QRCodeStylingCtor = typeof QRCodeStyling;

export type ReadabilityStatus = "idle" | "checking" | "ok" | "poor";

interface UseReadabilityCheckArgs {
  ctor: QRCodeStylingCtor | null;
  /** Decoded-back payload must equal this string to count as readable. */
  payload: string;
  /** Whether the current form is valid; we only check valid payloads. */
  valid: boolean;
  style: StyleOptions;
}

/**
 * Preflight readability probe. After each (debounced) change it renders the
 * current QR to a PNG at a modest fixed size, decodes it via the shared
 * decoder, and reports whether it reads back to the exact payload.
 *
 * Purely informational and non-blocking — never throws, never gates export.
 */
// Fixed, decode-friendly probe size — independent of export size so the
// check stays cheap and stable regardless of UI settings.
const PROBE_SIZE = 512;

export function useReadabilityCheck({
  ctor,
  payload,
  valid,
  style
}: UseReadabilityCheckArgs): ReadabilityStatus {
  // Result of the async probe only. The "idle" state for invalid/empty input
  // is derived below, so the effect never calls setState synchronously.
  const [probeStatus, setProbeStatus] = useState<Exclude<ReadabilityStatus, "idle">>("checking");
  const runIdRef = useRef(0);

  const active = Boolean(ctor && valid && payload);

  useEffect(() => {
    if (!ctor || !valid || !payload) return;

    const runId = ++runIdRef.current;
    let scheduled: ReturnType<typeof setTimeout>;

    // setState lives inside the (async) debounce callback, never in the
    // synchronous effect body — keeps cascading-render lint happy.
    const start = () => {
      setProbeStatus("checking");
      scheduled = setTimeout(async () => {
        try {
          const data = bytesToBinaryString(new TextEncoder().encode(payload));
          const margin = calculateMarginPx(PROBE_SIZE, style.marginPercent);
          const probe = new ctor(buildQrOptions(style, { size: PROBE_SIZE, margin, data }));
          probe.applyExtension(spacingExtension);

          const blob = (await probe.getRawData("png")) as Blob | null;
          if (runId !== runIdRef.current) return; // superseded
          if (!blob) {
            setProbeStatus("poor");
            return;
          }

          const decoded = await decodeQr(blob);
          if (runId !== runIdRef.current) return; // superseded
          setProbeStatus(decoded === payload ? "ok" : "poor");
        } catch {
          if (runId === runIdRef.current) setProbeStatus("poor");
        }
      }, 350);
    };

    const handle = setTimeout(start, 0);
    return () => {
      clearTimeout(handle);
      clearTimeout(scheduled);
    };
  }, [ctor, valid, payload, style]);

  return active ? probeStatus : "idle";
}
