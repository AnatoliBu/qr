import classNames from "classnames";
import { QR_SYSTEM } from "@/lib/qrConstants";
import styles from "../Generator.module.css";
import type { ErrorCorrection, ExportFormat, StyleOptions } from "./types";

interface AdvancedPanelProps {
  active: boolean;
  style: StyleOptions;
  onUpdateStyle: (update: Partial<StyleOptions>) => void;
  onExportSizeChange: (value: number) => void;
  onMarginChange: (percent: number) => void;
}

const ERROR_CORRECTION_LABELS: Record<ErrorCorrection, string> = {
  L: "Низкий",
  M: "Средний",
  Q: "Высокий",
  H: "Очень высокий"
};

export function AdvancedPanel({
  active,
  style,
  onUpdateStyle,
  onExportSizeChange,
  onMarginChange
}: AdvancedPanelProps) {
  return (
    <div className={classNames(styles.tabContent, { [styles.tabContentActive]: active })}>
      <div className={styles.infoCard}>
        ℹ️ <strong>Важно:</strong> Размер экспорта не влияет на превью. Превью всегда оптимизировано
        для экрана устройства.
      </div>

      <div className={styles.rangeGroup}>
        <label className={styles.inputLabel}>
          <span>📏 Размер экспорта (для скачивания)</span>
          <span className={styles.rangeValue}>{style.exportSize}px</span>
        </label>
        <input
          type="range"
          className={styles.rangeInput}
          min={QR_SYSTEM.EXPORT.MIN_SIZE}
          max={QR_SYSTEM.EXPORT.MAX_SIZE}
          step={QR_SYSTEM.EXPORT.STEP}
          value={style.exportSize}
          onChange={(e) => onExportSizeChange(Number(e.target.value))}
        />
        <div className={styles.rangeHint}>
          От {QR_SYSTEM.EXPORT.MIN_SIZE}px (веб) до {QR_SYSTEM.EXPORT.MAX_SIZE}px (печать, билборды)
        </div>
      </div>

      <div className={styles.rangeGroup}>
        <label className={styles.inputLabel}>
          <span>🛡️ Уровень коррекции ошибок</span>
          <span className={styles.rangeValue}>{ERROR_CORRECTION_LABELS[style.errorCorrection]}</span>
        </label>
        <select
          className={styles.select}
          value={style.errorCorrection}
          onChange={(e) => onUpdateStyle({ errorCorrection: e.target.value as ErrorCorrection })}
        >
          <option value="L">L — до 7%</option>
          <option value="M">M — до 15%</option>
          <option value="Q">Q — до 25%</option>
          <option value="H">H — до 30%</option>
        </select>
        <div className={styles.rangeHint}>
          Проценты показывают, какую часть QR-кода можно закрыть или испортить, чтобы он всё равно
          считывался.
        </div>
      </div>

      <div className={styles.rangeGroup}>
        <label className={styles.inputLabel}>
          <span>🖼️ Отступ (Quiet Zone)</span>
          <span className={styles.rangeValue}>{style.marginPercent}%</span>
        </label>
        <input
          type="range"
          className={styles.rangeInput}
          min={QR_SYSTEM.MARGIN.MIN}
          max={QR_SYSTEM.MARGIN.MAX}
          step={QR_SYSTEM.MARGIN.STEP}
          value={style.marginPercent}
          onChange={(e) => onMarginChange(Number(e.target.value))}
          onInput={(e) => onMarginChange(Number((e.target as HTMLInputElement).value))}
        />
        <div className={styles.rangeControls}>
          <button
            type="button"
            className={styles.rangeStepper}
            onClick={() => onMarginChange(style.marginPercent - QR_SYSTEM.MARGIN.STEP)}
            aria-label="Уменьшить отступ"
          >
            −
          </button>
          <input
            type="number"
            className={styles.rangeNumber}
            min={QR_SYSTEM.MARGIN.MIN}
            max={QR_SYSTEM.MARGIN.MAX}
            step={QR_SYSTEM.MARGIN.STEP}
            value={style.marginPercent}
            onChange={(event) => onMarginChange(Number(event.target.value))}
          />
          <button
            type="button"
            className={styles.rangeStepper}
            onClick={() => onMarginChange(style.marginPercent + QR_SYSTEM.MARGIN.STEP)}
            aria-label="Увеличить отступ"
          >
            +
          </button>
        </div>
        <div className={styles.rangeHint}>
          В процентах от размера QR. 8% = стандарт, 0% = без отступа.
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.infoCard}>
        ⚠️ <strong>Внимание:</strong> Высокий уровень коррекции ошибок делает QR-код более устойчивым
        к повреждениям, но увеличивает его сложность
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel} htmlFor="qr-export-format">
          <span>📦 Формат экспорта</span>
        </label>
        <select
          id="qr-export-format"
          className={styles.select}
          value={style.exportFormat}
          onChange={(e) => onUpdateStyle({ exportFormat: e.target.value as ExportFormat })}
        >
          <option value="png">PNG (Рекомендуется)</option>
          <option value="svg">SVG (Векторный)</option>
        </select>
      </div>
    </div>
  );
}
