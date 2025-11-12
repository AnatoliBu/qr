#!/usr/bin/env node

/**
 * Check Specification Coverage
 *
 * This script analyzes:
 * 1. How many features have corresponding .feature files
 * 2. How many .feature files have step definitions
 * 3. How many features have user stories
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const FEATURES_DIR = path.join(__dirname, '..', 'specs', 'features');
const STEP_DEFS_DIR = path.join(__dirname, '..', 'specs', 'step_definitions');
const USER_STORIES_DIR = path.join(__dirname, '..', 'docs', 'user_stories');
const SRC_DIR = path.join(__dirname, '..', 'src');

async function main() {
  console.log('📊 Checking Specification Coverage\n');

  // Count feature files
  const featureFiles = await glob('**/*.feature', { cwd: FEATURES_DIR });
  console.log(`✅ Feature files: ${featureFiles.length}`);

  // Count step definitions
  const stepDefFiles = await glob('**/*.{ts,js}', { cwd: STEP_DEFS_DIR });
  console.log(`✅ Step definition files: ${stepDefFiles.length}`);

  // Count user stories
  const userStoryFiles = await glob('*.md', { cwd: USER_STORIES_DIR });
  console.log(`✅ User story files: ${userStoryFiles.length}`);

  // Count source files
  const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', { cwd: SRC_DIR });
  console.log(`📁 Source files: ${sourceFiles.length}`);

  // Calculate coverage
  const specCoverage = (featureFiles.length / Math.max(sourceFiles.length / 10, 1)) * 100;
  console.log(`\n📈 Estimated spec coverage: ${specCoverage.toFixed(1)}%`);

  // Check for missing step definitions
  console.log('\n🔍 Checking for missing step definitions...');
  let missingSteps = false;

  for (const featureFile of featureFiles) {
    const featureName = path.basename(featureFile, '.feature');
    const stepDefFile = stepDefFiles.find(f =>
      f.includes(featureName) || f.includes(featureName.replace(/_/g, '-'))
    );

    if (!stepDefFile) {
      console.log(`⚠️  Missing step definitions for: ${featureFile}`);
      missingSteps = true;
    }
  }

  if (!missingSteps) {
    console.log('✅ All features have step definitions');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');

  if (featureFiles.length === 0) {
    console.log('   - Create .feature files in specs/features/');
  }

  if (featureFiles.length < 3) {
    console.log('   - Document existing features in Gherkin format');
  }

  if (userStoryFiles.length < featureFiles.length) {
    console.log('   - Create user stories for all features');
  }

  if (specCoverage < 50) {
    console.log('   - Target: 50%+ spec coverage');
  } else if (specCoverage < 80) {
    console.log('   - Good progress! Target: 80%+ spec coverage');
  } else {
    console.log('   - Excellent spec coverage! 🎉');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
