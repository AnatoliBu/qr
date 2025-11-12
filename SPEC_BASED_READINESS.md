# Готовность проекта к Spec-Based разработке

**Дата анализа:** 2025-11-12
**Проект:** QR Suite
**Версия:** 0.1.0

---

## Исполнительное резюме

### Текущее состояние: ❌ НЕ ГОТОВ

Проект **не подготовлен** к spec-based разработке с упором на бизнес-требования и пользовательские сценарии. Текущий процесс: **Code-First → Test-After**, требуемый процесс: **Specification → Test → Code**.

### Ключевые проблемы:
- ❌ Отсутствуют бизнес-спецификации
- ❌ Нет пользовательских сценариев (user stories)
- ❌ Тесты написаны в техническом формате, а не BDD
- ❌ Нет процесса согласования требований с бизнесом
- ❌ Документация описывает "что сделано", а не "что нужно"

### Оценка готовности: **2/10**

---

## 📋 ДЕТАЛЬНЫЙ АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ

### 1. Документация бизнес-требований

#### ❌ Отсутствует

**Что есть:**
- `TELEGRAM_MINI_APP.md` - техническое описание адаптации (постфактум)
- `.github/copilot-instructions.md` - инструкции для разработчиков
- `PROJECT_ANALYSIS.md` - конкурентный анализ (технический)

**Чего НЕТ:**
- ❌ Бизнес-требования (Business Requirements Document)
- ❌ Функциональные спецификации (Functional Specifications)
- ❌ User Stories с acceptance criteria
- ❌ Приоритизация features (MoSCoW, RICE)
- ❌ Roadmap с обоснованием бизнес-ценности

**Пример текущей документации:**
```markdown
# TELEGRAM_MINI_APP.md (фрагмент)
### 1. Telegram WebApp Integration
**Files Added:**
- `src/types/telegram.ts` - Shared TypeScript types
```
**Проблема:** Описывает техническую реализацию, а не бизнес-цель и пользовательскую ценность.

**Требуемый формат (spec-based):**
```gherkin
Feature: Telegram Mini App Integration
  As a Telegram user
  I want to use QR generator without leaving messenger
  So that I can quickly create QR codes while chatting

  Background:
    Given I am a Telegram user with the app installed
    And the bot is available in my region

  Scenario: First-time user opens the mini app
    Given I have never used QR Suite before
    When I click the bot link in Telegram
    Then the app should expand to full viewport
    And detect my Telegram theme (light/dark)
    And show a welcome screen with key features
```

---

### 2. Пользовательские сценарии (User Stories)

#### ❌ Отсутствуют

**Что есть:**
- Технические тесты: `tests/e2e/smoke.spec.ts`
- Unit-тесты: `tests/qrTypes.test.mjs`

**Пример текущего теста:**
```typescript
// tests/e2e/smoke.spec.ts
test('generator tab renders key controls', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  const styleTab = page.getByRole('button', { name: '🎨 Стиль' });
  await styleTab.waitFor({ state: 'visible', timeout: 30_000 });
  await styleTab.click();
  // ...
});
```

**Проблема:** Тест проверяет техническую работоспособность, но не привязан к бизнес-сценарию.

**Требуемый формат (BDD):**
```gherkin
# features/qr_generation.feature

Feature: QR Code Generation with Custom Styling
  As a marketing manager
  I want to customize QR code appearance
  So that it matches my brand identity

  Scenario: User changes dot style to rounded
    Given I am on the generator page
    And I have entered URL "https://example.com"
    When I click the "Style" tab
    And I select "Rounded" dot style
    Then the QR preview should update immediately
    And the preview should show rounded corners
    And the QR code should remain scannable

  Scenario: User applies brand colors
    Given I am on the generator page
    And I have entered URL "https://mycompany.com"
    When I set foreground color to "#FF0000"
    And I set background color to "#FFFFFF"
    Then the QR preview should use red for dots
    And the QR preview should use white for background
    And the color contrast should meet accessibility standards
```

---

### 3. Структура тестов

#### ⚠️ Частично готова (технически), но не BDD

**Текущая структура:**
```
tests/
├── qrTypes.test.mjs           # Unit-тесты (Node.js test runner)
├── qrPreview.test.mjs         # Unit-тесты
├── batchGenerator.worker.test.mjs
├── binary.test.mjs
└── e2e/                       # E2E тесты (Playwright)
    ├── smoke.spec.ts
    ├── qr-scannable.spec.ts
    ├── qr-preview-screenshots.spec.ts
    └── initdata.contract.spec.ts
```

**Проблемы:**
1. Тесты не связаны с бизнес-спецификациями
2. Нет Given-When-Then формата
3. Нет .feature файлов (Gherkin)
4. Названия тестов технические, а не пользовательские
5. Нет acceptance criteria в коде

**Требуемая структура:**
```
specs/
├── features/                   # Бизнес-спецификации (Gherkin)
│   ├── qr_generation.feature
│   ├── batch_processing.feature
│   ├── qr_scanning.feature
│   └── telegram_integration.feature
│
├── step_definitions/           # Имплементация шагов (Cucumber/Playwright)
│   ├── qr_generation.steps.ts
│   ├── batch_processing.steps.ts
│   └── common.steps.ts
│
└── support/                    # Вспомогательные утилиты
    ├── hooks.ts
    └── world.ts

tests/
├── unit/                       # Unit-тесты (остаются как есть)
└── integration/                # Интеграционные тесты
```

---

### 4. Процесс разработки

#### ❌ Code-First подход (нужен Spec-First)

**Текущий процесс (обнаружен из git истории):**

```
1. Разработка → 2. Написание тестов → 3. Документация (опционально)
```

**Пример из git log:**
```
8bcf568 Merge pull request #50 from AnatoliBu/test
4c43aab Add Copilot instructions for QR Suite repository
```

**Признаки Code-First:**
- Коммиты типа "Add feature X" без предварительной спецификации
- Тесты коммитятся после кода
- Документация пишется постфактум (TELEGRAM_MINI_APP.md описывает что уже сделано)

**Требуемый процесс (Spec-First):**

```
1. Бизнес-требования → 2. Спецификация (Gherkin) → 3. Тесты (Red) → 4. Код (Green) → 5. Рефакторинг
```

**Пример правильного процесса:**

```bash
# Шаг 1: Создание спецификации
git add specs/features/dynamic_qr.feature
git commit -m "spec: Add business requirements for dynamic QR codes"

# Шаг 2: Написание failing тестов
git add specs/step_definitions/dynamic_qr.steps.ts
git commit -m "test: Add failing tests for dynamic QR generation"

# Запуск тестов → все RED (ожидаемо)
npm run test:bdd

# Шаг 3: Минимальная реализация
git add src/lib/dynamicQr.ts
git commit -m "feat: Implement dynamic QR code generation"

# Запуск тестов → все GREEN
npm run test:bdd

# Шаг 4: Рефакторинг (опционально)
git add src/lib/dynamicQr.ts
git commit -m "refactor: Extract QR redirect logic to separate module"
```

---

### 5. CI/CD и тестирование

#### ⚠️ Технически готово, но не для BDD

**Текущий CI/CD (`.github/workflows/tests.yml`):**
```yaml
jobs:
  unit-tests:
    - name: Run typecheck and unit tests
      run: npm test

  playwright:
    - name: Build Next.js app
      run: npm run build
    - name: Run Playwright tests
      run: npm run test:e2e
```

**Проблема:** CI проверяет техническую корректность, но не бизнес-требования.

**Требуемый CI/CD для spec-based:**
```yaml
jobs:
  # 1. Проверка спецификаций
  spec-validation:
    - name: Validate Gherkin syntax
      run: npm run lint:gherkin
    - name: Check spec coverage
      run: npm run spec:coverage

  # 2. BDD тесты (приоритет!)
  bdd-tests:
    - name: Run Cucumber/Playwright BDD tests
      run: npm run test:bdd
    - name: Generate living documentation
      run: npm run docs:generate

  # 3. Unit тесты (как дополнение)
  unit-tests:
    - name: Run unit tests
      run: npm test

  # 4. Публикация документации
  publish-docs:
    - name: Deploy living documentation to GitHub Pages
      run: npm run docs:deploy
```

---

## 🔍 ЧТО ОТСУТСТВУЕТ ДЛЯ SPEC-BASED ПОДХОДА

### Критически важные компоненты:

| Компонент | Статус | Приоритет |
|-----------|--------|-----------|
| **Бизнес-спецификации (.feature файлы)** | ❌ Нет | P0 - Критично |
| **User Stories с Acceptance Criteria** | ❌ Нет | P0 - Критично |
| **BDD фреймворк (Cucumber/Playwright-BDD)** | ❌ Нет | P0 - Критично |
| **Step Definitions для Gherkin** | ❌ Нет | P0 - Критично |
| **Product Requirements Document** | ❌ Нет | P0 - Критично |
| **Living Documentation генератор** | ❌ Нет | P1 - Важно |
| **Spec coverage метрики** | ❌ Нет | P1 - Важно |
| **Процесс Three Amigos/Specification Workshop** | ❌ Нет | P1 - Важно |
| **Example Mapping сессии** | ❌ Нет | P2 - Желательно |
| **Traceability Matrix (Spec ↔ Test ↔ Code)** | ❌ Нет | P2 - Желательно |

---

## 🚀 ПЛАН ВНЕДРЕНИЯ SPEC-BASED РАЗРАБОТКИ

### Фаза 1: Подготовка инфраструктуры (1-2 недели)

#### 1.1 Установка BDD инструментов

```bash
# Установка Cucumber для TypeScript
npm install --save-dev @cucumber/cucumber @cucumber/pretty-formatter

# Playwright-BDD (интеграция Playwright + Cucumber)
npm install --save-dev playwright-bdd

# Генератор living documentation
npm install --save-dev @cucumber/html-formatter cucumber-html-reporter

# Gherkin linter
npm install --save-dev gherkin-lint
```

#### 1.2 Создание структуры директорий

```bash
mkdir -p specs/features
mkdir -p specs/step_definitions
mkdir -p specs/support
mkdir -p docs/requirements
mkdir -p docs/user_stories
```

#### 1.3 Настройка конфигурации

**cucumber.js:**
```javascript
module.exports = {
  default: {
    require: ['specs/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    publishQuiet: true
  }
};
```

**package.json (добавить скрипты):**
```json
{
  "scripts": {
    "test:bdd": "cucumber-js",
    "test:bdd:watch": "cucumber-js --watch",
    "lint:gherkin": "gherkin-lint specs/features",
    "spec:coverage": "node scripts/check-spec-coverage.js",
    "docs:generate": "node scripts/generate-living-docs.js",
    "docs:serve": "serve docs/living -l 8080"
  }
}
```

---

### Фаза 2: Ретроспективная документация существующего функционала (2-3 недели)

#### 2.1 Документирование текущих features в Gherkin

**Пример: Генерация QR-кодов**

Создать: `specs/features/qr_generation.feature`

```gherkin
Feature: QR Code Generation
  As a user
  I want to generate QR codes with custom content
  So that I can share information via scannable images

  Background:
    Given the QR generator is loaded
    And I am on the "Generator" tab

  Scenario Outline: Generate QR code for different content types
    Given I select QR type "<type>"
    When I enter "<field>" with value "<value>"
    And I click "Download QR" button
    Then a QR code file should be generated
    And the QR code should encode "<expected_payload>"

    Examples:
      | type   | field | value                | expected_payload        |
      | URL    | url   | example.com          | https://example.com     |
      | Phone  | phone | +7 (900) 123-45-67   | tel:+79001234567        |
      | Email  | email | test@example.com     | mailto:test@example.com |
      | Text   | text  | Hello, World!        | Hello, World!           |

  Scenario: Customize QR code appearance
    Given I have entered URL "https://mysite.com"
    When I open the "Style" tab
    And I select "Rounded" dot style
    And I set foreground color to "#FF0000"
    And I enable gradient
    Then the QR preview should show rounded red dots
    And the preview should update in real-time
    And the QR code should remain scannable

  @critical @accessibility
  Scenario: Ensure QR code meets contrast requirements
    Given I have entered URL "https://example.com"
    When I set foreground color to "#FFFF00"
    And I set background color to "#FFFFFF"
    Then a warning should appear about low contrast
    And the system should suggest minimum contrast ratio of 4.5:1
```

#### 2.2 Создание User Stories

**Создать: `docs/user_stories/US-001-qr-generation.md`**

```markdown
# US-001: Generate QR Code with URL

## User Story
As a **marketing manager**
I want to **generate a QR code containing my website URL**
So that **I can print it on promotional materials for customers to scan**

## Business Value
- Increase website traffic from offline materials
- Track campaign effectiveness (if dynamic QR used)
- Reduce friction for customers (no manual typing)

## Acceptance Criteria

### AC1: Basic URL QR Generation
**Given** I am on the QR generator page
**When** I enter "https://mycompany.com/promo" in the URL field
**And** I click "Download QR"
**Then** a PNG file should be downloaded
**And** scanning the QR should open the exact URL

### AC2: URL Normalization
**Given** I enter a URL without schema (e.g., "example.com")
**When** I generate the QR code
**Then** the system should automatically add "https://"
**And** the QR should encode "https://example.com"

### AC3: Invalid URL Validation
**Given** I enter an invalid URL (e.g., "not_a_url")
**When** I attempt to generate QR
**Then** an error message should appear
**And** the error should state "Enter a valid domain"
**And** the download button should be disabled

## Technical Notes
- Implementation: `src/lib/qrTypes.ts` (URL type)
- Test: `specs/step_definitions/qr_generation.steps.ts`
- Related Feature: `specs/features/qr_generation.feature`

## Definition of Done
- [x] Feature file written
- [ ] Step definitions implemented
- [ ] BDD tests pass (Green)
- [ ] Unit tests pass
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
```

---

### Фаза 3: Внедрение процесса для новых фич (ongoing)

#### 3.1 Шаблон для новых фич

**Создать: `docs/templates/FEATURE_TEMPLATE.md`**

```markdown
# Feature: [Feature Name]

## 1. Business Context
**Problem Statement:**
[Describe the business problem or opportunity]

**Business Value:**
[Quantify the expected value: revenue, cost savings, user satisfaction]

**Target Users:**
[Who will benefit from this feature?]

## 2. Requirements

### Functional Requirements
- [ ] FR-1: [Requirement description]
- [ ] FR-2: [Requirement description]

### Non-Functional Requirements
- [ ] NFR-1: Performance (e.g., "QR generation < 500ms")
- [ ] NFR-2: Accessibility (WCAG 2.1 AA)
- [ ] NFR-3: Mobile support (iOS 14+, Android 10+)

## 3. User Stories

### Story 1: [Story Title]
**As a** [user role]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria:**
- AC1: [Given-When-Then]
- AC2: [Given-When-Then]

## 4. Gherkin Specification

```gherkin
Feature: [Feature Name]
  [Business-focused description]

  Scenario: [Happy path]
    Given [context]
    When [action]
    Then [outcome]
```

## 5. Technical Design (Optional)
[High-level architecture, APIs, data models]

## 6. Out of Scope
[What is explicitly NOT included in this feature]

## 7. Success Metrics
- Metric 1: [e.g., "30% increase in QR generations"]
- Metric 2: [e.g., "< 1% error rate"]

## 8. Approval
- [ ] Product Owner: [Name]
- [ ] Tech Lead: [Name]
- [ ] Stakeholders: [Names]
```

#### 3.2 Процесс Three Amigos

**Внедрить регулярные встречи для каждой новой фичи:**

1. **Участники:**
   - Product Owner (бизнес-требования)
   - Developer (техническая реализация)
   - QA Engineer (тестирование и edge cases)

2. **Agenda (45-60 минут):**
   - 0-10 мин: Презентация бизнес-проблемы
   - 10-30 мин: Example Mapping (примеры использования)
   - 30-50 мин: Написание Gherkin сценариев
   - 50-60 мин: Оценка сложности и согласование DoD

3. **Выход:**
   - `.feature` файл с согласованными сценариями
   - User Stories с acceptance criteria
   - Оценка трудозатрат

---

### Фаза 4: Интеграция в CI/CD (1 неделя)

#### 4.1 Обновление GitHub Actions

**Файл: `.github/workflows/bdd-tests.yml`**

```yaml
name: BDD Tests & Living Documentation

on:
  push:
    branches: [main, test, feature/**]
  pull_request:

jobs:
  lint-specs:
    name: Validate Gherkin Specifications
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Lint Gherkin files
        run: npm run lint:gherkin
      - name: Check spec coverage
        run: npm run spec:coverage

  bdd-tests:
    name: Run BDD Tests
    runs-on: ubuntu-22.04
    needs: lint-specs
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run Cucumber BDD Tests
        run: npm run test:bdd
        env:
          APP_URL: http://localhost:3000

      - name: Generate Living Documentation
        if: always()
        run: npm run docs:generate

      - name: Upload BDD Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bdd-report
          path: reports/

      - name: Deploy Living Docs to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/living

  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-22.04
    needs: bdd-tests  # Unit тесты ПОСЛЕ BDD
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
```

#### 4.2 PR Template с проверкой спецификаций

**Файл: `.github/pull_request_template.md`**

```markdown
## Description
[Describe the changes]

## Related Specification
- Feature file: `specs/features/[feature].feature`
- User Story: `docs/user_stories/US-XXX-[story].md`
- Issue: #[issue number]

## Spec-Based Checklist
- [ ] Feature file exists and is up-to-date
- [ ] All scenarios have step definitions
- [ ] BDD tests pass (`npm run test:bdd`)
- [ ] Living documentation generated
- [ ] Acceptance criteria met
- [ ] No new scenarios marked as @skip or @wip

## Testing
- [ ] BDD tests: **[X/Y scenarios passed]**
- [ ] Unit tests: **[Pass/Fail]**
- [ ] Manual testing: **[Done/Not Required]**

## Definition of Done
- [ ] Code reviewed
- [ ] Tests pass in CI
- [ ] Documentation updated
- [ ] No breaking changes (or migration guide provided)
```

---

## 📚 РЕКОМЕНДУЕМЫЕ ИНСТРУМЕНТЫ

### BDD Фреймворки

| Инструмент | Назначение | Ссылка |
|------------|------------|--------|
| **Cucumber** | BDD фреймворк (Gherkin) | https://github.com/cucumber/cucumber-js |
| **Playwright-BDD** | Интеграция Playwright + Cucumber | https://github.com/vitalets/playwright-bdd |
| **Gherkin Lint** | Линтер для .feature файлов | https://github.com/vitalets/gherkin-lint |
| **Cucumber HTML Reporter** | Генерация living documentation | https://github.com/gkushang/cucumber-html-reporter |

### Пример конфигурации

**.gherkin-lintrc:**
```json
{
  "no-trailing-spaces": "error",
  "indentation": ["error", { "Feature": 0, "Scenario": 2, "Step": 4 }],
  "no-dupe-scenario-names": "error",
  "no-empty-file": "error",
  "no-unnamed-features": "error",
  "no-unnamed-scenarios": "error"
}
```

---

## 📊 МЕТРИКИ УСПЕХА ВНЕДРЕНИЯ

### KPI для оценки перехода на spec-based:

| Метрика | Текущее | Целевое (3 мес) | Целевое (6 мес) |
|---------|---------|-----------------|-----------------|
| **Spec Coverage** | 0% | 50% | 80% |
| **Features с BDD тестами** | 0/3 | 2/3 | 3/3 |
| **Дефекты в production** | baseline | -30% | -50% |
| **Время согласования требований** | N/A | 2 часа | 1 час |
| **% фич с документированными User Stories** | 0% | 75% | 100% |
| **Living Documentation актуальность** | 0% | 90% | 100% |

---

## 🎯 КРАТКОСРОЧНЫЕ ДЕЙСТВИЯ (1-2 недели)

### Немедленные шаги для старта:

1. **Создать первую feature file** (2 часа)
   ```bash
   mkdir -p specs/features
   touch specs/features/qr_generation.feature
   # Документировать текущий генератор в Gherkin
   ```

2. **Установить Cucumber** (30 минут)
   ```bash
   npm install --save-dev @cucumber/cucumber playwright-bdd
   ```

3. **Написать первый step definition** (1 час)
   ```bash
   mkdir -p specs/step_definitions
   touch specs/step_definitions/qr_generation.steps.ts
   ```

4. **Запустить первый BDD тест** (30 минут)
   ```bash
   npx cucumber-js specs/features/qr_generation.feature
   ```

5. **Создать шаблон User Story** (30 минут)
   ```bash
   mkdir -p docs/user_stories
   touch docs/user_stories/US-001-template.md
   ```

---

## 📖 ОБУЧАЮЩИЕ МАТЕРИАЛЫ

### Рекомендуемые ресурсы:

1. **BDD и Cucumber:**
   - ["BDD in Action" by John Ferguson Smart](https://www.manning.com/books/bdd-in-action)
   - [Cucumber Documentation](https://cucumber.io/docs/guides/)
   - [Gherkin Best Practices](https://cucumber.io/docs/gherkin/reference/)

2. **Specification by Example:**
   - ["Specification by Example" by Gojko Adzic](https://gojko.net/books/specification-by-example/)
   - [Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/)

3. **Playwright-BDD:**
   - [Playwright-BDD Guide](https://vitalets.github.io/playwright-bdd/)

---

## 🚧 РИСКИ И MITIGATION

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| **Resistance to change** | Высокая | Высокое | Обучение команды, демонстрация ценности |
| **Initial slowdown** | Высокая | Среднее | Ожидаемо в первые 2-4 недели, затем ускорение |
| **Overhead documentation** | Средняя | Среднее | Автоматизация, шаблоны, генераторы |
| **Incomplete specs** | Средняя | Высокое | Code review требует .feature файлы |
| **BDD tests become brittle** | Средняя | Среднее | Использовать Page Object Model |

---

## ✅ ИТОГОВЫЕ ВЫВОДЫ

### Проект НЕ готов к spec-based разработке, но имеет хорошую базу:

**Позитивные факторы:**
- ✅ Отличная техническая база (TypeScript, Playwright, CI/CD)
- ✅ Высокое качество существующих тестов
- ✅ Модульная архитектура упростит внедрение BDD

**Что нужно сделать:**
- 🔨 Внедрить Cucumber/Playwright-BDD
- 📝 Документировать существующий функционал в Gherkin
- 👥 Запустить процесс Three Amigos
- 📊 Настроить living documentation
- 🔄 Изменить процесс: Spec → Test → Code

**Оценка трудозатрат полного внедрения:**
- Фаза 1 (Инфраструктура): 1-2 недели
- Фаза 2 (Ретроспективная документация): 2-3 недели
- Фаза 3 (Процесс для новых фич): ongoing
- Фаза 4 (CI/CD интеграция): 1 неделя

**Итого:** 4-6 недель до полного перехода на spec-based разработку.

---

## 📞 NEXT STEPS

1. **Согласовать подход** с командой и стейкхолдерами
2. **Провести workshop** по BDD и Gherkin (2-3 часа)
3. **Выбрать pilot feature** для первого spec-based цикла
4. **Создать первую feature file** и step definitions
5. **Провести первую Three Amigos сессию**
6. **Измерить результаты** и скорректировать процесс

---

**Подготовил:** Claude (AI Assistant)
**Дата:** 2025-11-12
**Версия документа:** 1.0
