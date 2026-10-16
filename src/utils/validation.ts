import { z } from 'zod';
import type { ChangeEvent } from 'react';

// Mobile numbers: optional, but when filled must be exactly 10 digits.
// The backend enforces the same rule and rejects duplicates with a 409.
export const MOBILE_REGEX = /^\d{10}$/;
export const MOBILE_ERROR = 'Mobile number must be exactly 10 digits';

export const mobileField = z
  .string()
  .trim()
  .regex(MOBILE_REGEX, MOBILE_ERROR)
  .optional()
  .or(z.literal(''));

export const mobileInputProps = {
  type: 'tel',
  inputMode: 'numeric',
  autoComplete: 'tel',
  placeholder: '10-digit mobile number',
} as const;

/** Keep only digits. A pasted "+91 98765 43210" or "098765 43210" becomes "9876543210". */
export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Use in an input's onChange before passing the event on, e.g. reg.onChange(digitsOnly(e)). */
export function digitsOnly<E extends ChangeEvent<HTMLInputElement>>(e: E): E {
  e.target.value = normalizeMobile(e.target.value);
  return e;
}

/** YYYY-MM-DD in the user's local time zone (what a date input shows). */
export function localISODate(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Latest selectable date of birth — yesterday. Use as the date input's `max`. */
export function maxBirthDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localISODate(d);
}

// Date of birth: optional, but when filled must be before today.
// The backend enforces the same rule.
export const birthDateField = z
  .string()
  .optional()
  .refine((v) => !v || v < localISODate(), 'Date of birth must be before today');

export function isValidMobile(value: string | null | undefined): boolean {
  return !value || MOBILE_REGEX.test(value.trim());
}
