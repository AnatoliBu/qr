const SVG_NS = "http://www.w3.org/2000/svg";

function clampSpacing(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 0.6) return 0.6;
  return value;
}

function applyDotSpacing(svg, spacing, filter) {
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

    if (typeof filter === "function" && !filter(rect, width, height)) {
      return;
    }

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

const CUSTOM_DOT_SHAPES = [
  {
    id: "heart",
    name: "Сердце",
    emoji: "❤️",
    renderPath: (x, y, size) => {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 4;
      return `M ${cx} ${cy + r}
              C ${cx} ${cy + r}, ${cx - r * 2} ${cy - r}, ${cx - r * 2} ${cy - r * 2}
              A ${r} ${r} 0 0 1 ${cx} ${cy - r}
              A ${r} ${r} 0 0 1 ${cx + r * 2} ${cy - r * 2}
              C ${cx + r * 2} ${cy - r}, ${cx} ${cy + r}, ${cx} ${cy + r} Z`;
    }
  },
  {
    id: "star",
    name: "Звезда",
    emoji: "⭐",
    renderPath: (x, y, size) => {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const outerR = size / 2;
      const innerR = size / 4;
      let path = `M ${cx} ${cy - outerR}`;
      for (let i = 0; i < 5; i++) {
        const angle1 = (i * 72 - 90) * Math.PI / 180;
        const angle2 = (i * 72 - 90 + 36) * Math.PI / 180;
        const x1 = cx + innerR * Math.cos(angle2);
        const y1 = cy + innerR * Math.sin(angle2);
        const x2 = cx + outerR * Math.cos(angle1 + Math.PI * 2 / 5);
        const y2 = cy + outerR * Math.sin(angle1 + Math.PI * 2 / 5);
        path += ` L ${x1} ${y1} L ${x2} ${y2}`;
      }
      return path + " Z";
    }
  },
  {
    id: "plus",
    name: "Плюс",
    emoji: "➕",
    renderPath: (x, y, size) => {
      const w = size / 3;
      const cx = x + size / 2;
      const cy = y + size / 2;
      return `M ${cx - w / 2} ${y}
              H ${cx + w / 2}
              V ${cy - w / 2}
              H ${x + size}
              V ${cy + w / 2}
              H ${cx + w / 2}
              V ${y + size}
              H ${cx - w / 2}
              V ${cy + w / 2}
              H ${x}
              V ${cy - w / 2}
              H ${cx - w / 2} Z`;
    }
  },
  {
    id: "diamond",
    name: "Ромб",
    emoji: "💎",
    renderPath: (x, y, size) => {
      const cx = x + size / 2;
      const cy = y + size / 2;
      return `M ${cx} ${y}
              L ${x + size} ${cy}
              L ${cx} ${y + size}
              L ${x} ${cy} Z`;
    }
  }
];

function isCustomDotShapeSupported(shapeId) {
  if (typeof shapeId !== "string") {
    return false;
  }

  return CUSTOM_DOT_SHAPES.some((shape) => shape.id === shapeId);
}

function applyCustomDotShape(svg, shapeId, spacing, filter) {
  const shape = CUSTOM_DOT_SHAPES.find((item) => item.id === shapeId);
  if (!shape) {
    applyDotSpacing(svg, spacing, filter);
    return;
  }

  const safeSpacing = clampSpacing(spacing);
  const scale = 1 - safeSpacing;
  const rects = svg.querySelectorAll("rect");

  rects.forEach((rect) => {
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    if (!width || !height) return;
    if (width > 40 || height > 40) return;

    if (typeof filter === "function" && !filter(rect, width, height)) {
      return;
    }

    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const newSize = Math.min(width, height) * scale;
    const newX = centerX - newSize / 2;
    const newY = centerY - newSize / 2;

    const path = svg.ownerDocument.createElementNS(SVG_NS, "path");
    path.setAttribute("d", shape.renderPath(newX, newY, newSize));
    path.setAttribute("fill", rect.getAttribute("fill") || "#000000");

    rect.parentNode?.replaceChild(path, rect);
  });
}

function createSuperellipsePath(cx, cy, radiusX, radiusY, exponent = 4, steps = 48) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return "";
  }

  const safeRadiusX = Number.isFinite(radiusX) && radiusX > 0 ? radiusX : 0;
  const safeRadiusY = Number.isFinite(radiusY) && radiusY > 0 ? radiusY : 0;
  if (safeRadiusX === 0 || safeRadiusY === 0) {
    return "";
  }

  const power = Math.max(2, exponent);
  const segments = Math.max(8, steps);
  let path = "";

  for (let index = 0; index <= segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const cosSign = Math.sign(cos) || 1;
    const sinSign = Math.sign(sin) || 1;
    const absCos = Math.abs(cos);
    const absSin = Math.abs(sin);

    const x = cx + safeRadiusX * cosSign * Math.pow(absCos, 2 / power);
    const y = cy + safeRadiusY * sinSign * Math.pow(absSin, 2 / power);

    path += `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)} `;
  }

  return `${path}Z`;
}

function strengthenInnerEyeClipPaths(svg, overshoot = 1.12, exponent = 4) {
  if (!svg || typeof svg.querySelectorAll !== "function") {
    return;
  }

  const clipPaths = svg.querySelectorAll("clipPath[id*='clip-path-corners-dot']");

  clipPaths.forEach((clipPath) => {
    const circle = clipPath.querySelector("circle");
    if (!circle) {
      return;
    }

    const cx = Number(circle.getAttribute("cx"));
    const cy = Number(circle.getAttribute("cy"));
    const radius = Number(circle.getAttribute("r"));

    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius) || radius <= 0) {
      return;
    }

    const transform = circle.getAttribute("transform");
    const path = svg.ownerDocument.createElementNS(SVG_NS, "path");
    path.setAttribute("d", createSuperellipsePath(cx, cy, radius * overshoot, radius * overshoot, exponent));
    if (transform) {
      path.setAttribute("transform", transform);
    }

    clipPath.replaceChildren(path);
  });
}

function expandInnerEyeClipRects(svg, overshoot = 1.08) {
  if (!svg || typeof svg.querySelectorAll !== "function") {
    return;
  }

  const clipPaths = svg.querySelectorAll("clipPath[id*='clip-path-corners-dot']");

  clipPaths.forEach((clipPath) => {
    const rect = clipPath.querySelector("rect");
    if (!rect) {
      return;
    }

    if (rect.getAttribute("data-strengthened") === "1") {
      return;
    }

    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const newWidth = width * overshoot;
    const newHeight = height * overshoot;

    rect.setAttribute("x", (centerX - newWidth / 2).toFixed(3));
    rect.setAttribute("y", (centerY - newHeight / 2).toFixed(3));
    rect.setAttribute("width", newWidth.toFixed(3));
    rect.setAttribute("height", newHeight.toFixed(3));

    const rx = Number(rect.getAttribute("rx"));
    if (Number.isFinite(rx) && rx > 0) {
      rect.setAttribute("rx", Math.min(newWidth / 2, rx * overshoot).toFixed(3));
    }

    const ry = Number(rect.getAttribute("ry"));
    if (Number.isFinite(ry) && ry > 0) {
      rect.setAttribute("ry", Math.min(newHeight / 2, ry * overshoot).toFixed(3));
    }

    rect.setAttribute("data-strengthened", "1");
  });
}

export {
  SVG_NS,
  clampSpacing,
  applyDotSpacing,
  CUSTOM_DOT_SHAPES,
  applyCustomDotShape,
  isCustomDotShapeSupported,
  strengthenInnerEyeClipPaths,
  expandInnerEyeClipRects,
};
