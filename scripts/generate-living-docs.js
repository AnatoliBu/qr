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
    console.error('❌ Reports directory not found. Run tests first: npm run test:bdd');
    process.exit(1);
  }

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const jsonFile = path.join(REPORTS_DIR, 'cucumber-report.json');

  if (!fs.existsSync(jsonFile)) {
    console.error('❌ Cucumber JSON report not found. Run: npm run test:bdd');
    process.exit(1);
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
