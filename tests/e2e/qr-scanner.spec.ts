import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import {
  setupGeneratorPage,
  openGeneratorTab,
  getUrlInputLocator,
  APP_URL
} from './utils/generator';
import {
  openScannerTab,
  uploadFileToScanner,
  getMostRecentResult,
  getAllResults,
  waitForNewResult,
  getErrorMessage
} from './utils/scanner';

/**
 * Helper to decode QR from buffer for validation
 */
function decodeQrFromBuffer(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const data = Uint8ClampedArray.from(png.data);
  const code = jsQR(data, png.width, png.height);
  return code?.data ?? null;
}

/**
 * Helper to generate and download a QR code, returns the file path
 */
async function generateAndDownloadQr(
  page: Page,
  payload: string,
  testInfo: any
): Promise<string> {
  await openGeneratorTab(page);

  const urlInput = getUrlInputLocator(page);
  await urlInput.fill(payload);

  // Wait for the preview to update
  await page.waitForTimeout(500);

  // Get the preview canvas
  const canvas = page.locator('[class*="qrPreview"]').first().locator('canvas, svg').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // Download the QR code as PNG
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: /Скачать QR/ }).click();
  const download = await downloadPromise;

  // Save to temp directory
  const fileName = `qr-test-${Date.now()}.png`;
  const filePath = path.join(testInfo.outputDir, fileName);
  await download.saveAs(filePath);

  // Verify the file was created and is valid
  const buffer = await fs.readFile(filePath);
  expect(buffer.length).toBeGreaterThan(0);

  // Validate that the QR code contains the expected data
  const decoded = decodeQrFromBuffer(buffer);
  expect(decoded).toBe(payload);

  return filePath;
}

test.beforeEach(async ({ page }, testInfo) => {
  await setupGeneratorPage(page, testInfo);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
});

test.describe('QR Scanner - End-to-End Pipeline', () => {
  test.use({
    storageState: undefined
  });

  test('generates QR and successfully scans it back', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/test-pipeline';

    // Step 1: Generate QR code
    const qrFilePath = await generateAndDownloadQr(page, testUrl, testInfo);

    // Step 2: Switch to scanner tab
    await openScannerTab(page);

    // Step 3: Upload the generated QR code
    await uploadFileToScanner(page, qrFilePath);

    // Step 4: Wait for the result
    await waitForNewResult(page, 0, 10_000);

    // Step 5: Verify the scanned result matches the original
    const scannedResult = await getMostRecentResult(page);
    expect(scannedResult).toBe(testUrl);
  });

  test('scans multiple QR codes in sequence', async ({ page }, testInfo) => {
    const testPayloads = [
      'https://telegram.org/test1',
      'https://github.com/test2',
      'https://example.com/test3'
    ];

    // Generate all QR codes
    const qrFiles: string[] = [];
    for (const payload of testPayloads) {
      const filePath = await generateAndDownloadQr(page, payload, testInfo);
      qrFiles.push(filePath);
    }

    // Switch to scanner tab
    await openScannerTab(page);

    // Scan each QR code
    for (let i = 0; i < qrFiles.length; i++) {
      await uploadFileToScanner(page, qrFiles[i]);
      await waitForNewResult(page, i, 10_000);
    }

    // Verify all results (in reverse order since newest is first)
    const allResults = await getAllResults(page);
    expect(allResults.length).toBe(testPayloads.length);

    // Results are in reverse chronological order
    const reversedPayloads = [...testPayloads].reverse();
    for (let i = 0; i < allResults.length; i++) {
      expect(allResults[i]).toBe(reversedPayloads[i]);
    }
  });

  test('scans QR with Cyrillic text', async ({ page }, testInfo) => {
    const cyrillicText = 'Привет, мир! 🌍';

    // Generate QR with Cyrillic text
    await openGeneratorTab(page);
    await page.getByTestId('qr-template-text').click();
    const textInput = page.getByTestId('qr-input-text');
    await textInput.fill(cyrillicText);
    await page.waitForTimeout(500);

    // Download the QR
    const canvas = page.locator('[class*="qrPreview"]').first().locator('canvas, svg').first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Скачать QR/ }).click();
    const download = await downloadPromise;

    const fileName = `qr-cyrillic-${Date.now()}.png`;
    const filePath = path.join(testInfo.outputDir, fileName);
    await download.saveAs(filePath);

    // Switch to scanner and scan
    await openScannerTab(page);
    await uploadFileToScanner(page, filePath);
    await waitForNewResult(page, 0, 10_000);

    // Verify
    const scannedResult = await getMostRecentResult(page);
    expect(scannedResult).toBe(cyrillicText);
  });

  test('scans QR with different dot styles', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/styled-qr';

    // Generate QR with rounded dots style
    await openGeneratorTab(page);
    const urlInput = getUrlInputLocator(page);
    await urlInput.fill(testUrl);

    // Open style tab
    const styleTab = page.getByRole('button', { name: /Стиль/ });
    await styleTab.click();

    // Select rounded style
    const dotStyleSelect = page.locator('label:has-text("Стиль точек") select');
    await dotStyleSelect.selectOption('rounded');
    await page.waitForTimeout(500);

    // Download
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Скачать QR/ }).click();
    const download = await downloadPromise;

    const fileName = `qr-rounded-${Date.now()}.png`;
    const filePath = path.join(testInfo.outputDir, fileName);
    await download.saveAs(filePath);

    // Validate the downloaded QR
    const buffer = await fs.readFile(filePath);
    const decoded = decodeQrFromBuffer(buffer);
    expect(decoded).toBe(testUrl);

    // Scan with scanner
    await openScannerTab(page);
    await uploadFileToScanner(page, filePath);
    await waitForNewResult(page, 0, 10_000);

    const scannedResult = await getMostRecentResult(page);
    expect(scannedResult).toBe(testUrl);
  });

  test('scans QR with gradient enabled', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/gradient-qr';

    // Generate QR with gradient
    await openGeneratorTab(page);
    const urlInput = getUrlInputLocator(page);
    await urlInput.fill(testUrl);

    // Open style tab and enable gradient
    const styleTab = page.getByRole('button', { name: /Стиль/ });
    await styleTab.click();

    const gradientCheckbox = page
      .locator('label:has-text("Использовать градиент")')
      .locator('input[type="checkbox"]')
      .first();
    await gradientCheckbox.check();
    await page.waitForTimeout(500);

    // Download
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Скачать QR/ }).click();
    const download = await downloadPromise;

    const fileName = `qr-gradient-${Date.now()}.png`;
    const filePath = path.join(testInfo.outputDir, fileName);
    await download.saveAs(filePath);

    // Validate
    const buffer = await fs.readFile(filePath);
    const decoded = decodeQrFromBuffer(buffer);
    expect(decoded).toBe(testUrl);

    // Scan
    await openScannerTab(page);
    await uploadFileToScanner(page, filePath);
    await waitForNewResult(page, 0, 10_000);

    const scannedResult = await getMostRecentResult(page);
    expect(scannedResult).toBe(testUrl);
  });

  test('handles invalid image upload gracefully', async ({ page }, testInfo) => {
    await openScannerTab(page);

    // Create a simple invalid image file (not a QR code)
    const invalidImagePath = path.join(testInfo.outputDir, 'invalid.png');

    // Ensure directory exists
    await fs.mkdir(testInfo.outputDir, { recursive: true });

    // Create a simple 10x10 white PNG
    const png = new PNG({ width: 10, height: 10 });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (10 * y + x) * 4;
        png.data[idx] = 255; // R
        png.data[idx + 1] = 255; // G
        png.data[idx + 2] = 255; // B
        png.data[idx + 3] = 255; // A
      }
    }

    const buffer = PNG.sync.write(png);
    await fs.writeFile(invalidImagePath, buffer);

    // Try to scan it
    await uploadFileToScanner(page, invalidImagePath);
    await page.waitForTimeout(2000);

    // Should show error message
    const error = await getErrorMessage(page);
    expect(error).not.toBeNull();
    // Error message from ZXing when no code is detected
    expect(error).toMatch(/код|code|detect/i);

    // No results should appear
    const results = await getAllResults(page);
    expect(results.length).toBe(0);
  });

  test('displays scan results with timestamps', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/timestamp-test';

    // Generate and scan
    const qrFilePath = await generateAndDownloadQr(page, testUrl, testInfo);
    await openScannerTab(page);
    await uploadFileToScanner(page, qrFilePath);
    await waitForNewResult(page, 0, 10_000);

    // Check that timestamp is displayed
    const resultItem = page.locator('.scanner__results ul li').first();
    const timestamp = resultItem.locator('small');
    await expect(timestamp).toBeVisible();

    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{1,2}:\d{2}:\d{2}/); // HH:MM:SS format
  });

  test('displays correct icon for file source', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/icon-test';

    // Generate and scan
    const qrFilePath = await generateAndDownloadQr(page, testUrl, testInfo);
    await openScannerTab(page);
    await uploadFileToScanner(page, qrFilePath);
    await waitForNewResult(page, 0, 10_000);

    // Check that file icon is displayed (🖼️)
    const resultItem = page.locator('.scanner__results ul li').first();
    const icon = resultItem.locator('.pill');
    await expect(icon).toBeVisible();

    const iconText = await icon.textContent();
    expect(iconText).toBe('🖼️'); // File icon
  });

  test('maintains scan history', async ({ page }, testInfo) => {
    // Generate a few QR codes first to speed up the test
    const totalScans = 5;
    const qrFiles: string[] = [];

    for (let i = 0; i < totalScans; i++) {
      const payload = `https://example.com/history-test-${i}`;
      const qrFilePath = await generateAndDownloadQr(page, payload, testInfo);
      qrFiles.push(qrFilePath);
    }

    // Now scan them all
    await openScannerTab(page);

    for (let i = 0; i < totalScans; i++) {
      await uploadFileToScanner(page, qrFiles[i]);
      await waitForNewResult(page, i, 10_000);
    }

    // Verify all results are present
    const allResults = await getAllResults(page);
    expect(allResults.length).toBe(totalScans);

    // Verify the results are in reverse chronological order
    for (let i = 0; i < totalScans; i++) {
      const expectedIndex = totalScans - 1 - i;
      expect(allResults[i]).toBe(`https://example.com/history-test-${expectedIndex}`);
    }
  });
});

test.describe('QR Scanner - Compatibility with Generated QR Styles', () => {
  test.use({
    storageState: undefined
  });

  test('scans QR codes with different eye styles', async ({ page }, testInfo) => {
    const testUrl = 'https://example.com/eye-styles';

    const eyeCombinations = [
      { outer: 'square', inner: 'square', label: 'square-square' },
      { outer: 'extra-rounded', inner: 'square', label: 'rounded-square' },
      { outer: 'extra-rounded', inner: 'dot', label: 'rounded-dot' }
    ];

    for (const combo of eyeCombinations) {
      // Generate QR with specific eye styles
      await openGeneratorTab(page);
      const urlInput = getUrlInputLocator(page);
      await urlInput.fill(testUrl);

      const styleTab = page.getByRole('button', { name: /Стиль/ });
      await styleTab.click();

      const eyeOuterSelect = page.locator('label:has-text("Внешние глазки") select');
      const eyeInnerSelect = page.locator('label:has-text("Внутренние глазки") select');

      await eyeOuterSelect.selectOption(combo.outer);
      await eyeInnerSelect.selectOption(combo.inner);
      await page.waitForTimeout(500);

      // Download
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.getByRole('button', { name: /Скачать QR/ }).click();
      const download = await downloadPromise;

      const fileName = `qr-eyes-${combo.label}-${Date.now()}.png`;
      const filePath = path.join(testInfo.outputDir, fileName);
      await download.saveAs(filePath);

      // Validate
      const buffer = await fs.readFile(filePath);
      const decoded = decodeQrFromBuffer(buffer);
      expect(decoded, `QR with ${combo.label} should be valid`).toBe(testUrl);

      // Scan
      await openScannerTab(page);

      // Get current result count
      const currentResults = await getAllResults(page);
      const previousCount = currentResults.length;

      await uploadFileToScanner(page, filePath);
      await waitForNewResult(page, previousCount, 10_000);

      const scannedResult = await getMostRecentResult(page);
      expect(scannedResult, `QR with ${combo.label} should scan correctly`).toBe(testUrl);
    }
  });
});
