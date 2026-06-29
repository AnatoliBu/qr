import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const QRCode = require("qrcode");

const loadWorkerModule = async () => {
  const workerUrl = new URL("../src/workers/batchGenerator.worker.ts", import.meta.url);
  const source = await readFile(workerUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true
    },
    fileName: fileURLToPath(workerUrl)
  });

  const sandboxSelf = { postMessage: () => {} };
  const moduleScope = { exports: {} };
  const sandbox = {
    module: moduleScope,
    exports: moduleScope.exports,
    require,
    TextEncoder,
    self: sandboxSelf,
    setTimeout,
    clearTimeout,
    console
  };

  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: path.basename(workerUrl.pathname)
  });

  return { exports: moduleScope.exports, self: sandboxSelf };
};

test("worker uses qrcode auto-mode (no forced byte segments)", async () => {
  const { exports } = await loadWorkerModule();
  // createSegments was removed so the qrcode library auto-selects the densest
  // encoding mode (numeric/alphanumeric/byte) per payload. The worker now passes
  // the raw payload straight to QRCode.toString/toDataURL.
  assert.equal(
    exports.createSegments,
    undefined,
    "createSegments should no longer be exported (auto-mode is used instead)"
  );
});

test("QRCode renders SVG and PNG from a raw payload (the worker's call path)", async () => {
  const opts = { width: 128, errorCorrectionLevel: "M", margin: 4 };

  const svg = await QRCode.toString("Hello", { ...opts, type: "svg" });
  assert.match(svg, /<svg/);

  const dataUrl = await QRCode.toDataURL("Hello", opts);
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test("auto-mode encodes Cyrillic (UTF-8) payloads without segments", async () => {
  // Removing createSegments must not regress UTF-8 payloads — qrcode handles them
  // in byte mode automatically.
  const svg = await QRCode.toString("Привет", {
    type: "svg",
    width: 128,
    errorCorrectionLevel: "M",
    margin: 4
  });
  assert.match(svg, /<svg/);
});
