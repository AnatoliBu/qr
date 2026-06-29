import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The QR preview is rendered inside the generator's CSS-module styles.
// (Legacy `.preview__canvas` rules in page.css are no longer used by the
// refactored generator, which renders into `.qrPreview` / `.qrCode` / `.qrCanvas`.)
const cssPath = new URL("../src/components/Generator.module.css", import.meta.url);

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const parseDeclarations = (block) =>
  block
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((acc, declaration) => {
      const [property, ...valueParts] = declaration.split(":");
      if (!valueParts.length) {
        return acc;
      }
      acc[property.trim()] = normalizeWhitespace(valueParts.join(":"));
      return acc;
    }, {});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSelectorPattern = (selector) => {
  let pattern = "";
  for (const char of selector) {
    if (/\s/.test(char)) {
      if (!pattern.endsWith("\\s+")) pattern += "\\s+";
    } else if (char === ">") {
      pattern += "\\s*>\\s*";
    } else {
      pattern += escapeRegex(char);
    }
  }
  return pattern;
};

const getRule = (css, selectors) => {
  const pattern = selectors
    .map((selector) => buildSelectorPattern(normalizeWhitespace(selector)))
    .join("\\s*,\\s*");
  const match = css.match(new RegExp(`${pattern}\\s*{([^}]*)}`, "s"));
  if (!match) return null;
  const declarations = match[1].trim();
  return { declarations, declarationMap: parseDeclarations(declarations) };
};

const loadCss = async () => readFile(cssPath, "utf8");

// Selector for the elements qr-code-styling injects (a <div> wrapper containing a
// <canvas> or <svg>). Crop-prevention lives on the canvas/svg rule.
const CANVAS_CHILDREN = [".qrCanvas :global(canvas)", ".qrCanvas :global(svg)"];

/**
 * Tests for QR code preview rendering — ensure the preview container and the
 * injected canvas/svg are sized so the QR is shown in full (never cropped),
 * regardless of size, shape, or other settings.
 */

test("qr preview frame uses a centered column layout", async () => {
  const css = await loadCss();
  const rule = getRule(css, [".qrPreview"]);

  assert.ok(rule, ".qrPreview rule should be defined");
  assert.equal(rule.declarationMap.display, "flex", ".qrPreview should use display: flex");
  assert.equal(
    rule.declarationMap["flex-direction"],
    "column",
    ".qrPreview should stack children in a column"
  );
  assert.equal(
    rule.declarationMap["align-items"],
    "center",
    ".qrPreview should center children horizontally"
  );
});

test("qr code frame keeps a square aspect ratio and centers content", async () => {
  const css = await loadCss();
  const rule = getRule(css, [".qrCode"]);

  assert.ok(rule, ".qrCode rule should be defined");
  assert.equal(rule.declarationMap["aspect-ratio"], "1 / 1", ".qrCode should be square");
  assert.equal(rule.declarationMap.display, "flex", ".qrCode should use display: flex");
  assert.equal(rule.declarationMap["align-items"], "center");
  assert.equal(rule.declarationMap["justify-content"], "center");
});

test("injected canvas/svg are sized responsively (no crop)", async () => {
  const css = await loadCss();
  const rule = getRule(css, CANVAS_CHILDREN);

  assert.ok(rule, ".qrCanvas canvas/svg rule should be defined");
  assert.equal(rule.declarationMap.width, "100% !important");
  assert.equal(rule.declarationMap.height, "100% !important");
  assert.equal(rule.declarationMap["max-width"], "100% !important");
  assert.equal(rule.declarationMap["max-height"], "100% !important");
  assert.equal(rule.declarationMap["object-fit"], "contain");
  assert.equal(rule.declarationMap.display, "block");
});

test("crop prevention forces sizing with !important", async () => {
  const css = await loadCss();
  const rule = getRule(css, CANVAS_CHILDREN);

  assert.ok(rule, ".qrCanvas canvas/svg rule should be defined");
  assert.ok(rule.declarationMap.width?.includes("!important"), "width should use !important");
  assert.ok(rule.declarationMap.height?.includes("!important"), "height should use !important");
  assert.ok(
    rule.declarationMap["max-width"]?.includes("!important"),
    "max-width should use !important"
  );
  assert.ok(
    rule.declarationMap["max-height"]?.includes("!important"),
    "max-height should use !important"
  );
});

test("object-fit: contain handles different QR shapes", async () => {
  const css = await loadCss();
  const rule = getRule(css, CANVAS_CHILDREN);

  assert.ok(rule, ".qrCanvas canvas/svg rule should be defined");
  assert.equal(
    rule.declarationMap["object-fit"],
    "contain",
    "object-fit: contain should handle square/circle dot shapes without cropping"
  );
});
