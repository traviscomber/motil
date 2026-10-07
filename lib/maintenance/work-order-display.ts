import type { Locale } from '@/lib/i18n/dictionaries';

export function formatWorkOrderNumber(value: string | null | undefined, locale: Locale) {
  const number = String(value || '').trim();
  if (!number) return locale === 'en' ? 'WO' : 'OT';
  if (locale === 'en') return number;
  return number.replace(/^WO-/i, 'OT-');
}

export function formatWorkOrderText(value: string | null | undefined, locale: Locale) {
  const text = String(value || '');
  if (locale === 'en') return text;
  return text.replace(/\bWO-(?=\d)/gi, 'OT-');
}
