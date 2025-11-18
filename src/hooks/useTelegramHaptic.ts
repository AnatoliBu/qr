'use client';

import { useCallback } from 'react';

export type TelegramHapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

function impactOccurred(style: TelegramHapticStyle) {
  if (typeof window === 'undefined') {
    return;
  }

  const haptics = window.Telegram?.WebApp?.HapticFeedback;
  haptics?.impactOccurred(style);
}

export function useTelegramHaptic(defaultStyle: TelegramHapticStyle = 'medium') {
  return useCallback(
    (style: TelegramHapticStyle = defaultStyle) => {
      impactOccurred(style);
    },
    [defaultStyle]
  );
}

export function triggerTelegramHaptic(style: TelegramHapticStyle = 'medium') {
  impactOccurred(style);
}
