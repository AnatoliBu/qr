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

/**
 * Decode the CURRENT preview QR at an export-representative resolution.
 *
 * The on-screen preview is a small (~280px) thumbnail; jsQR needs enough pixels
 * to bridge the gaps between separated modules (e.g. the "dots" style), which a
 * thumbnail can't provide but the real 1024px export does. We rasterize the live
 * preview SVG onto a white 640px canvas in-page and decode that — a faithful,
 * size-independent check of whether the rendered QR is actually scannable.
 */
async function decodeCurrentPreview(page: Page, size = 640): Promise<string | null> {
  const dataUrl = await page.evaluate(async (sz) => {
    const svg = document.querySelector('[class*="qrPreview"] svg');
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = sz;
    canvas.height = sz;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sz, sz);
    ctx.drawImage(img, 0, 0, sz, sz);
    return canvas.toDataURL('image/png');
  }, size);
  if (!dataUrl) return null;
  return decodeQr(Buffer.from(dataUrl.split(',')[1], 'base64'));
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
    await page.waitForTimeout(500);

    const canvas = await getPreviewCanvas(page);
    const qrData = decodeQr(await canvas.screenshot());
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

    const styleLabels = ['Квадраты', 'Точки', 'Скругленные'];

    for (const label of styleLabels) {
      const styleOption = page.locator('[class*="styleOption"]', { hasText: label }).first();
      await expect(styleOption, `Style option "${label}" should be visible`).toBeVisible({ timeout: 30_000 });
      await styleOption.click();

      await page.waitForTimeout(500);

      const qrData = await decodeCurrentPreview(page);
      expect(qrData, `QR with dot style "${label}" should be decodable`).toBe(testUrl);
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
    await page.waitForTimeout(500);

    const canvas = await getPreviewCanvas(page);
    const qrData = decodeQr(await canvas.screenshot());
    expect(qrData).toBe('https://github.com/telegram-mini-apps');
  });

  test('renders Cyrillic text payloads without cropping', async ({ page }) => {
    await openGeneratorTab(page);

    await page.getByTestId('qr-template-text').click();

    const textInput = page.getByTestId('qr-input-text');
    const payload = 'Привет, мир! 🌍';
    await textInput.fill(payload);

    await page.getByRole('button', { name: '⬇️ Скачать QR' }).click();
    await page.waitForTimeout(500);

    const canvas = await getPreviewCanvas(page);
    const qrData = decodeQr(await canvas.screenshot());
    expect(qrData).toBe(payload);
  });
});
