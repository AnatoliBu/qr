"use client";

import { useEffect } from "react";
import styles from "../Generator.module.css";

interface ToastProps {
  message: string;
  /** Bump this key to re-trigger the same message. */
  trigger: number;
  onDismiss: () => void;
  duration?: number;
}

/**
 * Transient confirmation toast. Auto-dismisses after `duration` ms. Rendering
 * is driven by a non-empty `message`; `trigger` lets the same text re-fire.
 */
export function Toast({ message, trigger, onDismiss, duration = 2200 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, trigger, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  );
}
