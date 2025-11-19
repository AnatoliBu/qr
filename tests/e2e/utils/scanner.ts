import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Opens the scanner tab and waits for it to be ready
 */
export async function openScannerTab(page: Page): Promise<void> {
  const scannerTab = page.getByRole('button', { name: /Сканер/ });
  await scannerTab.waitFor({ state: 'visible', timeout: 30_000 });
  await scannerTab.click();

  // Wait for scanner section to be visible
  const scannerSection = page.locator('section.card:has(h2:text("Клиентский сканер"))');
  await expect(scannerSection).toBeVisible({ timeout: 30_000 });
}

/**
 * Gets the upload button locator for the scanner
 */
export function getUploadButtonLocator(page: Page): Locator {
  return page.locator('label.upload input[type="file"]');
}

/**
 * Gets the scanner results list locator
 */
export function getResultsListLocator(page: Page): Locator {
  return page.locator('.scanner__results ul');
}

/**
 * Gets the most recent scan result
 */
export async function getMostRecentResult(page: Page): Promise<string | null> {
  const resultsList = getResultsListLocator(page);

  try {
    await resultsList.waitFor({ state: 'visible', timeout: 10_000 });
    const firstResult = resultsList.locator('li').first();
    const codeElement = firstResult.locator('code');
    await codeElement.waitFor({ state: 'visible', timeout: 5_000 });
    return await codeElement.textContent();
  } catch {
    return null;
  }
}

/**
 * Gets all scan results
 */
export async function getAllResults(page: Page): Promise<string[]> {
  const resultsList = getResultsListLocator(page);

  try {
    await resultsList.waitFor({ state: 'visible', timeout: 10_000 });
    const results = await resultsList.locator('li code').allTextContents();
    return results;
  } catch {
    return [];
  }
}

/**
 * Uploads a file to the scanner
 */
export async function uploadFileToScanner(page: Page, filePath: string): Promise<void> {
  const fileInput = getUploadButtonLocator(page);
  await fileInput.setInputFiles(filePath);
}

/**
 * Waits for a new scan result to appear
 */
export async function waitForNewResult(
  page: Page,
  previousResultCount: number = 0,
  timeout: number = 10_000
): Promise<void> {
  const resultsList = getResultsListLocator(page);

  await page.waitForFunction(
    (prevCount: number) => {
      const list = document.querySelector('.scanner__results ul');
      if (!list) return false;
      const items = list.querySelectorAll('li');
      return items.length > prevCount;
    },
    previousResultCount,
    { timeout }
  );
}

/**
 * Gets the error message if any
 */
export async function getErrorMessage(page: Page): Promise<string | null> {
  const errorText = page.locator('.scanner__viewport .error-text');

  try {
    await errorText.waitFor({ state: 'visible', timeout: 2_000 });
    return await errorText.textContent();
  } catch {
    return null;
  }
}

/**
 * Checks if the scanner is in active (camera) mode
 */
export async function isScannerActive(page: Page): Promise<boolean> {
  const video = page.locator('.scanner__viewport video');
  const isActive = await video.evaluate((el) => el.classList.contains('active'));
  return isActive;
}

/**
 * Clicks the start camera button
 */
export async function startCamera(page: Page): Promise<void> {
  const startButton = page.getByRole('button', { name: /Включить камеру/ });
  await startButton.click();
}

/**
 * Clicks the stop camera button
 */
export async function stopCamera(page: Page): Promise<void> {
  const stopButton = page.getByRole('button', { name: /Остановить/ });
  await stopButton.click();
}
