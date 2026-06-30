import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// GUARD (DESIGN §1): the #1 past bug was two CSS systems fighting via duplicated
// global component selectors. The removed legacy preview classes must never come
// back as global CSS selectors in src/app/*.css, nor as global class strings in
// any .tsx (component styling lives in CSS modules only).
const FORBIDDEN = [".preview", ".preview__canvas", ".preview__actions"];

const APP_CSS_DIR = fileURLToPath(new URL("../src/app/", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("../src/", import.meta.url));

async function walk(dir, predicate) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...(await walk(full, predicate)));
    } else if (predicate(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Matches a CSS class selector for `name` but NOT a longer class that merely
// ends with it: `.preview` must hit `.preview {`, `.preview__canvas`, `.preview:hover`
// but NOT `.batch__preview` or `.qrPreview`. The char before the dot must not be
// a class-name char (so we reject suffix matches like `batch__preview`).
function classSelectorRegex(klass) {
  const name = klass.slice(1); // drop leading dot
  // (^|[^\w-.]) before the dot ⇒ not preceded by an identifier char.
  // (?![\w-]) after the name ⇒ name is not a prefix of a longer class.
  return new RegExp(`(^|[^\\w.\\-])\\.${name}(?![\\w-])`, "g");
}

test("src/app/*.css contains no legacy global preview selectors", async () => {
  const files = (await readdir(APP_CSS_DIR)).filter((f) => f.endsWith(".css"));
  assert.ok(files.length > 0, "expected at least one css file in src/app");

  for (const file of files) {
    const css = await readFile(path.join(APP_CSS_DIR, file), "utf8");
    for (const klass of FORBIDDEN) {
      const re = classSelectorRegex(klass);
      const hits = css.match(re) || [];
      assert.equal(
        hits.length,
        0,
        `src/app/${file} must not use legacy selector "${klass}" (found ${hits.length}: ${JSON.stringify(hits)})`
      );
    }
  }
});

test("legacy-selector guard does not false-positive on allowed classes", () => {
  // Sanity: ensure the regex tells .batch__preview / .qrPreview apart from .preview.
  const re = () => classSelectorRegex(".preview");
  assert.equal((".batch__preview { color: red }".match(re()) || []).length, 0);
  assert.equal((".qrPreview { display: flex }".match(re()) || []).length, 0);
  assert.equal((".preview { color: red }".match(re()) || []).length, 1);
  assert.equal((".preview__canvas {}".match(classSelectorRegex(".preview__canvas")) || []).length, 1);
});

test("no .tsx uses the legacy preview classes as global class strings", async () => {
  const tsxFiles = await walk(SRC_DIR, (n) => n.endsWith(".tsx"));
  assert.ok(tsxFiles.length > 0, "expected at least one .tsx under src");

  // Forbid the bare class as a global class-name string literal:
  // className="preview", className="... preview ...", classNames(styles.x, "preview").
  // styles.preview (CSS-module access) is allowed — that is NOT a global class.
  //
  // We only inspect short single-line quoted literals whose ENTIRE value is a
  // class-list (letters/digits/-/_/spaces). This ignores comments, URLs and
  // arbitrary JS strings, which is what produced false positives in a naive
  // "anything between quotes" scan.
  const bareNames = ["preview", "preview__canvas", "preview__actions"];
  const classLiteralRe = /(["'`])([A-Za-z0-9 _-]{1,80})\1/g;

  for (const file of tsxFiles) {
    const src = await readFile(file, "utf8");
    const rel = path.relative(SRC_DIR, file);
    for (const m of src.matchAll(classLiteralRe)) {
      const tokens = m[2].split(/\s+/).filter(Boolean);
      for (const name of bareNames) {
        assert.ok(
          !tokens.includes(name),
          `src/${rel} must not use "${name}" as a global class string (literal ${JSON.stringify(m[0])})`
        );
      }
    }
  }
});
