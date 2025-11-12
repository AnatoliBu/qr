/**
 * Playwright-BDD Configuration
 *
 * This integrates Cucumber/Gherkin with Playwright for BDD testing
 */

import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  paths: ['specs/features/**/*.feature'],
  require: ['specs/step_definitions/**/*.ts'],
  importTestFrom: 'specs/support/fixtures.ts',
});

export default defineConfig({
  testDir,
  outputDir: 'test-results',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'reports/playwright-bdd-report', open: 'never' }],
    ['json', { outputFile: 'reports/playwright-bdd-results.json' }],
    ['junit', { outputFile: 'reports/playwright-bdd-junit.xml' }],
    ['playwright-bdd/reporter/cucumber', { $type: 'json', outputFile: 'reports/cucumber-report.json' }],
    ['list']
  ],

  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'iOS-like WebKit',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Android-like Chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
