// Haptic feedback helper (Telegram Mini App)
export function triggerHaptic(style: "light" | "medium" | "heavy" = "medium") {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
}

// Notification haptic (success / warning / error) — distinct from impact taps.
export function notifyHaptic(type: "success" | "warning" | "error" = "success") {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  }
}
