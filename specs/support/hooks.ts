/**
 * Cucumber Hooks
 *
 * Hooks run before/after scenarios or features
 */

import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';

BeforeAll(async function () {
  console.log('🚀 Starting BDD test suite...');
});

AfterAll(async function () {
  console.log('✅ BDD test suite completed');
});

Before(async function ({ pickle }) {
  console.log(`\n📝 Starting scenario: ${pickle.name}`);

  // Initialize world state
  this.qrType = '';
  this.inputValue = '';
  this.generatedQRData = null;
  this.errorMessage = null;
  this.previewUpdateTime = 0;
  this.downloadedFile = null;
});

After(async function ({ pickle, result }) {
  const status = result?.status || Status.UNKNOWN;

  if (status === Status.FAILED) {
    console.log(`❌ Scenario failed: ${pickle.name}`);

    // Take screenshot on failure
    if (this.page) {
      const screenshot = await this.page.screenshot();
      this.attach(screenshot, 'image/png');
    }
  } else if (status === Status.PASSED) {
    console.log(`✅ Scenario passed: ${pickle.name}`);
  }

  // Cleanup
  if (this.page) {
    await this.page.close();
  }
});
