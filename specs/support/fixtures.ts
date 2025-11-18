/**
 * Cucumber World & Fixtures
 *
 * This file defines the custom world object that's available in all step definitions
 */

import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

// Custom World for step definitions
export interface CustomWorld {
  page: Page;
  qrType: string;
  inputValue: string;
  generatedQRData: string | null;
  errorMessage: string | null;
  previewUpdateTime: number;
  downloadedFile: string | null;
}

// Extend Playwright test with custom fixtures
export const test = base.extend<CustomWorld>({
  qrType: ['', { option: true }],
  inputValue: ['', { option: true }],
  generatedQRData: [null, { option: true }],
  errorMessage: [null, { option: true }],
  previewUpdateTime: [0, { option: true }],
  downloadedFile: [null, { option: true }],
});

export { expect } from '@playwright/test';
