"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";
import { QR_SYSTEM } from "@/lib/qrConstants";
import { spacingExtension } from "./svgExtension";

type QRCodeStylingCtor = typeof QRCodeStyling;

/**
 * Normalizes the rendered SVG so it scales to its container. Only the genuinely
 * dynamic attribute fix-up lives here; static layout rules are in CSS
 * (.qrCanvas svg/canvas).
 */
function normalizePreviewSvg(container: HTMLDivElement) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const width = Number(svg.getAttribute("width")) || QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
  const height = Number(svg.getAttribute("height")) || QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
  if (!svg.getAttribute("viewBox") && width && height) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

interface UseQrPreviewResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Loaded constructor (null until the dynamic import resolves). */
  ctor: QRCodeStylingCtor | null;
  /** True once the preview instance has been created and appended. */
  ready: boolean;
  /** Push new options into the existing instance and re-fit. */
  render: (options: Options) => void;
}

/**
 * Owns the single qr-code-styling preview instance. Creates it once when the
 * constructor loads and never tears it down on plain style edits — style/data
 * changes flow through `render` -> instance.update().
 */
export function useQrPreview(): UseQrPreviewResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [ctor, setCtor] = useState<QRCodeStylingCtor | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("qr-code-styling").then((module) => {
      if (mounted) setCtor(() => module.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const schedulePreviewFit = useCallback(() => {
    const fit = () => {
      if (containerRef.current) normalizePreviewSvg(containerRef.current);
    };
    if (typeof window === "undefined") {
      fit();
      return;
    }
    window.requestAnimationFrame(fit);
  }, []);

  // Create the instance exactly once, when both the ctor and container exist.
  useEffect(() => {
    const container = containerRef.current;
    if (!ctor || !container || qrRef.current) return;

    const previewSize = QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
    const instance = new ctor({
      type: "svg",
      width: previewSize,
      height: previewSize,
      data: "",
      margin: 0
    });
    qrRef.current = instance;
    instance.append(container);
    instance.applyExtension(spacingExtension);
    schedulePreviewFit();
    setReady(true);

    return () => {
      container.innerHTML = "";
      qrRef.current = null;
      setReady(false);
    };
  }, [ctor, schedulePreviewFit]);

  const render = useCallback(
    (options: Options) => {
      const instance = qrRef.current;
      if (!instance) return;

      const finalize = () => {
        instance.applyExtension(spacingExtension);
        schedulePreviewFit();
      };

      const result = instance.update(options) as unknown;
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).finally(finalize);
      } else {
        finalize();
      }
    },
    [schedulePreviewFit]
  );

  return { containerRef, ctor, ready, render };
}
