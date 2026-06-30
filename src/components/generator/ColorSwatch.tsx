import classNames from "classnames";
import styles from "../Generator.module.css";
import { isLightColor } from "./colorUtils";

interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Extra class for the wrapper (e.g. gradient color item). */
  className?: string;
  /** Render the label as a small field title instead of a full input label. */
  compact?: boolean;
}

/**
 * Color picker: a contrast-aware swatch showing the uppercase hex, plus a
 * native color input. Used for foreground/background and every gradient stop.
 */
export function ColorSwatch({ label, value, onChange, className, compact }: ColorSwatchProps) {
  return (
    <div className={classNames(styles.colorPicker, className)}>
      {compact ? (
        <span className={styles.fieldTitle}>{label}</span>
      ) : (
        <label className={styles.inputLabel}>{label}</label>
      )}
      <div
        className={styles.colorPreview}
        style={{
          background: value,
          color: isLightColor(value) ? "#000" : "#fff"
        }}
      >
        {value.toUpperCase()}
      </div>
      <input
        type="color"
        className={styles.colorInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
