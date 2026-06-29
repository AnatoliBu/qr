'use client';

import { useEffect, useCallback, useState } from 'react';
import '@/types/telegram';

interface UseMainButtonOptions {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  textColor?: string;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
}

export function useMainButton({
  text,
  onClick,
  disabled = false,
  color,
  textColor,
  hapticFeedback = 'medium'
}: UseMainButtonOptions) {
  const handleClick = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred(hapticFeedback);
    onClick();
  }, [onClick, hapticFeedback]);

  useEffect(() => {
    const webApp = typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
    if (!webApp) {
      return;
    }

    const mainButton = webApp.MainButton;

    // setParams already covers visibility and active state, so no extra
    // show()/enable()/disable() calls are needed. Omit color keys when
    // undefined so the client keeps its current colors instead of resetting.
    mainButton.setParams({
      text,
      is_active: !disabled,
      is_visible: true,
      ...(color !== undefined ? { color } : {}),
      ...(textColor !== undefined ? { text_color: textColor } : {})
    });

    mainButton.onClick(handleClick);

    return () => {
      mainButton.offClick(handleClick);
      mainButton.hide();
    };
  }, [text, disabled, color, textColor, handleClick]);

  const [isAvailable] = useState(
    () => typeof window !== 'undefined' && !!window.Telegram?.WebApp
  );

  return { isAvailable };
}
