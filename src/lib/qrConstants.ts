/**
 * QR Code System Constants
 *
 * Разделение ответственности:
 * - PREVIEW: фиксированный размер для отображения в UI (всегда 280px)
 * - EXPORT: настраиваемый размер для экспорта (256-4096px)
 * - MARGIN: отступы в процентах (масштабируется пропорционально размеру)
 */

export const QR_SYSTEM = {
  /**
   * DISPLAY LAYER (Preview)
   * Параметры для отображения QR в интерфейсе
   */
  PREVIEW: {
    /**
     * Логический размер preview - всегда фиксированный
     * 280px выбран как оптимальный размер для мобильных экранов, обеспечивая хорошее качество QR-кода и соответствие дизайну UI.
     */
    LOGICAL_SIZE: 280,
  },

  /**
   * GENERATION LAYER (Export)
   * Параметры для экспорта QR-кода в файл
   */
  EXPORT: {
    /** Минимальный размер экспорта */
    MIN_SIZE: 256,
    /** Максимальный размер экспорта (для билбордов и печати) */
    MAX_SIZE: 4096,
    /** Размер экспорта по умолчанию */
    DEFAULT_SIZE: 1024,
    /** Шаг изменения размера */
    STEP: 64,
  },

  /**
   * MARGIN (в процентах от размера QR)
   * Обеспечивает пропорциональные отступы на любом размере
   */
  MARGIN: {
    /** Минимальный margin (0%) */
    MIN: 0,
    /** Максимальный margin (20%) */
    MAX: 20,
    /** Margin по умолчанию (8% - стандарт QR) */
    DEFAULT: 8,
    /** Шаг изменения margin */
    STEP: 2,
  },
} as const;

/**
 * Вычисляет margin в пикселях на основе размера и процента
 * @param size - размер QR-кода в пикселях
 * @param percent - процент отступа (0-20)
 * @returns margin в пикселях
 */
export function calculateMarginPx(size: number, percent: number): number {
  return Math.max(0, Math.round((size * percent) / 100));
}

/**
 * Проверяет, валиден ли размер экспорта.
 *
 * Размер обязан удовлетворять ТРЁМ независимым условиям одновременно:
 * 1. не меньше EXPORT.MIN_SIZE;
 * 2. не больше EXPORT.MAX_SIZE;
 * 3. кратен EXPORT.STEP (выровнен по сетке шага слайдера).
 *
 * Возвращает единый boolean и не различает причину невалидности
 * (вне диапазона vs не по сетке) — для точного UI-фидбэка проверяйте
 * условия отдельно.
 */
export function isValidExportSize(size: number): boolean {
  return (
    size >= QR_SYSTEM.EXPORT.MIN_SIZE &&
    size <= QR_SYSTEM.EXPORT.MAX_SIZE &&
    size % QR_SYSTEM.EXPORT.STEP === 0
  );
}

/**
 * Проверяет, валиден ли процент margin
 */
export function isValidMarginPercent(percent: number): boolean {
  return percent >= QR_SYSTEM.MARGIN.MIN && percent <= QR_SYSTEM.MARGIN.MAX;
}
