// Utility functions for rotation management

import type { Rotation } from '../../../types/rotations';

/**
 * Get the localized name of a rotation based on language
 * @param rotation The rotation object
 * @param language The language code ('he' or 'en')
 * @returns The localized rotation name
 */
export function getRotationName(rotation: Rotation, language: string): string {
  if (language === 'he') {
    return (rotation as any).name_he || rotation.name_en || rotation.name;
  }
  return rotation.name_en || rotation.name;
}

/**
 * Convert various date formats to a Date object
 * @param value The value to convert (Date, Firestore Timestamp, string, etc.)
 * @returns A Date object or null if conversion fails
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date for display using locale-specific formatting
 * @param date The date to format
 * @param locale The locale code (e.g., 'en', 'he')
 * @returns A formatted date string or empty string if date is null
 */
export function formatDateLabel(date: Date | null, locale: string): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
