# QR Suite

> A fast, mobile-first **QR code generator** — Next.js web app that also runs as a
> **Telegram Mini App**. Single & batch generation, live preview, customization.

[![tests](https://github.com/AnatoliBu/qr/actions/workflows/tests.yml/badge.svg)](https://github.com/AnatoliBu/qr/actions/workflows/tests.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

## Features

- ⚡ Instant QR generation with live preview
- 📦 **Batch generation** off the main thread (web worker) — many codes at once
- 🎨 Customizable output (size, error-correction, colors)
- 📱 **Telegram Mini App** mode — native theme + WebApp API integration
  (see [TELEGRAM_MINI_APP.md](TELEGRAM_MINI_APP.md))
- ✅ End-to-end tested (Playwright + Appium/BrowserStack for mobile)

## Stack

Next.js 16 (app router) · React 19 · TypeScript · `qrcode` · `@twa-dev/sdk` · Playwright.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # type-check
npm run lint
npm run test:e2e     # end-to-end tests
```

## Telegram Mini App

QR Suite runs as a Telegram Mini App with Telegram WebApp API, theme sync, and a
mobile-first layout. Setup and adaptation notes are in
[TELEGRAM_MINI_APP.md](TELEGRAM_MINI_APP.md).

## License

[MIT](LICENSE).
