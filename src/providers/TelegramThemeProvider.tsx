'use client';

import { useEffect, ReactNode } from 'react';
import type { TelegramWebApp } from '@/types/telegram';

interface TelegramThemeProviderProps {
  children: ReactNode;
}

export function TelegramThemeProvider({ children }: TelegramThemeProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const applyTheme = (webApp: TelegramWebApp) => {
      const theme = webApp.themeParams ?? {};
      const root = document.documentElement;

      root.style.setProperty('--bg', theme.bg_color || '#ffffff');
      root.style.setProperty('--text', theme.text_color || '#000000');
      root.style.setProperty('--hint', theme.hint_color || '#6d6d6d');
      root.style.setProperty('--accent', theme.link_color || '#3390ec');
      root.style.setProperty('--surface', theme.secondary_bg_color || '#f0f0f0');
      root.style.setProperty('--button', theme.button_color || '#3390ec');
      root.style.setProperty('--destructive', theme.destructive_text_color || '#ff3b30');
      root.style.setProperty('--surface-border', theme.secondary_bg_color || 'rgba(12, 33, 66, 0.1)');
      root.style.setProperty('color-scheme', webApp.colorScheme);
    };

    const initTelegram = (webApp: TelegramWebApp) => {
      try {
        webApp.ready?.();
        webApp.expand?.();
      } catch (error) {
        console.warn('Failed to initialize Telegram WebApp API', error);
      }

      applyTheme(webApp);

      const handleThemeChange = () => applyTheme(webApp);

      try {
        webApp.onEvent?.('themeChanged', handleThemeChange);
      } catch (error) {
        console.warn('Failed to subscribe to Telegram theme changes', error);
      }

      return () => {
        try {
          webApp.offEvent?.('themeChanged', handleThemeChange);
        } catch (error) {
          console.warn('Failed to unsubscribe from Telegram theme changes', error);
        }
      };
    };

    const maybeLoadTelegramApi = async () => {
      const existingTelegram = window.Telegram;
      if (existingTelegram?.WebApp) {
        return initTelegram(existingTelegram.WebApp);
      }

      const ua = window.navigator?.userAgent ?? '';
      if (!/Telegram/i.test(ua)) {
        return undefined;
      }

      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;

      const loadScript = new Promise<void>((resolve, reject) => {
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Failed to load Telegram WebApp script')));
      });

      document.head.appendChild(script);

      try {
        await loadScript;
      } catch (error) {
        console.warn(error);
        script.remove();
        return undefined;
      }

      if (!window.Telegram?.WebApp) {
        console.warn('Telegram WebApp API not available after script load');
        return undefined;
      }

      return initTelegram(window.Telegram.WebApp);
    };

    const cleanupPromise = maybeLoadTelegramApi();

    return () => {
      void cleanupPromise?.then((cleanup) => {
        cleanup?.();
      });
    };
  }, []);

  return <>{children}</>;
}
