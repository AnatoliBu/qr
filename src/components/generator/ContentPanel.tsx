import classNames from "classnames";
import type { QRType, QRTypeDefinition } from "@/lib/qrTypes";
import styles from "../Generator.module.css";
import { MAX_PAYLOAD_BYTES, QR_TEMPLATES } from "./constants";

interface ContentPanelProps {
  active: boolean;
  activeType: QRType;
  definition: QRTypeDefinition;
  formValues: Record<string, string>;
  errors: Record<string, string>;
  byteLength: number;
  onSwitchType: (type: QRType) => void;
  onValueChange: (name: string, value: string) => void;
}

export function ContentPanel({
  active,
  activeType,
  definition,
  formValues,
  errors,
  byteLength,
  onSwitchType,
  onValueChange
}: ContentPanelProps) {
  return (
    <div className={classNames(styles.tabContent, { [styles.tabContentActive]: active })}>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>Выберите тип QR-кода</span>
        </label>
        <div className={styles.templateGrid} role="group" aria-label="Тип QR-кода">
          {QR_TEMPLATES.map((template) => (
            <button
              key={template.type}
              type="button"
              data-testid={`qr-template-${template.type}`}
              aria-pressed={activeType === template.type}
              className={classNames(styles.templateCard, {
                [styles.templateCardActive]: activeType === template.type
              })}
              onClick={() => onSwitchType(template.type as QRType)}
            >
              <div className={styles.templateName}>
                {template.emoji} {template.name}
              </div>
              <div className={styles.templateDesc}>{template.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          <span>{definition.title}</span>
          <span className={styles.badge}>{definition.description}</span>
        </label>
        {definition.fields.map((field) => {
          const fieldId = `qr-input-${field.name}`;
          const errorId = `${fieldId}-error`;
          const hasError = Boolean(errors[field.name]);

          return (
            <div key={field.name} className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor={fieldId}>
                <span>
                  {field.label}
                  {field.required && " *"}
                </span>
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={fieldId}
                  name={field.name}
                  data-testid={`qr-input-${field.name}`}
                  className={classNames(styles.textarea, { error: hasError })}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  value={formValues[field.name] ?? ""}
                  onChange={(e) => onValueChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  id={fieldId}
                  name={field.name}
                  data-testid={`qr-input-${field.name}`}
                  type={
                    field.type === "email" ? "email" : field.type === "number" ? "number" : "text"
                  }
                  className={classNames(styles.input, { error: hasError })}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  value={formValues[field.name] ?? ""}
                  onChange={(e) => onValueChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
              {field.helper && (
                <small style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}>
                  {field.helper}
                </small>
              )}
              {hasError && (
                <span id={errorId} className="error-text" role="alert">
                  {errors[field.name]}
                </span>
              )}
            </div>
          );
        })}
        {errors.__payload && (
          <span className="error-text" role="alert">
            {errors.__payload}
          </span>
        )}
      </div>

      <div className={styles.infoCard}>
        💡 <strong>Совет:</strong> Используйте короткие данные для лучшего сканирования QR-кода.
        Длина: {byteLength} / {MAX_PAYLOAD_BYTES} байт
      </div>
    </div>
  );
}
