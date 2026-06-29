// Haptic feedback helper (Telegram Mini App)
export function triggerHaptic(style: "light" | "medium" | "heavy" = "medium") {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
}
