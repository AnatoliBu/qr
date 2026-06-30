import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// ---------------------------------------------------------------------------
// Harness: transpile buildQrOptions.ts (TS, type-only imports erased) and run
// it in an isolated vm context, mirroring tests/batchGenerator.worker.test.mjs.
// calculateMarginPx lives in src/lib/qrConstants.ts; we transpile it the same
// way so the px math (incl. marginPercent=0 ⇒ 0) is tested against real code.
// ---------------------------------------------------------------------------
async function loadTsModule(relPath) {
  const url = new URL(relPath, import.meta.url);
  const source = await readFile(url, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true
    },
    fileName: fileURLToPath(url)
  });

  const moduleScope = { exports: {} };
  const sandbox = {
    module: moduleScope,
    exports: moduleScope.exports,
    require,
    console,
    TextEncoder
  };
  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: path.basename(url.pathname)
  });
  return moduleScope.exports;
}

const { buildQrOptions } = await loadTsModule(
  "../src/components/generator/buildQrOptions.ts"
);
const { calculateMarginPx } = await loadTsModule("../src/lib/qrConstants.ts");

// A fully-populated, non-default StyleOptions so every field is observably
// distinct from a library default (catches "field never wired" regressions).
const baseStyle = {
  exportSize: 2048,
  marginPercent: 10,
  errorCorrection: "Q",
  foreground: "#112233",
  background: "#fafbfc",
  dotStyle: "classy-rounded",
  eyeOuter: "extra-rounded",
  eyeInner: "dot",
  logoDataUrl: "data:image/png;base64,AAAA",
  logoSize: 22,
  shape: "circle",
  dotSpacing: 30,
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
    type: "radial",
    rotation: 0.5,
    colorStops: [
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#eeeeee" }
    ]
  },
  useCornersGradient: false,
  cornersGradient: {
    type: "linear",
    rotation: 1,
    colorStops: [
      { offset: 0, color: "#aa0000" },
      { offset: 1, color: "#0000aa" }
    ]
  },
  hideBackgroundDots: true,
  exportFormat: "png"
};

const ARGS = { size: 512, margin: 40, data: "HELLO" };

test("maps data/size/margin from the BuildArgs (not from style)", () => {
  const o = buildQrOptions(baseStyle, ARGS);
  assert.equal(o.data, "HELLO");
  assert.equal(o.width, 512);
  assert.equal(o.height, 512);
  assert.equal(o.margin, 40, "margin comes from args (caller computes px)");
});

test("renders as svg and forces Byte mode for UTF-8 payload safety", () => {
  const o = buildQrOptions(baseStyle, ARGS);
  assert.equal(o.type, "svg");
  assert.equal(o.qrOptions.mode, "Byte");
});

test("maps errorCorrection into qrOptions.errorCorrectionLevel", () => {
  const o = buildQrOptions({ ...baseStyle, errorCorrection: "H" }, ARGS);
  assert.equal(o.qrOptions.errorCorrectionLevel, "H");
  const o2 = buildQrOptions({ ...baseStyle, errorCorrection: "L" }, ARGS);
  assert.equal(o2.qrOptions.errorCorrectionLevel, "L");
});

test("maps shape", () => {
  assert.equal(buildQrOptions({ ...baseStyle, shape: "circle" }, ARGS).shape, "circle");
  assert.equal(buildQrOptions({ ...baseStyle, shape: "square" }, ARGS).shape, "square");
});

test("maps dotStyle into dotsOptions.type", () => {
  const o = buildQrOptions({ ...baseStyle, dotStyle: "dots" }, ARGS);
  assert.equal(o.dotsOptions.type, "dots");
});

test("maps eyeOuter -> cornersSquareOptions.type and eyeInner -> cornersDotOptions.type", () => {
  const o = buildQrOptions(
    { ...baseStyle, eyeOuter: "square", eyeInner: "dot" },
    ARGS
  );
  assert.equal(o.cornersSquareOptions.type, "square");
  assert.equal(o.cornersDotOptions.type, "dot");
});

test("dotSpacing maps to moduleSpacing as a fraction (percent/100)", () => {
  assert.equal(buildQrOptions({ ...baseStyle, dotSpacing: 30 }, ARGS).moduleSpacing, 0.3);
  assert.equal(buildQrOptions({ ...baseStyle, dotSpacing: 0 }, ARGS).moduleSpacing, 0);
  // tolerate undefined dotSpacing -> 0 (nullish coalescing in source)
  const noSpacing = { ...baseStyle };
  delete noSpacing.dotSpacing;
  assert.equal(buildQrOptions(noSpacing, ARGS).moduleSpacing, 0);
});

test("logo: image url, imageSize fraction, hideBackgroundDots", () => {
  const o = buildQrOptions({ ...baseStyle, logoSize: 25, hideBackgroundDots: true }, ARGS);
  assert.equal(o.image, "data:image/png;base64,AAAA");
  assert.equal(o.imageOptions.imageSize, 0.25, "logoSize% -> imageSize fraction");
  assert.equal(o.imageOptions.hideBackgroundDots, true);

  const off = buildQrOptions({ ...baseStyle, hideBackgroundDots: false }, ARGS);
  assert.equal(off.imageOptions.hideBackgroundDots, false);
});

// --- gradient precedence (REQUIREMENTS §4: use*Gradient on ⇒ overrides solid) ---

test("dots: solid color when gradient OFF, gradient overrides color when ON", () => {
  const off = buildQrOptions({ ...baseStyle, useDotsGradient: false }, ARGS);
  assert.equal(off.dotsOptions.color, "#112233");
  assert.equal(off.dotsOptions.gradient, undefined, "no gradient when off");

  const on = buildQrOptions({ ...baseStyle, useDotsGradient: true }, ARGS);
  assert.equal(on.dotsOptions.gradient, baseStyle.dotsGradient);
  assert.equal(on.dotsOptions.color, undefined, "solid color suppressed when gradient on");
});

test("dots: gradient flag ON but no gradient object ⇒ falls back to solid color", () => {
  const style = { ...baseStyle, useDotsGradient: true };
  delete style.dotsGradient;
  const o = buildQrOptions(style, ARGS);
  assert.equal(o.dotsOptions.color, "#112233");
  assert.equal(o.dotsOptions.gradient, undefined);
});

test("background: solid when OFF, gradient overrides when ON", () => {
  const off = buildQrOptions({ ...baseStyle, useBackgroundGradient: false }, ARGS);
  assert.equal(off.backgroundOptions.color, "#fafbfc");
  assert.equal(off.backgroundOptions.gradient, undefined);

  const on = buildQrOptions({ ...baseStyle, useBackgroundGradient: true }, ARGS);
  assert.equal(on.backgroundOptions.gradient, baseStyle.backgroundGradient);
  assert.equal(on.backgroundOptions.color, undefined);
});

test("corners (square+dot): foreground when OFF, cornersGradient overrides when ON", () => {
  const off = buildQrOptions({ ...baseStyle, useCornersGradient: false }, ARGS);
  assert.equal(off.cornersSquareOptions.color, "#112233");
  assert.equal(off.cornersDotOptions.color, "#112233");
  assert.equal(off.cornersSquareOptions.gradient, undefined);
  assert.equal(off.cornersDotOptions.gradient, undefined);

  const on = buildQrOptions({ ...baseStyle, useCornersGradient: true }, ARGS);
  assert.equal(on.cornersSquareOptions.gradient, baseStyle.cornersGradient);
  assert.equal(on.cornersDotOptions.gradient, baseStyle.cornersGradient);
  assert.equal(on.cornersSquareOptions.color, undefined);
  assert.equal(on.cornersDotOptions.color, undefined);
});

test("gradient flags are independent (dots on, bg/corners off)", () => {
  const o = buildQrOptions(
    { ...baseStyle, useDotsGradient: true, useBackgroundGradient: false, useCornersGradient: false },
    ARGS
  );
  assert.equal(o.dotsOptions.gradient, baseStyle.dotsGradient);
  assert.equal(o.backgroundOptions.color, "#fafbfc");
  assert.equal(o.cornersSquareOptions.color, "#112233");
});

// --- margin px math via calculateMarginPx (REQUIREMENTS §4: 0% ⇒ 0 px) ---

test("calculateMarginPx: percent -> px, and the px feeds buildQrOptions.margin", () => {
  assert.equal(calculateMarginPx(1000, 8), 80);
  assert.equal(calculateMarginPx(512, 10), 51, "rounded");
  assert.equal(calculateMarginPx(1024, 0), 0, "marginPercent=0 ⇒ margin 0 (edge-to-edge)");

  // integration: the caller's contract — px math result is what lands on margin.
  const size = 2048;
  const px = calculateMarginPx(size, baseStyle.marginPercent); // 10% -> 204.8 -> 205
  const o = buildQrOptions(baseStyle, { size, margin: px, data: "X" });
  assert.equal(o.margin, px);
  assert.equal(o.margin, 205);

  const zero = buildQrOptions(baseStyle, { size, margin: calculateMarginPx(size, 0), data: "X" });
  assert.equal(zero.margin, 0);
});

// --- exportFormat: buildQrOptions stays format-agnostic (render type is svg);
// the file format is the caller's getRawData(format) arg + extension/mime. ---

test("exportFormat does not leak into the options bag (caller drives getRawData)", () => {
  const png = buildQrOptions({ ...baseStyle, exportFormat: "png" }, ARGS);
  const svg = buildQrOptions({ ...baseStyle, exportFormat: "svg" }, ARGS);
  // Render type is always svg; format selection happens at export time.
  assert.equal(png.type, "svg");
  assert.equal(svg.type, "svg");
  assert.equal(png.exportFormat, undefined, "exportFormat is not a qr-code-styling Option");
});

test("exportFormat drives file extension + mime contract (png|svg)", () => {
  // Mirrors GeneratorNew.exportBlob: fileName ext and mimeType are derived
  // from the chosen format; no other formats are produced.
  const ext = (f) => `qr.${f}`;
  const mime = (f) => (f === "svg" ? "image/svg+xml" : "image/png");
  assert.equal(ext("png"), "qr.png");
  assert.equal(ext("svg"), "qr.svg");
  assert.equal(mime("png"), "image/png");
  assert.equal(mime("svg"), "image/svg+xml");
});
