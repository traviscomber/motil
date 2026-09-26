// MOTIL i18n — diccionarios y helpers de locale.
//
// Paridad estricta: toda clave presente en `es` debe existir en `en` y
// viceversa. El test tests/i18n-foundation.test.mjs lo bloquea.

export const dictionaries = {
  es: {
    brand: {
      name: 'MOTIL',
      tagline: 'Mining Operating System',
    },
    nav: {
      system: 'Sistema',
      login: 'Ingresar',
    },
    common: {
      languageSwitch: 'EN',
    },
  },
  en: {
    brand: {
      name: 'MOTIL',
      tagline: 'Mining Operating System',
    },
    nav: {
      system: 'System',
      login: 'Sign in',
    },
    common: {
      languageSwitch: 'ES',
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];
export type Locale = keyof typeof dictionaries;

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'motil-locale';
export const LOCALE_HEADER = 'x-motil-locale';

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'es' || value === 'en';
}
