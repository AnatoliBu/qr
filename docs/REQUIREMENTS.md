# QR Suite — Requirements

> The canonical source of truth for **what** the tool does. Implementation and tests
> must conform to this document; if code and this doc disagree, one of them is a bug.

## 1. Product

A **tool** (not a marketing site) for generating, styling, batch-producing and scanning
QR codes. Runs as a Next.js web app and as a **Telegram Mini App** (TMA). Mobile-first,
dense, immediate, trustworthy. No account, no backend — all client-side; the draft
persists locally (IndexedDB).

### Principles
- **Tool-first**: every pixel earns its place; vertical space is precious (TMA).
- **Immediate**: the preview is live; every setting visibly changes it without a manual step.
- **Trustworthy**: what you preview is what you export; the tool tells you if a code is unreadable.
- **Coherent & non-contradictory**: one design-token system, one CSS source per concern,
  one settings model. No `!important` fights, no dead/duplicate rules.

## 2. Modes
| Mode | Purpose |
|------|---------|
| **Генератор** | Build one QR: pick type → fill fields → style → save. |
| **Пакет** | Generate many QRs from a CSV/XLSX into a ZIP. |
| **Сканер** | Decode a QR from the camera or an uploaded image. |

## 3. Content types (registered in `src/lib/qrTypesRuntime.mjs`)
`url, text, phone, sms, email, geo, wifi, vcard, mecard, event/ics` (+ any others in the
registry). Each declares its fields, validation, and payload encoder. **Requirement:** the
UI is generated from the registry — adding a type must not require touching the generator.

## 4. Settings model (single source of truth = `StyleOptions` + `QR_SYSTEM`)

Every setting below must: (a) have a documented default + rationale, (b) be reflected
**live** in the preview, (c) be covered by a unit test (style→`Options` mapping) **and**
an e2e test (visible effect). Scope decision: **keep all current settings**, make them coherent.

| Setting | Type / range | Default | Rationale | Constraints / relationships |
|---|---|---|---|---|
| `exportSize` | 256–4096, step 64 | 1024 | print-safe, not huge | export only — **must not change preview** |
| `exportFormat` | png \| svg | png | raster default; svg for print | drives the saved file + extension |
| `marginPercent` | 0–20%, step 2 | 8 | QR quiet-zone standard | the **only** white border around the QR; 0 ⇒ QR fills the frame edge-to-edge |
| `errorCorrection` | L/M/Q/H | H | survives logo/damage | **caps `logoSize`** (LOGO_SIZE_LIMITS); shown to the user |
| `foreground` | hex | #000000 | contrast | contributes to readability (contrast ≥ 4.5 advised) |
| `background` | hex | #ffffff | contrast | contributes to readability |
| `dotStyle` | 6 styles | rounded | brand look | must not break decoding (preflight checks) |
| `eyeOuter` | 3 styles | square | finder pattern | — |
| `eyeInner` | 2 styles | square | finder pattern | — |
| `shape` | square \| circle | square | framing | circle must not crop modules |
| `dotSpacing` | 0–N % | 0 | density tuning | high spacing can break decoding (preflight) |
| `logoDataUrl` | image | — | branding | raises recommended EC |
| `logoSize` | % | 18 | legible logo | **auto-clamped to `LOGO_SIZE_LIMITS[EC]`** |
| `hideBackgroundDots` | bool | true | clean logo | — |
| `useDotsGradient` + `dotsGradient` | bool + {type,rotation,stops} | off | style | overrides `foreground` when on |
| `useBackgroundGradient` + `backgroundGradient` | bool + gradient | off | style | overrides `background` when on |
| `useCornersGradient` + `cornersGradient` | bool + gradient | off | style | overrides corner color when on |

System constants (`QR_SYSTEM`): `PREVIEW.LOGICAL_SIZE=280`, `EXPORT 256–4096/1024/step64`,
`MARGIN 0–20/8/step2`.

## 5. Flows & acceptance criteria

### Generate
- Pick type → fields render from the registry with live validation (errors inline, `role=alert`).
- Preview updates **live** on any field/style change (no manual "preview" step).
- An **encoded-size** indicator (`N / 2953 байт`) is always visible and never vanishes/zeroes
  spuriously (derived, not imperative state).
- An **output summary** shows `{exportSize}px · {format} · поля {margin}% · EC {level}`.

### Readability (preflight)
- After each generation the rendered QR is **decoded back** by our own decoder (`lib/decodeQr`,
  shared with the Scanner). Chip: ✅ «Читается» iff it decodes to the exact payload, else
  ⚠️ with the most likely cause (contrast / EC / logo / spacing). Informational, non-blocking.

### Save
- One primary action. Uses `navigator.share` (files) when available, else downloads.
- **On success (both paths) a confirmation toast `✓ QR сохранён` + success haptic.**

### Batch
- CSV/XLSX in → ZIP out; per-row failures isolated and reported (`errors.txt`); stale-job guard.

### Scan
- Camera or image upload → decode via the shared `lib/decodeQr`. Camera lifecycle leak-free.

## 6. Non-functional
- **Readability is a feature**, surfaced (preflight), not assumed.
- **a11y**: inputs `aria-invalid`/`aria-describedby`, errors `role=alert`, controls reachable,
  tap targets ≥ `--tap-target-min`.
- **Performance**: preview debounced; export/batch off the main thread where heavy.
- **Telegram**: respect TMA theme variables; main-button/haptics integration intact.
- **No contradictions**: a lint rule forbids re-introducing dead global preview classes.

## 7. Test matrix (every setting + flow)
- **Unit** (`tests/*.test.mjs`, node:test): `buildQrOptions` maps **each** `StyleOptions`
  field to the correct `qr-code-styling` option (incl. gradient on/off precedence, EC, margin
  px math, spacing, logo size/clamp, format); `validate`/payload encoders per type; `decodeQr`.
- **e2e** (Playwright): each setting **visibly** changes the rendered QR (snapshot/attribute);
  margin=0 ⇒ no quiet zone; save toast appears; readability chip flips ⚠️ on a deliberately
  unreadable config; scan round-trips; batch produces a ZIP.
- **Gate**: `npm test` + `lint` + `build` + `test:e2e` green in CI.
