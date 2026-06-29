import classNames from "classnames";
import styles from "../Generator.module.css";
import { ColorSwatch } from "./ColorSwatch";
import { GradientControl } from "./GradientControl";
import {
  COLOR_PRESETS,
  DOT_STYLE_OPTIONS,
  EYE_INNER_OPTIONS,
  EYE_OUTER_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_PRESETS
} from "./constants";
import { triggerHaptic } from "./haptics";
import type {
  DotStyle,
  EyeDotStyle,
  EyeStyle,
  GradientKey,
  GradientType,
  ShapeType,
  StyleOptions
} from "./types";

interface StylePanelProps {
  active: boolean;
  style: StyleOptions;
  maxLogoSize: number;
  logoSizeExceedsLimit: boolean;
  contrastRatio: number;
  showContrastWarning: boolean;
  onUpdateStyle: (update: Partial<StyleOptions>) => void;
  onGradientToggle: (key: GradientKey, enabled: boolean) => void;
  onGradientTypeChange: (key: GradientKey, type: GradientType) => void;
  onGradientRotationChange: (key: GradientKey, degrees: number) => void;
  onGradientColorChange: (key: GradientKey, stopIndex: number, color: string) => void;
  onFileUpload: (file: File | null) => void;
}

export function StylePanel({
  active,
  style,
  maxLogoSize,
  logoSizeExceedsLimit,
  contrastRatio,
  showContrastWarning,
  onUpdateStyle,
  onGradientToggle,
  onGradientTypeChange,
  onGradientRotationChange,
  onGradientColorChange,
  onFileUpload
}: StylePanelProps) {
  return (
    <div className={classNames(styles.tabContent, { [styles.tabContentActive]: active })}>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>🎭 Стиль QR-кода</span>
        </label>
        <div className={styles.styleGrid} role="group" aria-label="Стиль точек">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.dotStyle}
              type="button"
              aria-pressed={style.dotStyle === preset.dotStyle}
              className={classNames(styles.styleOption, {
                [styles.styleOptionActive]: style.dotStyle === preset.dotStyle
              })}
              onClick={() => {
                onUpdateStyle({ dotStyle: preset.dotStyle });
                triggerHaptic("light");
              }}
            >
              <div className={styles.stylePreview}>{preset.emoji}</div>
              <div className={styles.styleLabel}>{preset.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>🎨 Цветовая схема</span>
        </label>
        <div className={styles.colorPickerGroup}>
          <ColorSwatch
            label="Передний план"
            value={style.foreground}
            onChange={(foreground) => onUpdateStyle({ foreground })}
          />
          <ColorSwatch
            label="Фон"
            value={style.background}
            onChange={(background) => onUpdateStyle({ background })}
          />
        </div>
      </div>

      {showContrastWarning && (
        <div className={classNames(styles.infoCard, styles.infoCardWarning)} role="alert">
          ⚠️ <strong>Низкий контраст:</strong> текущее соотношение {contrastRatio.toFixed(2)}:1.{" "}
          Подберите более контрастные цвета для лучшей сканируемости QR-кода.
        </div>
      )}

      <div className={styles.divider}></div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>🧩 Геометрия</span>
          <span className={styles.badge}>Форма и глазки</span>
        </label>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldControl}>
            <span className={styles.fieldTitle}>Форма QR</span>
            <select
              className={styles.select}
              value={style.shape}
              onChange={(event) => {
                onUpdateStyle({ shape: event.target.value as ShapeType });
                triggerHaptic("light");
              }}
            >
              {SHAPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fieldControl}>
            <span className={styles.fieldTitle}>Стиль точек</span>
            <select
              className={styles.select}
              value={style.dotStyle}
              onChange={(event) => {
                onUpdateStyle({ dotStyle: event.target.value as DotStyle });
                triggerHaptic("light");
              }}
            >
              {DOT_STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fieldControl}>
            <span className={styles.fieldTitle}>Внешние глазки</span>
            <select
              className={styles.select}
              value={style.eyeOuter}
              onChange={(event) => {
                onUpdateStyle({ eyeOuter: event.target.value as EyeStyle });
                triggerHaptic("light");
              }}
            >
              {EYE_OUTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fieldControl}>
            <span className={styles.fieldTitle}>Внутренние глазки</span>
            <select
              className={styles.select}
              value={style.eyeInner}
              onChange={(event) => {
                onUpdateStyle({ eyeInner: event.target.value as EyeDotStyle });
                triggerHaptic("light");
              }}
            >
              {EYE_INNER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.rangeGroup}>
          <label className={styles.inputLabel}>
            <span>↔️ Расстояние между точками</span>
            <span className={styles.rangeValue}>{style.dotSpacing ?? 0}%</span>
          </label>
          <input
            type="range"
            className={styles.rangeInput}
            min={0}
            max={60}
            step={5}
            value={style.dotSpacing ?? 0}
            onChange={(event) => {
              onUpdateStyle({ dotSpacing: Number(event.target.value) });
              triggerHaptic("light");
            }}
          />
          <div className={styles.rangeHint}>0% — плотная сетка, 60% — заметные промежутки.</div>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>🌈 Градиенты</span>
          <span className={styles.badge}>Расширенный цвет</span>
        </label>
        <div className={styles.gradientSection}>
          <GradientControl
            name="Точки"
            enabled={style.useDotsGradient}
            gradient={style.dotsGradient}
            onToggle={(enabled) => onGradientToggle("dotsGradient", enabled)}
            onTypeChange={(type) => onGradientTypeChange("dotsGradient", type)}
            onRotationChange={(deg) => onGradientRotationChange("dotsGradient", deg)}
            onColorChange={(i, color) => onGradientColorChange("dotsGradient", i, color)}
          />
          <GradientControl
            name="Фон"
            enabled={style.useBackgroundGradient}
            gradient={style.backgroundGradient}
            onToggle={(enabled) => onGradientToggle("backgroundGradient", enabled)}
            onTypeChange={(type) => onGradientTypeChange("backgroundGradient", type)}
            onRotationChange={(deg) => onGradientRotationChange("backgroundGradient", deg)}
            onColorChange={(i, color) => onGradientColorChange("backgroundGradient", i, color)}
          />
          <GradientControl
            name="Углы"
            enabled={style.useCornersGradient}
            gradient={style.cornersGradient}
            onToggle={(enabled) => onGradientToggle("cornersGradient", enabled)}
            onTypeChange={(type) => onGradientTypeChange("cornersGradient", type)}
            onRotationChange={(deg) => onGradientRotationChange("cornersGradient", deg)}
            onColorChange={(i, color) => onGradientColorChange("cornersGradient", i, color)}
          />
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>🪪 Логотип в центре</span>
          <span className={styles.badge}>
            {style.logoDataUrl
              ? `Макс ${maxLogoSize}% при ${style.errorCorrection}`
              : "Рекомендуем Q или H"}
          </span>
        </label>

        <div className={styles.logoControls}>
          <div className={styles.logoButtons}>
            <label className={styles.logoUploadButton}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className={styles.logoUploadInput}
                onChange={(event) => onFileUpload(event.target.files?.[0] ?? null)}
              />
              {style.logoDataUrl ? "Заменить логотип" : "Загрузить логотип"}
            </label>
            {style.logoDataUrl && (
              <button
                type="button"
                className={styles.logoRemoveButton}
                onClick={() => onFileUpload(null)}
              >
                Удалить
              </button>
            )}
          </div>

          {style.logoDataUrl && (
            <>
              <div className={styles.logoPreview}>
                <img src={style.logoDataUrl} alt="Предпросмотр логотипа" />
                <div className={styles.logoHint}>Логотип будет размещён по центру QR-кода.</div>
              </div>

              <div className={styles.rangeGroup}>
                <label className={styles.inputLabel}>
                  <span>Размер логотипа</span>
                  <span className={styles.rangeValue}>
                    {Math.min(style.logoSize, maxLogoSize)}%
                  </span>
                </label>
                <input
                  type="range"
                  className={styles.rangeInput}
                  min={10}
                  max={maxLogoSize}
                  value={Math.min(style.logoSize, maxLogoSize)}
                  onChange={(event) => onUpdateStyle({ logoSize: Number(event.target.value) })}
                />
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={style.hideBackgroundDots}
                  onChange={(event) => onUpdateStyle({ hideBackgroundDots: event.target.checked })}
                />
                <span>Скрыть точки под логотипом</span>
              </label>

              {logoSizeExceedsLimit && (
                <div className={classNames(styles.infoCard, styles.infoCardWarning)}>
                  ⚠️ Логотип автоматически уменьшен до {maxLogoSize}% из-за текущего уровня коррекции
                  ошибок. Увеличьте коррекцию для более крупного изображения.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.templateGrid} role="group" aria-label="Цветовые пресеты">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={styles.templateCard}
            onClick={() => {
              onUpdateStyle({ foreground: preset.fg, background: preset.bg });
              triggerHaptic("medium");
            }}
          >
            <div className={styles.templateName}>
              {preset.emoji} {preset.name}
            </div>
            <div className={styles.templateDesc}>
              {preset.fg} / {preset.bg}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
