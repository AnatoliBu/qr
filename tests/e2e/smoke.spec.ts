import { test, expect } from '@playwright/test';
import { tgMock } from './tg-mock';

const repoBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  (process.env.GITHUB_ACTIONS ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}` : '');

const sanitizedBasePath = repoBasePath?.replace(/^\/+/, '').replace(/\/+$/, '') ?? '';
const normalizedBasePath = sanitizedBasePath ? `/${sanitizedBasePath}` : '';

const APP_URL = process.env.APP_URL ?? `http://localhost:3000${normalizedBasePath}`;

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.config.workers === 1) {
    page.on('console', (msg) => console.log(`[console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (error) => console.log(`[pageerror] ${error.message}`));
  }

  await page.addInitScript((value) => {
    const stub = () => {};
    const baseWebApp = value?.WebApp ?? {};

    const stubbedWebApp = {
      ...baseWebApp,
      ready: stub,
      expand: stub,
      close: stub,
      enableClosingConfirmation: stub,
      disableClosingConfirmation: stub,
      onEvent: stub,
      offEvent: stub,
      sendData: stub,
      openLink: stub,
      openTelegramLink: stub,
      showPopup: stub,
      showAlert: stub,
      showConfirm: stub,
      showScanQrPopup: stub,
      closeScanQrPopup: stub,
      readTextFromClipboard: stub,
      HapticFeedback: {
        ...(baseWebApp.HapticFeedback ?? {}),
        impactOccurred: stub,
        notificationOccurred: stub,
        selectionChanged: stub
      },
      MainButton: {
        ...(baseWebApp.MainButton ?? {}),
        show: stub,
        hide: stub,
        setText: stub,
        enable: stub,
        disable: stub,
        showProgress: stub,
        hideProgress: stub,
        setParams: stub,
        onClick: stub,
        offClick: stub
      },
      BackButton: {
        ...(baseWebApp.BackButton ?? {}),
        show: stub,
        hide: stub,
        onClick: stub,
        offClick: stub
      }
    };

    (window as any).Telegram = { ...value, WebApp: stubbedWebApp };
  }, tgMock());
});

test('generator tab renders key controls', async ({ page }, testInfo) => {
  const hasWebKitProject = testInfo.config.projects.some((project) => project.name.includes('WebKit'));
  test.skip(
    hasWebKitProject && testInfo.project.name.includes('Android'),
    'Android viewport hydration is flaky under Playwright when WebKit coverage is available.'
  );

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  const styleTab = page.getByRole('button', { name: '🎨 Стиль' });
  await styleTab.waitFor({ state: 'visible', timeout: 30_000 });
  await styleTab.click();

  const geometrySection = page.locator('text=🧩 Геометрия');
  await expect(geometrySection).toBeVisible();
  await expect(page.locator('label:has-text("Расстояние между точками")')).toBeVisible();
  const spacingSlider = page.locator('label:has-text("Расстояние между точками") + input[type="range"]');
  await expect(spacingSlider).toHaveAttribute('value', '0');

  const advancedTab = page.getByRole('button', { name: '⚙️ Продвинутые' });
  await expect(advancedTab).toBeVisible();
  await advancedTab.click();
  await expect(page.locator('text=Проценты показывают, какую часть QR-кода можно закрыть')).toBeVisible();
});

test('scanner tab exposes camera and upload controls', async ({ page }, testInfo) => {
  const hasWebKitProject = testInfo.config.projects.some((project) => project.name.includes('WebKit'));
  test.skip(
    hasWebKitProject && testInfo.project.name.includes('Android'),
    'Android viewport hydration is flaky under Playwright when WebKit coverage is available.'
  );

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  const scannerTab = page.getByRole('tab', { name: '📷 Сканер' });
  await scannerTab.waitFor({ state: 'visible', timeout: 30_000 });
  await scannerTab.click();
  await expect(page.getByRole('heading', { name: 'Клиентский сканер' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Включить камеру' })).toBeVisible();
  await expect(page.locator('label:has-text("Загрузить изображение")')).toBeVisible();
});

test('telegram webapp mock is available on the page', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');

  const hasTelegram = await page.evaluate(() => {
    // @ts-ignore - provided by init script
    return typeof window.Telegram?.WebApp?.platform === 'string';
  });

  expect(hasTelegram).toBe(true);
});
