/**
 * Common Test Helpers
 */

import { Page, Locator } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

/**
 * Get QR preview canvas element
 */
export async function getQRPreviewCanvas(page: Page): Promise<Locator> {
  const container = page.locator('[class*="qrPreview"]').first();
  await container.waitFor({ state: 'visible', timeout: 30_000 });
  const canvas = container.locator('canvas, svg').first();
  return canvas;
}

/**
 * Decode QR code from image buffer
 */
export function decodeQR(buffer: Buffer): string | null {
  try {
    const png = PNG.sync.read(buffer);
    const data = Uint8ClampedArray.from(png.data);
    const code = jsQR(data, png.width, png.height);
    return code?.data ?? null;
  } catch (error) {
    console.error('Failed to decode QR:', error);
    return null;
  }
}

/**
 * Wait for element with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Fill input and trigger change event
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector).first();
  await input.fill(value);
  await input.dispatchEvent('change');
}

/**
 * Mock Telegram WebApp API
 */
export async function mockTelegramWebApp(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((themeValue) => {
    (window as any).Telegram = {
      WebApp: {
        ready: () => {},
        expand: () => {},
        close: () => {},
        platform: 'ios',
        version: '7.0',
        colorScheme: themeValue,
        themeParams: {
          bg_color: themeValue === 'dark' ? '#1c1c1d' : '#ffffff',
          text_color: themeValue === 'dark' ? '#ffffff' : '#000000',
          hint_color: themeValue === 'dark' ? '#8e8e93' : '#999999',
          link_color: themeValue === 'dark' ? '#2ea6ff' : '#007aff',
          button_color: themeValue === 'dark' ? '#2ea6ff' : '#007aff',
          button_text_color: '#ffffff',
          secondary_bg_color: themeValue === 'dark' ? '#2c2c2e' : '#f2f2f7',
        },
        HapticFeedback: {
          impactOccurred: (style: string) => {
            console.log(`[Haptic] ${style}`);
          },
          notificationOccurred: (type: string) => {
            console.log(`[Haptic Notification] ${type}`);
          },
          selectionChanged: () => {
            console.log('[Haptic] Selection changed');
          },
        },
        MainButton: {
          text: '',
          color: '#2ea6ff',
          textColor: '#ffffff',
          isVisible: false,
          isActive: true,
          show: () => {},
          hide: () => {},
          setText: (text: string) => {},
          onClick: (callback: () => void) => {},
          offClick: (callback: () => void) => {},
        },
        BackButton: {
          isVisible: false,
          show: () => {},
          hide: () => {},
          onClick: (callback: () => void) => {},
          offClick: (callback: () => void) => {},
        },
      },
    };
  }, theme);
}
