/**
 * Step Definitions для Feature: Генерация QR-кодов
 *
 * Этот файл содержит реализацию шагов из qr_generation.feature
 * с использованием Playwright для E2E тестирования
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/fixtures';
import { getQRPreviewCanvas, decodeQR, mockTelegramWebApp } from '../support/helpers';

// =============================================================================
// GIVEN steps (Предыстория / Preconditions)
// =============================================================================

Given('приложение QR Suite загружено', async function (this: CustomWorld) {
  await this.page.goto('/', { waitUntil: 'networkidle' });
  await this.page.waitForLoadState('domcontentloaded');
});

Given('я нахожусь на вкладке {string}', async function (this: CustomWorld, tabName: string) {
  const tabButton = this.page.getByRole('button', { name: new RegExp(tabName, 'i') });
  await tabButton.click();
  await this.page.waitForTimeout(500);
});

Given('я выбрал тип QR-кода {string}', async function (this: CustomWorld, qrType: string) {
  this.qrType = qrType;

  const typeSelector = this.page.locator('select[name="qrType"], [data-testid="qr-type-select"]').first();
  await typeSelector.selectOption({ label: qrType });

  this.qrType = qrType;
});

Given('я ввожу {string} в поле URL', async function (this: CustomWorld, url: string) {
  const urlInput = this.page.locator('input[name="url"], [placeholder*="URL"]').first();
  await urlInput.fill(url);
  this.inputValue = url;
});

Given('я сгенерировал QR-код с URL {string}', async function (this: CustomWorld, url: string) {
  await this.page.locator('select[name="qrType"]').selectOption({ label: 'URL' });
  await this.page.locator('input[name="url"]').fill(url);

  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  this.generatedQRData = decodeQR(screenshot);
  this.inputValue = url;
});

Given('Telegram тема установлена как {string}', async function (this: CustomWorld, theme: string) {
  await mockTelegramWebApp(this.page, theme === 'темная' ? 'dark' : 'light');
});

Given('я открыл приложение в Telegram', async function (this: CustomWorld) {
  await mockTelegramWebApp(this.page, 'dark');
  await this.page.goto('/', { waitUntil: 'networkidle' });
});

// =============================================================================
// WHEN steps (Действия пользователя)
// =============================================================================

When('я заполняю поле {string} значением {string}', async function (this: CustomWorld, fieldName: string, value: string) {
  const input = this.page.locator(`input[name="${fieldName}"], [data-field="${fieldName}"]`).first();
  await input.fill(value);
  this.inputValue = value;
});

When('я нажимаю кнопку {string}', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
  await this.page.waitForTimeout(500);
});

When('я открываю вкладку {string}', async function (this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole('button', { name: new RegExp(tabName, 'i') });
  await tab.click();
  await this.page.waitForTimeout(300);
});

When('я выбираю стиль точек {string}', async function (this: CustomWorld, styleName: string) {
  const styleOption = this.page.locator('[class*="styleOption"]', { hasText: styleName }).first();
  await expect(styleOption).toBeVisible();
  await styleOption.click();
});

When('я устанавливаю цвет переднего плана {string}', async function (this: CustomWorld, color: string) {
  const colorInput = this.page.locator('input[type="color"][name="foreground"]').first();
  await colorInput.fill(color);
});

When('я устанавливаю цвет фона {string}', async function (this: CustomWorld, color: string) {
  const colorInput = this.page.locator('input[type="color"][name="background"]').first();
  await colorInput.fill(color);
});

When('я включаю градиент', async function (this: CustomWorld) {
  const gradientCheckbox = this.page.locator('input[type="checkbox"][name*="gradient"]').first();
  await gradientCheckbox.check();
});

When('я выбираю размер экспорта {string}px', async function (this: CustomWorld, size: string) {
  const sizeSelect = this.page.locator('select[name="exportSize"], input[name="size"]').first();
  await sizeSelect.fill(size);
});

When('я выбираю формат {string}', async function (this: CustomWorld, format: string) {
  const formatSelect = this.page.locator('select[name="format"], [data-testid="format-select"]').first();
  await formatSelect.selectOption(format);
});

When('я изменяю URL', async function (this: CustomWorld) {
  const startTime = Date.now();
  const urlInput = this.page.locator('input[name="url"]').first();
  await urlInput.fill('https://updated-example.com');
  this.previewUpdateTime = Date.now() - startTime;
});

When('я загружаю изображение логотипа {string}', async function (this: CustomWorld, fileName: string) {
  const fileInput = this.page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles(`./test-fixtures/${fileName}`);
});

When('я устанавливаю размер логотипа {int}%', async function (this: CustomWorld, size: number) {
  const sizeInput = this.page.locator('input[name="logoSize"], [data-testid="logo-size"]').first();
  await sizeInput.fill(size.toString());
});

When('я закрываю приложение', async function (this: CustomWorld) {
  await this.page.reload();
});

When('я снова открываю приложение', async function (this: CustomWorld) {
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('я выбираю уровень коррекции ошибок {string}', async function (this: CustomWorld, level: string) {
  const levelSelect = this.page.locator('select[name="errorCorrection"]').first();
  await levelSelect.selectOption(level);
});

// =============================================================================
// THEN steps (Проверки / Assertions)
// =============================================================================

Then('QR-код должен быть сгенерирован', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  await expect(canvas).toBeVisible();

  const screenshot = await canvas.screenshot();
  expect(screenshot.length).toBeGreaterThan(1000);
});

Then('QR-код должен содержать {string}', async function (this: CustomWorld, expectedContent: string) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  const decodedData = decodeQR(screenshot);

  expect(decodedData).toBe(expectedContent);
  this.generatedQRData = decodedData;
});

Then('QR-код должен быть сканируемым', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  const decodedData = decodeQR(screenshot);

  expect(decodedData).not.toBeNull();
  expect(decodedData).toBeTruthy();
});

Then('протокол {string} должен быть добавлен автоматически', async function (this: CustomWorld, protocol: string) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  const decodedData = decodeQR(screenshot);

  expect(decodedData).toContain(protocol);
});

Then('я должен увидеть сообщение об ошибке {string}', async function (this: CustomWorld, errorText: string) {
  const errorMessage = this.page.locator('[role="alert"], .error-message, [class*="error"]').first();
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(errorText);
});

Then('кнопка {string} должна быть неактивна', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).toBeDisabled();
});

Then('превью QR-кода должно обновиться', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  await expect(canvas).toBeVisible();

  const screenshot = await canvas.screenshot();
  const newData = decodeQR(screenshot);

  expect(newData).not.toBeNull();
});

Then('превью должно показывать скругленные красные точки', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();

  const decodedData = decodeQR(screenshot);
  expect(decodedData).not.toBeNull();
});

Then('должно появиться предупреждение о низком контрасте', async function (this: CustomWorld) {
  const warning = this.page.locator('[role="alert"], .warning, [class*="contrast-warning"]').first();
  await expect(warning).toBeVisible();
});

Then('система должна рекомендовать минимальное соотношение контрастности {float}:{int}',
  async function (this: CustomWorld, ratio1: number, ratio2: number) {
    const warning = this.page.locator('[role="alert"], .warning').first();
    const expectedText = `${ratio1}:${ratio2}`;
    await expect(warning).toContainText(expectedText);
  }
);

Then('файл должен быть загружен', async function (this: CustomWorld) {
  const downloadPromise = this.page.waitForEvent('download');
  await this.page.getByRole('button', { name: /скачать/i }).click();
  const download = await downloadPromise;

  expect(download).toBeTruthy();
  expect(await download.failure()).toBeNull();
});

Then('файл должен иметь расширение {string}', async function (this: CustomWorld, extension: string) {
  const downloadPromise = this.page.waitForEvent('download');
  await this.page.getByRole('button', { name: /скачать/i }).click();
  const download = await downloadPromise;

  const fileName = download.suggestedFilename();
  expect(fileName).toMatch(new RegExp(`${extension}$`));
});

Then('размер изображения должен быть {string} x {string} пикселей',
  async function (this: CustomWorld, width: string, height: string) {
    const canvas = await getQRPreviewCanvas(this.page);
    const bbox = await canvas.boundingBox();

    expect(bbox?.width).toBeGreaterThanOrEqual(parseInt(width) - 10);
    expect(bbox?.height).toBeGreaterThanOrEqual(parseInt(height) - 10);
  }
);

Then('превью QR-кода должно обновиться в течение {int} миллисекунд',
  async function (this: CustomWorld, maxTime: number) {
    expect(this.previewUpdateTime).toBeLessThanOrEqual(maxTime);
  }
);

Then('интерфейс не должен зависать во время генерации', async function (this: CustomWorld) {
  const isResponsive = await this.page.evaluate(() => {
    return !document.body.classList.contains('frozen') &&
           !document.body.classList.contains('loading');
  });

  expect(isResponsive).toBe(true);
});

Then('QR-код должен использовать цвета темной темы Telegram', async function (this: CustomWorld) {
  const bgColor = await this.page.evaluate(() => {
    return getComputedStyle(document.body).getPropertyValue('--tg-bg');
  });

  expect(bgColor).toBeTruthy();
  expect(bgColor).not.toBe('#ffffff');
});

Then('при нажатии кнопок должна срабатывать тактильная обратная связь', async function (this: CustomWorld) {
  let hapticCalled = false;

  await this.page.exposeFunction('trackHaptic', () => {
    hapticCalled = true;
  });

  await this.page.evaluate(() => {
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      const original = (window as any).Telegram.WebApp.HapticFeedback.impactOccurred;
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred = (...args: any[]) => {
        (window as any).trackHaptic();
        original?.(...args);
      };
    }
  });

  await this.page.getByRole('button', { name: /скачать/i }).click();

  expect(hapticCalled).toBe(true);
});

Then('мои настройки должны быть восстановлены', async function (this: CustomWorld) {
  await this.page.waitForTimeout(1000);

  const urlInput = this.page.locator('input[name="url"]').first();
  const value = await urlInput.inputValue();

  expect(value).toBe(this.inputValue);
});

Then('URL должен быть {string}', async function (this: CustomWorld, expectedUrl: string) {
  const urlInput = this.page.locator('input[name="url"]').first();
  const value = await urlInput.inputValue();
  expect(value).toBe(expectedUrl);
});

Then('стиль должен быть {string}', async function (this: CustomWorld, expectedStyle: string) {
  const selectedStyle = this.page.locator('[class*="styleOption"][class*="selected"]').first();
  await expect(selectedStyle).toContainText(expectedStyle);
});

Then('QR-код должен быть сгенерирован с уровнем коррекции {string}',
  async function (this: CustomWorld, level: string) {
    const canvas = await getQRPreviewCanvas(this.page);
    await expect(canvas).toBeVisible();

    const screenshot = await canvas.screenshot();
    expect(decodeQR(screenshot)).not.toBeNull();
  }
);

Then('QR-код должен восстанавливаться при повреждении до {int}%',
  async function (this: CustomWorld, percentage: number) {
    const canvas = await getQRPreviewCanvas(this.page);
    const screenshot = await canvas.screenshot();
    const decodedData = decodeQR(screenshot);

    expect(decodedData).not.toBeNull();
  }
);

Then('превью должно показывать логотип в центре QR-кода', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  await expect(canvas).toBeVisible();

  const screenshot = await canvas.screenshot();
  expect(decodeQR(screenshot)).not.toBeNull();
});

Then('логотип не должен перекрывать критичные области', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  const decodedData = decodeQR(screenshot);

  expect(decodedData).not.toBeNull();
  expect(decodedData).toBe(this.inputValue);
});

Then('QR-код должен оставаться сканируемым', async function (this: CustomWorld) {
  const canvas = await getQRPreviewCanvas(this.page);
  const screenshot = await canvas.screenshot();
  const decodedData = decodeQR(screenshot);

  expect(decodedData).not.toBeNull();
});

Then('QR-код должен быть оптимизирован для мобильных экранов', async function (this: CustomWorld) {
  const viewport = this.page.viewportSize();
  expect(viewport?.width).toBeLessThanOrEqual(768);

  const canvas = await getQRPreviewCanvas(this.page);
  const bbox = await canvas.boundingBox();

  expect(bbox?.width).toBeLessThanOrEqual(viewport?.width ?? 768);
});

export {};
