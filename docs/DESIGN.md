# QR Suite — Design System

> The canonical source of truth for **how** the tool looks and is structured. Aesthetic:
> **clean tool** — minimal, dense, neutral, respects the Telegram theme. No marketing hero,
> no decorative gradients/shimmer, restrained emoji.

## 1. Single source of truth (anti-contradiction rule)

The #1 cause of past bugs was **two CSS systems fighting** (global `page.css` vs CSS
modules) with `!important` and duplicate class names. Canon:

- **One owner per concern.** Component styling lives in that component's **CSS module**.
  `globals`/`page.css` holds ONLY: CSS variables (tokens), `:root`/theme wiring, and truly
  global resets. No component-specific selectors (`.preview*`, `.qrCanvas*`, etc.) in globals.
- **No dual class names.** An element gets module classes only — never `classNames(styles.x, "legacyGlobal")`.
- **No `!important`** except documented, isolated crop-prevention on the injected QR canvas/svg.
- A **lint/check** forbids re-introducing removed global preview classes (`preview`, `preview__canvas`, `preview__actions`).

## 2. Tokens

Define once (in globals, layered over Telegram theme vars) and consume everywhere — no
hardcoded hex/magic numbers in components.

- **Color roles** (map to TMA theme vars with fallbacks): `--bg`, `--surface`, `--surface-2`,
  `--text`, `--hint`, `--accent`, `--border`, `--ok`, `--warn`, `--danger`.
- **Spacing scale**: `--space-1..6` (4 8 12 16 24 32). No raw `clamp()` magic in components.
- **Type scale**: `--text-xs/sm/md/lg` + weights; tabular-nums for numbers.
- **Radius**: `--radius-sm/md/lg`. **Motion**: `--ease`, short durations; respect `prefers-reduced-motion`.
- **Tap target**: `--tap-target-min` (≥44px).

Brand accent stays a single token (not scattered `#667eea`); gradients are a **user
setting** (QR styling), not chrome decoration.

## 3. Layout — "essentials + collapsible"

```
┌ mode switch (Генератор · Пакет · Сканер)  — compact, one line, role=tablist
├ ░ PREVIEW (sticky, compact card)
│    QR fills the card (margin% = only white border)
│    readability chip · output summary
├ ESSENTIALS (always visible)
│    type picker · type fields · core look (fg/bg, dot style)
├ ▸ Продвинутые / Вывод (collapsible)
│    eyes, shape, spacing, gradients×3, logo (+EC hint), EC, export size/format, margin%
└ primary action: ⬇️ Скачать QR   (fixed bottom; no redundant Превью)
```

- **Preview is sticky** (`position: sticky`) so it stays visible while editing.
- Internal Контент/Стиль/Продвинутые tabs may remain as the grouping mechanism, but the
  **essentials of the active type are always reachable** and the preview is always visible.

## 4. Component inventory (each = one module, tokenized, with states)
`ModeSwitch`, `PreviewCard` (QR frame + chip + summary), `TypePicker`, `Field` (label +
input + error, a11y wired), `ColorControl`, `GradientControl`, `LogoControl`, `RangeControl`
(slider + stepper), `Toggle`, `Collapsible`, `Toast`, `PrimaryAction`, `StatusChip`.

States every interactive surface must define: default · hover · active · focus-visible ·
disabled. App states: **loading** (generating/exporting), **empty** (no input), **error**
(invalid field), **success** (saved toast), **warn** (unreadable chip).

## 5. Quality gates
- Visual: verified in-browser via Playwright at mobile viewport (light + dark TMA theme).
- No off-token values in components (review); no global component selectors (lint).
- All states reachable and styled; contrast ≥ 4.5 for text.
- CI green: `npm test` + `lint` + `build` + `test:e2e`.

## 6. Out of scope (this pass)
New features/QR types beyond the current registry (scope = consolidate + harden existing).
