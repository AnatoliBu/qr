import styles from "../Generator.module.css";
import { ColorSwatch } from "./ColorSwatch";
import { radiansToDegrees } from "./colorUtils";
import type { Gradient, GradientType } from "./types";

interface GradientControlProps {
  name: string;
  enabled: boolean;
  gradient?: Gradient;
  onToggle: (enabled: boolean) => void;
  onTypeChange: (type: GradientType) => void;
  onRotationChange: (degrees: number) => void;
  onColorChange: (stopIndex: number, color: string) => void;
}

/**
 * One gradient editor (used for dots / background / corners). Renders the
 * enable toggle, type select, rotation slider (linear only) and two color
 * stops.
 */
export function GradientControl({
  name,
  enabled,
  gradient,
  onToggle,
  onTypeChange,
  onRotationChange,
  onColorChange
}: GradientControlProps) {
  const startColor = gradient?.colorStops[0]?.color ?? "#000000";
  const endColor = gradient?.colorStops[1]?.color ?? "#ffffff";

  return (
    <div className={styles.gradientBlock}>
      <div className={styles.gradientHeader}>
        <div className={styles.gradientName}>{name}</div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <span>Использовать градиент</span>
        </label>
      </div>

      {enabled && gradient && (
        <>
          <div>
            <span className={styles.fieldTitle}>Тип градиента</span>
            <select
              className={styles.select}
              value={gradient.type}
              onChange={(event) => onTypeChange(event.target.value as GradientType)}
            >
              <option value="linear">Линейный</option>
              <option value="radial">Радиальный</option>
            </select>
          </div>

          {gradient.type === "linear" && (
            <div className={styles.rangeGroup}>
              <label className={styles.inputLabel}>
                <span>Угол поворота</span>
                <span className={styles.rangeValue}>{`${radiansToDegrees(gradient.rotation)}°`}</span>
              </label>
              <input
                type="range"
                className={styles.rangeInput}
                min={0}
                max={360}
                value={radiansToDegrees(gradient.rotation)}
                onChange={(event) => onRotationChange(Number(event.target.value))}
              />
            </div>
          )}

          <div className={styles.gradientColorGroup}>
            <ColorSwatch
              label="Начальный цвет"
              value={startColor}
              onChange={(color) => onColorChange(0, color)}
              className={styles.gradientColorItem}
              compact
            />
            <ColorSwatch
              label="Конечный цвет"
              value={endColor}
              onChange={(color) => onColorChange(1, color)}
              className={styles.gradientColorItem}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}
