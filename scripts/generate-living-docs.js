#!/usr/bin/env node

/**
 * Generate Living Documentation
 *
 * Generates HTML documentation from Cucumber reports
 */

const fs = require('fs');
const path = require('path');
const reporter = require('cucumber-html-reporter');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'living');

async function main() {
  console.log('📚 Generating Living Documentation...\n');

  // Ensure directories exist
  if (!fs.existsSync(REPORTS_DIR)) {
    console.warn('⚠️  Reports directory not found. Creating empty documentation...');
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  // Look for Cucumber JSON report (from either cucumber-js or playwright-bdd)
  const cucumberJsonFile = path.join(REPORTS_DIR, 'cucumber-report.json');
  const playwrightBddJsonFile = path.join(REPORTS_DIR, 'playwright-bdd-results.json');

  let jsonFile = null;
  if (fs.existsSync(cucumberJsonFile)) {
    jsonFile = cucumberJsonFile;
    console.log('✓ Found Cucumber JSON report');
  } else if (fs.existsSync(playwrightBddJsonFile)) {
    console.warn('⚠️  Found Playwright-BDD report but not Cucumber format.');
    console.warn('   Generating minimal documentation. Configure cucumber-json reporter for full docs.');
    // Create empty cucumber report for minimal documentation
    fs.writeFileSync(cucumberJsonFile, JSON.stringify([]));
    jsonFile = cucumberJsonFile;
  } else {
    console.error('❌ No test reports found. Run tests first:');
    console.error('   - npm run test:playwright-bdd (recommended)');
    console.error('   - npm run test:bdd (cucumber-js)');
    // Create empty report to prevent complete failure
    fs.writeFileSync(cucumberJsonFile, JSON.stringify([]));
    jsonFile = cucumberJsonFile;
  }

  const options = {
    theme: 'bootstrap',
    jsonFile: jsonFile,
    output: path.join(DOCS_DIR, 'index.html'),
    reportSuiteAsScenarios: true,
    scenarioTimestamp: true,
    launchReport: false,
    metadata: {
      'App Name': 'QR Suite',
      'App Version': require('../package.json').version,
      'Test Environment': process.env.NODE_ENV || 'development',
      'Platform': process.platform,
      'Generated': new Date().toLocaleString(),
    },
    brandTitle: 'QR Suite - Living Documentation',
    name: 'QR Suite Specifications',
  };

  try {
    reporter.generate(options);
    console.log(`✅ Living documentation generated: ${options.output}`);
    console.log(`\n🌐 View locally: npm run docs:serve`);
  } catch (err) {
    console.error('❌ Failed to generate documentation:', err);
    process.exit(1);
  }
}

main();
