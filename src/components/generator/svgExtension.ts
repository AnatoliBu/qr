import type { Options } from "qr-code-styling";
import { QR_SYSTEM } from "@/lib/qrConstants";

const SVG_NS = "http://www.w3.org/2000/svg";

export function clampSpacing(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 0.6) return 0.6;
  return value;
}

function applyDotSpacing(svg: SVGElement, spacing: number) {
  const safeSpacing = clampSpacing(spacing);

  // Always apply spacing transformation, even when spacing = 0
  // This ensures we override any default spacing from the library
  const scale = 1 - safeSpacing;
  const rects = svg.querySelectorAll("rect");

  rects.forEach((rect) => {
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    if (!width || !height) return;
    if (width > 40 || height > 40) return;

    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const newWidth = width * scale;
    const newHeight = height * scale;
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;

    rect.setAttribute("x", newX.toFixed(3));
    rect.setAttribute("y", newY.toFixed(3));
    rect.setAttribute("width", newWidth.toFixed(3));
    rect.setAttribute("height", newHeight.toFixed(3));
  });
}

function ensureCircleLogo(svg: SVGElement, options: Options) {
  const image = svg.querySelector("image");
  if (!image) {
    return;
  }

  if (options.shape !== "circle") {
    image.removeAttribute("clip-path");
    return;
  }

  const width =
    Number(svg.getAttribute("width")) || Number(options.width) || QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
  const height =
    Number(svg.getAttribute("height")) || Number(options.height) || QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
  const margin = Number(options.margin ?? 0);
  const radius = Math.max(0, Math.min(width, height) / 2 - margin);
  const centerX = width / 2;
  const centerY = height / 2;

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = svg.ownerDocument.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  const clipId = "qr-logo-circle-mask";
  let clipPath = defs.querySelector(`#${clipId}`) as SVGClipPathElement | null;
  if (!clipPath) {
    clipPath = svg.ownerDocument.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", clipId);
    defs.appendChild(clipPath);
  }

  let circle = clipPath.querySelector("circle") as SVGCircleElement | null;
  if (!circle) {
    circle = svg.ownerDocument.createElementNS(SVG_NS, "circle");
    clipPath.appendChild(circle);
  }

  circle.setAttribute("cx", centerX.toFixed(3));
  circle.setAttribute("cy", centerY.toFixed(3));
  circle.setAttribute("r", Math.max(radius, 0).toFixed(3));

  image.setAttribute("clip-path", `url(#${clipId})`);
}

/**
 * QR styling extension: applies module spacing and circular logo clipping.
 * `moduleSpacing` is a custom option (not part of the library's Options type),
 * read defensively off the options bag.
 */
export function spacingExtension(svg: SVGElement, options: Options) {
  const moduleSpacing = Number((options as { moduleSpacing?: number }).moduleSpacing ?? 0);
  // Always apply spacing, even when it's 0, to override library defaults
  applyDotSpacing(svg, clampSpacing(moduleSpacing));
  ensureCircleLogo(svg, options);
}
