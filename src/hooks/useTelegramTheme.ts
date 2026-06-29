'use client';

import { useEffect, useState } from 'react';
import { TelegramThemeParams, TelegramWebApp } from '@/types/telegram';
import '@/types/telegram';

const getTelegramWebApp = (): TelegramWebApp | undefined =>
  typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;

export function useTelegramTheme() {
  // Initialise to SSR-matching defaults so the first client render matches the
  // server output (avoids hydration mismatch), then sync from Telegram in the
  // effect below.
  const [theme, setTheme] = useState<TelegramThemeParams>({});
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [available, setAvailable] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) {
      return;
    }

    const updateTheme = () => {
      setTheme({ ...webApp.themeParams });
      setColorScheme(webApp.colorScheme ?? 'light');
      setAvailable(true);
      setPlatform(webApp.platform ?? 'unknown');
    };

    updateTheme();
    webApp.onEvent?.('themeChanged', updateTheme);

    return () => {
      webApp.offEvent?.('themeChanged', updateTheme);
    };
  }, []);

  return {
    theme,
    colorScheme,
    isAvailable: available,
    platform
  };
}
