import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCustomDotShape,
  applyDotSpacing,
  clampSpacing,
  CUSTOM_DOT_SHAPES,
  collectInnerEyeClipRectBounds,
  expandInnerEyeClipRects,
  isCustomDotShapeSupported,
  isInnerEyeClipRect,
  strengthenInnerEyeClipPaths,
} from "../src/lib/qrCustomShapes.mjs";

const createRect = ({
  width,
  height,
  x = 0,
  y = 0,
  fill = "#000000",
  rx,
  ry,
  clipPath,
}) => {
  const attributes = new Map([
    ["width", String(width)],
    ["height", String(height)],
    ["x", String(x)],
    ["y", String(y)],
    ["fill", fill],
  ]);

  if (typeof rx === "number") {
    attributes.set("rx", String(rx));
  }

  if (typeof ry === "number") {
    attributes.set("ry", String(ry));
  }

  if (clipPath) {
    attributes.set("clip-path", clipPath);
  }

  return {
    tagName: "rect",
    attributes,
    parentNode: null,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
  };
};

const createSvg = (rects) => {
  const replacements = [];
  const created = [];

  const parentNode = {
    replaceChild(newNode, oldNode) {
      replacements.push({ newNode, oldNode });
      newNode.parentNode = parentNode;
      const index = rects.indexOf(oldNode);
      if (index >= 0) {
        rects[index] = newNode;
      }
    },
  };

  rects.forEach((rect) => {
    rect.parentNode = parentNode;
  });

  const svg = {
    ownerDocument: {
      createElementNS(_ns, tag) {
        const attrs = new Map();
        const node = {
          tagName: tag,
          parentNode: null,
          attributes: attrs,
          setAttribute(name, value) {
            attrs.set(name, String(value));
          },
          getAttribute(name) {
            return attrs.get(name) ?? null;
          },
        };
        created.push(node);
        return node;
      },
    },
    querySelectorAll(selector) {
      if (selector === "rect") {
        return rects;
      }
      if (selector === "[clip-path]") {
        return rects.filter((rect) => Boolean(rect.getAttribute("clip-path")));
      }
      return [];
    },
  };

  return { svg, parentNode, replacements, created };
};

const createClipPath = ({
  id,
  cx,
  cy,
  r,
  transform = "",
  shape = "circle",
  x,
  y,
  width,
  height,
  rx,
  ry,
}) => {
  const attrs = new Map([["id", id]]);

  const clipPath = {
    tagName: "clipPath",
    attributes: attrs,
    childNodes: [],
    parentNode: null,
    getAttribute(name) {
      return attrs.get(name) ?? null;
    },
    querySelector(selector) {
      return this.childNodes.find((node) => node.tagName === selector) ?? null;
    },
    replaceChildren(node) {
      this.childNodes = [node];
      node.parentNode = this;
    },
  };

  if (shape === "rect") {
    const rectAttrs = new Map([
      ["x", String(x)],
      ["y", String(y)],
      ["width", String(width)],
      ["height", String(height)],
    ]);
    if (typeof rx === "number") {
      rectAttrs.set("rx", String(rx));
    }
    if (typeof ry === "number") {
      rectAttrs.set("ry", String(ry));
    }
    if (transform) {
      rectAttrs.set("transform", transform);
    }

    const rect = {
      tagName: "rect",
      parentNode: clipPath,
      attributes: rectAttrs,
      getAttribute(name) {
        return rectAttrs.get(name) ?? null;
      },
      setAttribute(name, value) {
        rectAttrs.set(name, String(value));
      },
    };

    clipPath.childNodes.push(rect);
  } else {
    const circleAttrs = new Map([
      ["cx", String(cx)],
      ["cy", String(cy)],
      ["r", String(r)],
    ]);
    if (transform) {
      circleAttrs.set("transform", transform);
    }

    const circle = {
      tagName: "circle",
      parentNode: clipPath,
      attributes: circleAttrs,
      getAttribute(name) {
        return circleAttrs.get(name) ?? null;
      },
      setAttribute(name, value) {
        circleAttrs.set(name, String(value));
      },
    };

    clipPath.childNodes.push(circle);
  }

  return clipPath;
};

const createSvgWithClipPaths = (clipPaths, clippedElements = []) => {
  const created = [];

  const svg = {
    ownerDocument: {
      createElementNS(_ns, tag) {
        const attrs = new Map();
        const node = {
          tagName: tag,
          parentNode: null,
          attributes: attrs,
          setAttribute(name, value) {
            attrs.set(name, String(value));
          },
          getAttribute(name) {
            return attrs.get(name) ?? null;
          },
        };
        created.push(node);
        return node;
      },
    },
    querySelectorAll(selector) {
      if (selector === "clipPath[id*='clip-path-corners-dot']") {
        return clipPaths;
      }

      if (selector === "clipPath[id*='clip-path-corners-dot'] rect") {
        return clipPaths
          .map((clipPath) => clipPath.querySelector("rect"))
          .filter((rect) => rect !== null);
      }

      if (selector === "[clip-path]") {
        return clippedElements;
      }

      return [];
    },
  };

  return { svg, created };
};

test("clampSpacing enforces bounds", () => {
  assert.equal(clampSpacing(-1), 0);
  assert.equal(clampSpacing(0.3), 0.3);
  assert.equal(clampSpacing(1.5), 0.6);
  assert.equal(clampSpacing(Number.NaN), 0);
});

test("applyDotSpacing scales modules when no custom shape is provided", () => {
  const rect = createRect({ width: 10, height: 10, x: 0, y: 0 });
  const { svg } = createSvg([rect]);

  applyDotSpacing(svg, 0.2);

  assert.equal(rect.getAttribute("width"), "8.000");
  assert.equal(rect.getAttribute("height"), "8.000");
  assert.equal(rect.getAttribute("x"), "1.000");
  assert.equal(rect.getAttribute("y"), "1.000");
});

test("applyDotSpacing respects provided filter", () => {
  const rectA = createRect({ width: 10, height: 10, x: 0, y: 0 });
  const rectB = createRect({ width: 12, height: 12, x: 20, y: 0 });
  const { svg } = createSvg([rectA, rectB]);

  applyDotSpacing(svg, 0.2, (rect) => rect === rectA);

  assert.equal(rectA.getAttribute("width"), "8.000");
  assert.equal(rectA.getAttribute("height"), "8.000");
  assert.equal(rectB.getAttribute("width"), "12");
  assert.equal(rectB.getAttribute("height"), "12");
});

test("isInnerEyeClipRect detects finder inner modules", () => {
  const rect = createRect({
    width: 14,
    height: 14,
    x: 10,
    y: 10,
    clipPath: "url('#clip-path-corners-dot-color-0-0-1')",
  });

  assert.equal(isInnerEyeClipRect(rect), true);
});

test("isInnerEyeClipRect ignores unrelated clip paths", () => {
  const rect = createRect({
    width: 14,
    height: 14,
    x: 10,
    y: 10,
    clipPath: "url('#clip-path-somewhere-else')",
  });

  assert.equal(isInnerEyeClipRect(rect), false);
  assert.equal(isInnerEyeClipRect(null), false);
});

test("collectInnerEyeClipRectBounds extracts finder geometry", () => {
  const clipPath = createClipPath({
    id: "clip-path-corners-dot-color-0-0-1",
    shape: "rect",
    x: 20,
    y: 24,
    width: 36,
    height: 36,
  });
  const { svg } = createSvgWithClipPaths([clipPath]);

  const bounds = collectInnerEyeClipRectBounds(svg);

  assert.deepEqual(bounds, [{ x: 20, y: 24, width: 36, height: 36 }]);
});

test("collectInnerEyeClipRectBounds skips invalid clip nodes", () => {
  const valid = createClipPath({
    id: "clip-path-corners-dot-color-0-0-1",
    shape: "rect",
    x: 10,
    y: 10,
    width: 30,
    height: 30,
  });
  const zeroWidth = createClipPath({
    id: "clip-path-corners-dot-color-0-0-2",
    shape: "rect",
    x: 15,
    y: 15,
    width: 0,
    height: 20,
  });
  const circle = createClipPath({
    id: "clip-path-corners-dot-color-0-0-3",
    shape: "circle",
    cx: 12,
    cy: 12,
    r: 6,
  });

  const { svg } = createSvgWithClipPaths([valid, zeroWidth, circle]);

  const bounds = collectInnerEyeClipRectBounds(svg);

  assert.deepEqual(bounds, [{ x: 10, y: 10, width: 30, height: 30 }]);
});

test("applyCustomDotShape replaces rects with SVG paths", () => {
  const rect = createRect({ width: 12, height: 12, x: 4, y: 6, fill: "#ff0000" });
  const { svg, replacements } = createSvg([rect]);
  const heart = CUSTOM_DOT_SHAPES.find((shape) => shape.id === "heart");
  assert.ok(heart, "heart shape should exist");

  const calls = [];
  const originalRender = heart.renderPath;
  heart.renderPath = (x, y, size) => {
    calls.push({ x, y, size });
    return originalRender(x, y, size);
  };

  try {
    applyCustomDotShape(svg, "heart", 0.1);
  } finally {
    heart.renderPath = originalRender;
  }

  assert.equal(replacements.length, 1, "rect should be replaced with a path");
  const [replacement] = replacements;
  assert.equal(replacement.newNode.tagName, "path");
  assert.equal(replacement.newNode.getAttribute("fill"), "#ff0000");
  assert.ok(replacement.newNode.getAttribute("d"), "path should have drawing instructions");

  assert.equal(calls.length, 1, "renderPath should be called once per rect");
  const { x, y, size } = calls[0];
  assert.equal(Number(x.toFixed(3)), 4.6);
  assert.equal(Number(y.toFixed(3)), 6.6);
  assert.equal(Number(size.toFixed(3)), 10.8);
});

test("applyCustomDotShape falls back to spacing for unsupported shape", () => {
  const rect = createRect({ width: 20, height: 20, x: 0, y: 0 });
  const { svg, replacements } = createSvg([rect]);

  applyCustomDotShape(svg, "unknown", 0.25);

  assert.equal(replacements.length, 0, "rect should not be replaced for unknown shapes");
  assert.equal(rect.getAttribute("width"), "15.000");
  assert.equal(rect.getAttribute("height"), "15.000");
  assert.equal(rect.getAttribute("x"), "2.500");
  assert.equal(rect.getAttribute("y"), "2.500");
});

test("applyCustomDotShape skips large positioning modules", () => {
  const rect = createRect({ width: 50, height: 50, x: 0, y: 0 });
  const { svg, replacements } = createSvg([rect]);

  applyCustomDotShape(svg, "star", 0);

  assert.equal(replacements.length, 0);
});

test("isCustomDotShapeSupported guards against invalid values", () => {
  assert.equal(isCustomDotShapeSupported("heart"), true);
  assert.equal(isCustomDotShapeSupported("unknown"), false);
  assert.equal(isCustomDotShapeSupported(null), false);
});

test("applyCustomDotShape only transforms rects accepted by filter", () => {
  const heart = CUSTOM_DOT_SHAPES.find((shape) => shape.id === "heart");
  assert.ok(heart);

  const rectSmall = createRect({ width: 12, height: 12, x: 0, y: 0, fill: "#000" });
  const rectLarge = createRect({ width: 36, height: 36, x: 20, y: 20, fill: "#111" });
  const { svg, replacements } = createSvg([rectSmall, rectLarge]);

  applyCustomDotShape(svg, "heart", 0, (rect, width) => width < 20);

  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].oldNode, rectSmall);
  assert.equal(rectLarge.tagName, "rect");
  assert.equal(rectLarge.getAttribute("fill"), "#111");
});

test("expandInnerEyeClipRects enlarges square clips without compounding", () => {
  const clipPath = createClipPath({
    id: "clip-path-corners-dot-color-0-0-1",
    shape: "rect",
    x: 77,
    y: 77,
    width: 51,
    height: 51,
    rx: 4,
    ry: 4,
  });
  const clippedRect = createRect({
    width: 51,
    height: 51,
    x: 77,
    y: 77,
    rx: 3,
    ry: 3,
    clipPath: "url('#clip-path-corners-dot-color-0-0-1')",
  });
  const { svg } = createSvgWithClipPaths([clipPath], [clippedRect]);

  expandInnerEyeClipRects(svg, 1.1);

  const rect = clipPath.querySelector("rect");
  assert.ok(rect, "clip path should include a rect");
  assert.equal(rect.getAttribute("width"), "56.100");
  assert.equal(rect.getAttribute("height"), "56.100");
  assert.equal(rect.getAttribute("x"), "74.450");
  assert.equal(rect.getAttribute("y"), "74.450");
  assert.equal(rect.getAttribute("rx"), "0");
  assert.equal(rect.getAttribute("ry"), "0");
  assert.equal(rect.getAttribute("data-strengthened"), "1");

  assert.equal(clippedRect.getAttribute("width"), "56.100");
  assert.equal(clippedRect.getAttribute("height"), "56.100");
  assert.equal(clippedRect.getAttribute("x"), "74.450");
  assert.equal(clippedRect.getAttribute("y"), "74.450");
  assert.equal(clippedRect.getAttribute("rx"), "0");
  assert.equal(clippedRect.getAttribute("ry"), "0");
  assert.equal(clippedRect.getAttribute("data-strengthened"), "1");

  const prevX = rect.getAttribute("x");
  const prevY = rect.getAttribute("y");
  const prevWidth = rect.getAttribute("width");
  const prevHeight = rect.getAttribute("height");

  const prevRectX = clippedRect.getAttribute("x");
  const prevRectY = clippedRect.getAttribute("y");
  const prevRectWidth = clippedRect.getAttribute("width");
  const prevRectHeight = clippedRect.getAttribute("height");

  expandInnerEyeClipRects(svg, 1.1);

  assert.equal(rect.getAttribute("x"), prevX);
  assert.equal(rect.getAttribute("y"), prevY);
  assert.equal(rect.getAttribute("width"), prevWidth);
  assert.equal(rect.getAttribute("height"), prevHeight);

  assert.equal(clippedRect.getAttribute("x"), prevRectX);
  assert.equal(clippedRect.getAttribute("y"), prevRectY);
  assert.equal(clippedRect.getAttribute("width"), prevRectWidth);
  assert.equal(clippedRect.getAttribute("height"), prevRectHeight);
});

test("strengthenInnerEyeClipPaths replaces circular clips with enlarged paths", () => {
  const clipPath = createClipPath({
    id: "clip-path-corners-dot-color-0-0-1",
    cx: 40,
    cy: 40,
    r: 15,
    transform: "rotate(0,40,40)",
  });
  const { svg } = createSvgWithClipPaths([clipPath]);

  strengthenInnerEyeClipPaths(svg, 1.2);

  const [child] = clipPath.childNodes;
  assert.ok(child, "clip path should have a replacement child");
  assert.equal(child.tagName, "path", "clip should be replaced with a path");
  assert.equal(child.getAttribute("transform"), "rotate(0,40,40)");

  const pathData = child.getAttribute("d");
  assert.ok(pathData && pathData.includes("M"), "path should contain drawing instructions");
  const numbers = pathData
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value)) ?? [];

  assert.ok(numbers.some((value) => value > 55), "path should extend beyond the original radius");
});
