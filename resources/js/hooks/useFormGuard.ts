/**
 * =============================================================================
 * FILE: hooks/useFormGuard.ts
 * PURPOSE: Implements the 6 form-frustration-reduction rules:
 *   1. Disable submit until valid, but ALWAYS show which fields are missing.
 *   2. Inline validation on blur.
 *   3. Character counters for length-limited fields.
 *   4. Prefill from known user/session data (caller passes initialValues).
 *   5. Live password requirement checklist.
 *   6. Forgiving input formatting via `normalize`.
 * =============================================================================
 */
import { useCallback, useMemo, useState } from "react";

export interface FieldConfig<T> {
  required?: boolean;
  maxLength?: number;
  validate?: (value: T) => string | null;
  normalize?: (value: T) => T;
}

export function useFormGuard<TValues extends Record<string, unknown>>(
  initialValues: TValues,
  fieldConfigs: Partial<{ [K in keyof TValues]: FieldConfig<TValues[K]> }>,
) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof TValues, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});

  const validateField = useCallback((name: keyof TValues, value: TValues[keyof TValues]) => {
    const cfg = fieldConfigs[name];
    if (!cfg) return null;
    if (cfg.required && (value === "" || value == null)) return "This field is required.";
    if (cfg.validate) return cfg.validate(value);
    return null;
  }, [fieldConfigs]);

  const setValue = useCallback((name: keyof TValues, rawValue: TValues[keyof TValues]) => {
    const cfg = fieldConfigs[name];
    const value = cfg?.normalize ? cfg.normalize(rawValue) : rawValue;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) ?? undefined }));
    }
  }, [fieldConfigs, touched, validateField]);

  const onBlur = useCallback((name: keyof TValues) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, values[name]) ?? undefined }));
  }, [validateField, values]);

  const missingFields = useMemo(() => Object.keys(fieldConfigs).filter((key) => {
    const cfg = fieldConfigs[key as keyof TValues];
    return cfg?.required && (values[key as keyof TValues] === "" || values[key as keyof TValues] == null);
  }), [fieldConfigs, values]);

  const isValid = useMemo(() => {
    const noErrors = Object.values(errors).every((e) => !e);
    return noErrors && missingFields.length === 0;
  }, [errors, missingFields]);

  const remainingChars = useCallback((name: keyof TValues) => {
    const cfg = fieldConfigs[name];
    if (!cfg?.maxLength) return null;
    const len = String(values[name] ?? "").length;
    return cfg.maxLength - len;
  }, [fieldConfigs, values]);

  return { values, setValue, onBlur, errors, touched, isValid, missingFields, remainingChars };
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

export function passwordChecklist(pw: string) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /\d/.test(pw),
    hasSymbol: /[^A-Za-z0-9]/.test(pw),
  };
}
