'use client';

import { useEffect, ReactNode } from 'react';
import '@/types/telegram';

interface TelegramThemeProviderProps {
  children: ReactNode;
}

const DEFAULT_BORDER = 'rgba(12, 33, 66, 0.1)';

// Build a translucent rgba() border from a #rrggbb (or #rgb) hex color.
// Falls back to a neutral translucent border for non-hex / missing input.
function toTranslucent(hex: string | undefined, alpha: number): string {
  if (!hex) return DEFAULT_BORDER;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return DEFAULT_BORDER;
  let h = match[1];
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TelegramThemeProvider({ children }: TelegramThemeProviderProps) {
  useEffect(() => {
    // Check if running inside Telegram
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
      return;
    }

    const WebApp = window.Telegram.WebApp;

    // Initialize Telegram WebApp
    WebApp.ready();
    WebApp.expand();

    // Apply theme parameters - TMA Premium Design System
    const applyTheme = () => {
      const theme = WebApp.themeParams;
      const root = document.documentElement;

      // TMA Premium Design System variables
      root.style.setProperty('--bg', theme.bg_color || '#ffffff');
      root.style.setProperty('--text', theme.text_color || '#000000');
      root.style.setProperty('--hint', theme.hint_color || '#6d6d6d');
      root.style.setProperty('--accent', theme.link_color || '#3390ec');
      root.style.setProperty('--surface', theme.secondary_bg_color || '#f0f0f0');
      root.style.setProperty('--button', theme.button_color || '#3390ec');
      root.style.setProperty('--destructive', theme.destructive_text_color || '#ff3b30');
      // Keep a subtle translucent border rather than reusing the opaque
      // secondary_bg_color (which equals --surface and would make the border
      // invisible inside Telegram). Derive it from the theme text color.
      root.style.setProperty('--surface-border', toTranslucent(theme.text_color, 0.1));

      // Set color scheme
      root.style.setProperty('color-scheme', WebApp.colorScheme);
    };

    // Initial theme application
    applyTheme();

    // Listen for theme changes
    const handleThemeChange = () => {
      applyTheme();
    };

    WebApp.onEvent('themeChanged', handleThemeChange);

    // Cleanup
    return () => {
      WebApp.offEvent('themeChanged', handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}
