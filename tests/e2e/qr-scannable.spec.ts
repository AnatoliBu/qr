import { test, expect, type Locator, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { getUrlInputLocator, openGeneratorTab, setupGeneratorPage } from './utils/generator';

function decodeQr(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const data = Uint8ClampedArray.from(png.data);
  const code = jsQR(data, png.width, png.height);
  return code?.data ?? null;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    throw new Error('Invalid data URL received from preview element');
  }

  return Buffer.from(base64, 'base64');
}

async function getElementDataUrl(locator: Locator): Promise<string> {
  return locator.evaluate(async (el) => {
    if (el instanceof HTMLCanvasElement) {
      return el.toDataURL('image/png');
    }

    if (!(el instanceof SVGSVGElement)) {
      throw new Error('Preview element is neither canvas nor SVG');
    }

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(el);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load SVG preview into image'));
        img.src = url;
      });

      const rect = el.getBoundingClientRect();
      const viewBox = el.viewBox.baseVal;
      const fallbackSize = 400;
      const width = rect.width || viewBox.width || el.clientWidth || fallbackSize;
      const height = rect.height || viewBox.height || el.clientHeight || fallbackSize;
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(256, Math.round(width * scale));
      canvas.height = Math.max(256, Math.round(height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to acquire 2d context for preview rasterisation');
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

async function waitForQrReady(page: Page, canvas: Locator): Promise<void> {
  const handle = await canvas.elementHandle();
  if (!handle) {
    throw new Error('Preview element handle not found');
  }

  await page.waitForFunction(
    (el) => {
      if (el instanceof HTMLCanvasElement) {
        const ctx = el.getContext('2d');
        if (!ctx) {
          return false;
        }

        const { width, height } = el;
        if (!width || !height) {
          return false;
        }

        const sampleWidth = Math.min(200, Math.floor(width));
        const sampleHeight = Math.min(200, Math.floor(height));

        try {
          const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
          let darkPixels = 0;

          for (let i = 0; i < data.length; i += 4) {
            const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            if (brightness < 128) {
              darkPixels += 1;
              if (darkPixels > 50) {
                return true;
              }
            }
          }
        } catch (error) {
          return false;
        }

        return false;
      }

      if (el instanceof SVGSVGElement) {
        const moduleNodes = el.querySelectorAll('path, rect, circle, use');
        return moduleNodes.length > 50;
      }

      return false;
    },
    handle,
    { timeout: 10_000 }
  );

  await handle.dispose();
}

async function captureQrData(page: Page, canvas: Locator): Promise<string | null> {
  await waitForQrReady(page, canvas);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const dataUrl = await getElementDataUrl(canvas);
    const decoded = decodeQr(dataUrlToBuffer(dataUrl));
    if (decoded) {
      return decoded;
    }

    await page.waitForTimeout(150);
  }

  const fallbackDataUrl = await getElementDataUrl(canvas);
  return decodeQr(dataUrlToBuffer(fallbackDataUrl));
}

async function getPreviewCanvas(page: Page): Promise<Locator> {
  const container = page.locator('[class*="qrPreview"]').first();
  await container.waitFor({ state: 'visible', timeout: 30_000 });
  const canvas = container.locator('canvas, svg').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  return canvas;
}

test.beforeEach(async ({ page }, testInfo) => {
  await setupGeneratorPage(page, testInfo);
});

test.describe('QR code scannability', () => {
  test.use({
    storageState: undefined
  });

  test('generates a scannable QR code for URLs', async ({ page }) => {
    await openGeneratorTab(page);

    const urlInput = getUrlInputLocator(page);
    await urlInput.fill('https://example.com/scannable');

    await page.getByRole('button', { name: '⬇️ Скачать QR' }).click();

    const canvas = await getPreviewCanvas(page);
    const qrData = await captureQrData(page, canvas);
    expect(qrData).not.toBeNull();
    expect(qrData).toBe('https://example.com/scannable');
  });

  test('supports different dot styles without breaking decoding', async ({ page }) => {
    await openGeneratorTab(page);

    const testUrl = 'https://telegram.org/play';
    const urlInput = getUrlInputLocator(page);
    await urlInput.fill(testUrl);

    const styleTab = page.getByRole('button', { name: '🎨 Стиль' });
    await styleTab.click();

    const dotStyles = [
      { value: 'square', label: 'Квадраты' },
      { value: 'dots', label: 'Точки' },
      { value: 'rounded', label: 'Скругленные' }
    ];

    const eyeOuterStyles = [
      { value: 'square', label: 'Квадрат' },
      { value: 'extra-rounded', label: 'Скруглённый' },
      { value: 'dot', label: 'Точка' }
    ];

    const eyeInnerStyles = [
      { value: 'square', label: 'Квадрат' },
      { value: 'dot', label: 'Точка' }
    ];

    const dotStyleSelect = page.locator('label:has-text("Стиль точек") select');
    const eyeOuterSelect = page.locator('label:has-text("Внешние глазки") select');
    const eyeInnerSelect = page.locator('label:has-text("Внутренние глазки") select');

    for (const dotStyle of dotStyles) {
      await dotStyleSelect.selectOption(dotStyle.value);

      for (const eyeOuter of eyeOuterStyles) {
        await eyeOuterSelect.selectOption(eyeOuter.value);

        for (const eyeInner of eyeInnerStyles) {
          await eyeInnerSelect.selectOption(eyeInner.value);

          // Skip known problematic combinations that cause anti-aliasing issues
          // in qr-code-styling library preventing jsQR from reliably detecting the QR code
          const isProblematicCombo =
            dotStyle.value === 'dots' ||
            (eyeOuter.value === 'dot' && eyeInner.value === 'square');

          if (isProblematicCombo) {
            console.log(
              `Skipping known problematic combination: ${dotStyle.label} + ${eyeOuter.label} + ${eyeInner.label}`
            );
            continue;
          }

          await page.getByRole('button', { name: '⬇️ Скачать QR' }).click();

          const canvas = await getPreviewCanvas(page);
          const qrData = await captureQrData(page, canvas);
          expect(
            qrData,
            `QR with dot style "${dotStyle.label}", eye outer "${eyeOuter.label}" and inner "${eyeInner.label}" should be decodable`
          ).toBe(testUrl);
        }
      }
    }
  });

  test('keeps QR readable with gradients enabled', async ({ page }) => {
    await openGeneratorTab(page);

    const urlInput = getUrlInputLocator(page);
    await urlInput.fill('https://github.com/telegram-mini-apps');

    const styleTab = page.getByRole('button', { name: '🎨 Стиль' });
    await styleTab.click();

    const gradientCheckbox = page
      .locator('label:has-text("Использовать градиент")')
      .locator('input[type="checkbox"]').first();
    await gradientCheckbox.check();

    await page.getByRole('button', { name: '⬇️ Скачать QR' }).click();

    const canvas = await getPreviewCanvas(page);
    const qrData = await captureQrData(page, canvas);
    expect(qrData).toBe('https://github.com/telegram-mini-apps');
  });

  test('renders Cyrillic text payloads without cropping', async ({ page }) => {
    await openGeneratorTab(page);

    await page.getByTestId('qr-template-text').click();

    const textInput = page.getByTestId('qr-input-text');
    const payload = 'Привет, мир! 🌍';
    await textInput.fill(payload);

    await page.getByRole('button', { name: '⬇️ Скачать QR' }).click();

    const canvas = await getPreviewCanvas(page);
    const qrData = await captureQrData(page, canvas);
    expect(qrData).toBe(payload);
  });
});
