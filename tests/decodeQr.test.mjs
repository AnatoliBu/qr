import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// A true headless image decode is not feasible here: src/lib/decodeQr.ts drives
// @zxing/browser, which needs a DOM (<img>/canvas/URL.createObjectURL) that this
// node:test environment does not provide (no jsdom/canvas dep). Per the task we
// therefore assert the *decoder contract / module shape*: it exports a single
// async decodeQr that delegates to ONE shared @zxing reader, returns the decoded
// text, and returns null (never throws) for an undecodable image.
//
// We transpile the TS and run it with a stubbed @zxing/browser so the call path
// (decodeFromImageUrl for string/Blob URLs) is exercised against the real source.
async function loadDecodeQr(zxingStub) {
  const url = new URL("../src/lib/decodeQr.ts", import.meta.url);
  const source = await readFile(url, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true
    },
    fileName: fileURLToPath(url)
  });

  const stubRequire = (id) => {
    if (id === "@zxing/browser") return zxingStub;
    return require(id);
  };
  const moduleScope = { exports: {} };
  const sandbox = {
    module: moduleScope,
    exports: moduleScope.exports,
    require: stubRequire,
    console,
    URL,
    // Deliberately leave HTMLCanvasElement undefined: the source guards on
    // `typeof HTMLCanvasElement !== "undefined"`, so the canvas branch is skipped.
    HTMLCanvasElement: undefined
  };
  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: path.basename(url.pathname)
  });
  return moduleScope.exports;
}

// Build a stub @zxing/browser whose reader records calls and yields a scripted
// outcome (decoded text, or a throw to simulate an undecodable image).
function makeZxingStub({ text, shouldThrow } = {}) {
  const calls = { construct: 0, decodeFromImageUrl: [], decodeFromCanvas: [] };
  class BrowserMultiFormatReader {
    constructor() {
      calls.construct += 1;
    }
    async decodeFromImageUrl(u) {
      calls.decodeFromImageUrl.push(u);
      if (shouldThrow) throw new Error("no QR found");
      return { getText: () => text };
    }
    decodeFromCanvas(c) {
      calls.decodeFromCanvas.push(c);
      if (shouldThrow) throw new Error("no QR found");
      return { getText: () => text };
    }
  }
  return { stub: { BrowserMultiFormatReader }, calls };
}

test("module shape: exports a single async decodeQr function", async () => {
  const { stub } = makeZxingStub({ text: "ok" });
  const mod = await loadDecodeQr(stub);
  assert.equal(typeof mod.decodeQr, "function", "decodeQr is exported");
  assert.equal(mod.decodeQr.length, 1, "decodeQr takes one argument");
  const ret = mod.decodeQr("data:image/png;base64,AAAA");
  assert.ok(ret && typeof ret.then === "function", "decodeQr returns a Promise");
  await ret;
});

test("string URL input is handed straight to the shared reader and returns its text", async () => {
  const { stub, calls } = makeZxingStub({ text: "https://example.com" });
  const { decodeQr } = await loadDecodeQr(stub);
  const out = await decodeQr("data:image/png;base64,AAAA");
  assert.equal(out, "https://example.com");
  assert.equal(calls.decodeFromImageUrl.length, 1);
  assert.equal(calls.decodeFromImageUrl[0], "data:image/png;base64,AAAA");
});

test("reader is a single shared instance across calls (constructed once)", async () => {
  const { stub, calls } = makeZxingStub({ text: "x" });
  const { decodeQr } = await loadDecodeQr(stub);
  await decodeQr("a");
  await decodeQr("b");
  await decodeQr("c");
  assert.equal(calls.construct, 1, "BrowserMultiFormatReader constructed exactly once");
});

test("returns null (never throws) for an undecodable string input", async () => {
  const { stub } = makeZxingStub({ shouldThrow: true });
  const { decodeQr } = await loadDecodeQr(stub);
  const out = await decodeQr("data:image/png;base64,ZZZZ");
  assert.equal(out, null);
});

test("Blob input is wrapped in an object URL, decoded, and the URL revoked", async () => {
  const { stub, calls } = makeZxingStub({ text: "from-blob" });
  const { decodeQr } = await loadDecodeQr(stub);

  // Track object-URL lifecycle on the real global URL the sandbox shares.
  const created = [];
  const revoked = [];
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (b) => {
    const u = `blob:mock/${created.length}`;
    created.push(b);
    return u;
  };
  URL.revokeObjectURL = (u) => revoked.push(u);
  try {
    const fakeBlob = { size: 4, type: "image/png" }; // not a string, not a canvas
    const out = await decodeQr(fakeBlob);
    assert.equal(out, "from-blob");
    assert.equal(created.length, 1, "object URL created for the blob");
    assert.equal(revoked.length, 1, "object URL revoked after decode");
    assert.equal(calls.decodeFromImageUrl.at(-1), "blob:mock/0");
  } finally {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  }
});

test("Blob input still revokes the object URL when decoding fails", async () => {
  const { stub } = makeZxingStub({ shouldThrow: true });
  const { decodeQr } = await loadDecodeQr(stub);
  const created = [];
  const revoked = [];
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => {
    const u = `blob:mock/${created.length}`;
    created.push(u);
    return u;
  };
  URL.revokeObjectURL = (u) => revoked.push(u);
  try {
    const out = await decodeQr({ size: 4, type: "image/png" });
    assert.equal(out, null, "undecodable blob -> null");
    assert.equal(revoked.length, 1, "object URL revoked in finally even on failure");
  } finally {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  }
});
