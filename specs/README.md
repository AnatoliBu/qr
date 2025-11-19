# BDD Specifications

This directory contains Behavior-Driven Development (BDD) specifications using Gherkin syntax.

## 📁 Structure

```
specs/
├── features/                 # Gherkin feature files
│   ├── qr_generation.feature
│   ├── batch_processing.feature
│   └── qr_scanning.feature
│
├── step_definitions/         # Step implementations
│   ├── qr_generation.steps.ts
│   ├── batch_processing.steps.ts
│   └── common.steps.ts
│
└── support/                  # Test infrastructure
    ├── fixtures.ts           # Custom fixtures
    ├── hooks.ts              # Before/After hooks
    └── helpers.ts            # Common utilities
```

## 🚀 Running BDD Tests

### All tests
```bash
npm run test:bdd
```

### Smoke tests only
```bash
npm run test:bdd:smoke
```

### Critical tests only
```bash
npm run test:bdd:critical
```

### Watch mode (for development)
```bash
npm run test:bdd:watch
```

### Dry run (check for undefined steps)
```bash
npm run test:bdd:dry
```

## 📝 Writing Specifications

### 1. Create a Feature File

Create a new `.feature` file in `specs/features/`:

```gherkin
# language: ru
@priority-p0 @feature-name
Функция: [Feature Name]
  [Business-focused description]

  Предыстория:
    Дано [common preconditions]

  @smoke @happy-path
  Сценарий: [Main scenario]
    Дано [initial state]
    Когда [user action]
    Тогда [expected result]
    И [additional verification]
```

### 2. Implement Step Definitions

Create corresponding steps in `specs/step_definitions/`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('я нахожусь на странице генератора', async function() {
  await this.page.goto('/');
});

When('я ввожу {string} в поле URL', async function(url: string) {
  await this.page.locator('input[name="url"]').fill(url);
});

Then('QR-код должен быть сгенерирован', async function() {
  const canvas = this.page.locator('[class*="qrPreview"] canvas');
  await expect(canvas).toBeVisible();
});
```

### 3. Validate Gherkin Syntax

```bash
npm run lint:gherkin
```

## 🏷️ Gherkin Tags

Use tags to organize and filter scenarios:

### Priority Tags
- `@p0`, `@p1`, `@p2`, `@p3` - Priority levels
- `@critical` - Must-pass scenarios
- `@smoke` - Quick smoke tests

### Type Tags
- `@happy-path` - Main user flows
- `@negative` - Error handling
- `@edge-case` - Boundary conditions
- `@validation` - Input validation

### Feature Tags
- `@qr-generation` - QR generation features
- `@batch-processing` - Batch operations
- `@styling` - Customization features
- `@performance` - Performance tests

### Status Tags
- `@wip` - Work in progress
- `@skip` - Temporarily disabled

## 📊 Spec Coverage

Check specification coverage:

```bash
npm run spec:coverage
```

This shows:
- Number of feature files
- Number of step definitions
- Number of user stories
- Estimated coverage percentage

## 📚 Living Documentation

Generate HTML documentation from specs:

```bash
npm run docs:generate
```

View locally:

```bash
npm run docs:serve
# Open http://localhost:8080
```

## 🔧 Helpers & Utilities

### Common Helpers (`specs/support/helpers.ts`)

```typescript
import { getQRPreviewCanvas, decodeQR, waitForElement } from './helpers';

// Get QR preview
const canvas = await getQRPreviewCanvas(page);

// Decode QR code
const data = decodeQR(screenshotBuffer);

// Wait for element
const element = await waitForElement(page, '.qr-preview');
```

### Fixtures (`specs/support/fixtures.ts`)

Custom world object available in all steps:

```typescript
this.page          // Playwright page object
this.qrType        // Selected QR type
this.inputValue    // User input value
this.generatedQRData // Decoded QR data
```

## 🐛 Debugging

### View step definitions
```bash
npm run test:bdd:dry
```

### Run specific feature
```bash
npx cucumber-js specs/features/qr_generation.feature
```

### Run specific scenario (by line number)
```bash
npx cucumber-js specs/features/qr_generation.feature:15
```

### Run with tags
```bash
npx cucumber-js --tags "@smoke and not @skip"
```

## 📖 Best Practices

### 1. Write from User Perspective
```gherkin
✅ Good:
Дано я ввожу "https://example.com" в поле URL
Тогда QR-код должен быть сканируемым

❌ Bad:
Дано QRGenerator.setUrl("https://example.com")
Тогда canvas.isVisible() === true
```

### 2. Use Background for Common Steps
```gherkin
Предыстория:
  Дано приложение загружено
  И я нахожусь на вкладке "Генератор"

Сценарий: ...
  # No need to repeat common steps
```

### 3. Use Scenario Outlines for Data-Driven Tests
```gherkin
Структура сценария: Генерация различных типов QR
  Когда я выбираю тип "<тип>"
  И я ввожу "<значение>"
  Тогда QR содержит "<результат>"

  Примеры:
    | тип  | значение         | результат               |
    | URL  | example.com      | https://example.com     |
    | Email| test@example.com | mailto:test@example.com |
```

### 4. Keep Steps Reusable
```typescript
// ✅ Good: Generic, reusable
When('я нажимаю кнопку {string}', async function(buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).click();
});

// ❌ Bad: Too specific
When('я нажимаю кнопку скачать QR', async function() {
  await this.page.locator('#download-qr-btn').click();
});
```

## 🔗 Related Documentation

- [AGENT.md](../AGENT.md) - Development principles for AI agents
- [SPEC_BASED_READINESS.md](../SPEC_BASED_READINESS.md) - Spec-based development guide
- [User Stories](../docs/user_stories/) - Business requirements
- [Feature Template](../docs/templates/FEATURE_TEMPLATE.md) - Template for new features

## 📞 Support

For questions about BDD testing:
1. Read [Cucumber Documentation](https://cucumber.io/docs/)
2. Check [Playwright-BDD Guide](https://vitalets.github.io/playwright-bdd/)
3. Review existing feature files for examples
4. Consult the team

---

**Remember:** Specifications are living documents. Keep them updated as features evolve!
