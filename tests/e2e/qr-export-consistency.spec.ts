import { expect, test, type Page } from '@playwright/test';
import { getUrlInputLocator, openGeneratorTab, setupGeneratorPage } from './utils/generator';

async function stubBlobCapture(page: Page) {
  await page.addInitScript(() => {
    const originalCreateObjectURL = URL.createObjectURL?.bind(URL);
    const originalRevokeObjectURL = URL.revokeObjectURL?.bind(URL);

    Object.assign(window, {
      __lastDownloadBlob: null as Blob | null
    });

    URL.createObjectURL = ((blob: Blob) => {
      (window as typeof window & { __lastDownloadBlob: Blob | null }).__lastDownloadBlob = blob;
      if (originalCreateObjectURL) {
        return originalCreateObjectURL(blob);
      }
      return `blob:mock-${Math.random().toString(16).slice(2)}`;
    }) as typeof URL.createObjectURL;

    if (originalRevokeObjectURL) {
      URL.revokeObjectURL = ((url: string) => originalRevokeObjectURL(url)) as typeof URL.revokeObjectURL;
    }
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  await setupGeneratorPage(page, testInfo);
});

test.describe('QR export consistency', () => {
  test.use({
    storageState: undefined
  });

  test('exported SVG preserves preview spacing', async ({ page }, testInfo) => {
    const hasWebKitProject = testInfo.config.projects.some((project) => project.name.includes('WebKit'));
    test.skip(
      hasWebKitProject && testInfo.project.name.includes('Android'),
      'Android viewport hydration is flaky under Playwright when WebKit coverage is available.'
    );

    await stubBlobCapture(page);
    await openGeneratorTab(page);

    const qrContainer = page.locator('[class*="qrPreview"]').first();
    await qrContainer.waitFor({ state: 'visible', timeout: 30_000 });

    const urlInput = getUrlInputLocator(page);
    await urlInput.fill('https://example.com/spacing-check');

    await page.getByRole('button', { name: '🎨 Стиль' }).click();

    const spacingSlider = page.locator('label:has-text("↔️ Расстояние между точками") + input[type="range"]');
    await spacingSlider.waitFor({ state: 'visible', timeout: 30_000 });
    await spacingSlider.fill('30');

    await page.getByRole('button', { name: '⚙️ Продвинутые' }).click();

    const exportSizeSlider = page.locator('label:has-text("📏 Размер экспорта (для скачивания)") + input[type="range"]');
    await exportSizeSlider.waitFor({ state: 'visible', timeout: 30_000 });
    await exportSizeSlider.fill('4096');

    const marginSlider = page.locator('label:has-text("🖼️ Отступ (Quiet Zone)") + input[type="range"]');
    await marginSlider.waitFor({ state: 'visible', timeout: 30_000 });
    await marginSlider.fill('0');

    const formatSelect = page.locator('label:has-text("📦 Формат экспорта") + select');
    await formatSelect.waitFor({ state: 'visible', timeout: 30_000 });
    await formatSelect.selectOption('svg');

    await page.evaluate(() => {
      (window as typeof window & { __lastDownloadBlob: Blob | null }).__lastDownloadBlob = null;
    });

    const downloadButton = page.getByRole('button', { name: '⬇️ Скачать QR' });
    await downloadButton.click();

    await expect
      .poll(async () =>
        page.evaluate(() =>
          (window as typeof window & { __lastDownloadBlob: Blob | null }).__lastDownloadBlob?.size ?? 0
        )
      )
      .toBeGreaterThan(0);

    const comparison = await page.evaluate(async () => {
      const globalWindow = window as typeof window & { __lastDownloadBlob: Blob | null };
      const blob = globalWindow.__lastDownloadBlob;
      if (!blob) {
        throw new Error('Download blob was not captured');
      }

      const serializer = new XMLSerializer();
      const previewSvg = document.querySelector('[class*="qrPreview"] svg');
      if (!previewSvg) {
        throw new Error('Preview SVG element not found');
      }

      const previewMarkup = serializer.serializeToString(previewSvg);

      const exportedMarkup = await blob.text();
      const analyzeRectSizes = (markup: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(markup, 'image/svg+xml');
        const rects = Array.from(doc.querySelectorAll('rect'));
        const sizes = rects
          .map((rect) => ({
            width: Number(rect.getAttribute('width')),
            height: Number(rect.getAttribute('height'))
          }))
          .filter((value) => Number.isFinite(value.width) && Number.isFinite(value.height));

        if (!sizes.length) {
          return null;
        }

        const minWidth = sizes.reduce((acc, { width }) => Math.min(acc, width), Infinity);
        const minHeight = sizes.reduce((acc, { height }) => Math.min(acc, height), Infinity);
        const maxWidth = sizes.reduce((acc, { width }) => Math.max(acc, width), 0);
        const maxHeight = sizes.reduce((acc, { height }) => Math.max(acc, height), 0);

        return { minWidth, minHeight, maxWidth, maxHeight };
      };
      return {
        previewRects: analyzeRectSizes(previewMarkup),
        exportRects: analyzeRectSizes(exportedMarkup)
      };
    });

    expect(comparison.previewRects).not.toBeNull();
    expect(comparison.exportRects).not.toBeNull();

    const previewRects = comparison.previewRects!;
    const exportRects = comparison.exportRects!;
    const expectedScale = exportRects.maxWidth / previewRects.maxWidth;
    const minScale = exportRects.minWidth / previewRects.minWidth;
    const heightScale = exportRects.minHeight / previewRects.minHeight;

    expect(Math.abs(minScale - expectedScale) / expectedScale).toBeLessThan(0.02);
    expect(Math.abs(heightScale - expectedScale) / expectedScale).toBeLessThan(0.02);
  });
});
