import type { QRTypeDefinition } from "@/lib/qrTypes";
import { MAX_PAYLOAD_BYTES } from "./constants";

export interface ValidationResult {
  payload: string;
  byteLength: number;
  errors: Record<string, string>;
  valid: boolean;
}

/**
 * Pure validation of the current form values against a type definition.
 * Does not touch any rendering state, so callers (preview/export) can validate
 * without forcing a preview re-render.
 */
export function validate(
  definition: QRTypeDefinition,
  formValues: Record<string, string>
): ValidationResult {
  const payload = definition.buildPayload(formValues);
  const byteLength = new TextEncoder().encode(payload).length;

  const errors: Record<string, string> = {};
  definition.fields.forEach((field) => {
    const value = formValues[field.name] ?? "";
    if (field.required && !value.trim()) {
      errors[field.name] = "Обязательное поле";
      return;
    }
    if (field.validate) {
      const error = field.validate(value, formValues);
      if (error) {
        errors[field.name] = error;
      }
    }
    if (field.pattern && value && !field.pattern.test(value)) {
      errors[field.name] = "Некорректное значение";
    }
  });

  if (!payload) {
    errors.__payload = "Заполните обязательные поля";
  }
  if (byteLength > MAX_PAYLOAD_BYTES) {
    errors.__payload = `Предел ${MAX_PAYLOAD_BYTES} байт, сейчас ${byteLength}`;
  }

  return {
    payload,
    byteLength,
    errors,
    valid: Object.keys(errors).length === 0
  };
}
