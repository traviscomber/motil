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
    landing: {
      ctaLogin: 'Ingresar a MOTIL',
      ctaExplore: 'Conocer el sistema',
      ctaContact: 'Hablar con N3URALIA',
      alts: {
        flow: 'Flujo operacional: personas, activos, trabajo, materiales, producción, costo, riesgo y decisiones conectados en una línea',
        truck: 'Camión de acarreo minero en ruta de faena al atardecer, con montañas oscuras al fondo',
        map: 'Sudamérica esculpida en piedra mineral oscura con vetas de cobre',
      },
      seo: {
        description:
          'Sistema Operativo para Minería en Chile que conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal con trazabilidad operacional.',
        orgDescription: 'Empresa chilena de desarrollo de software e inteligencia artificial, creadora de MOTIL Mining OS.',
      },
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
    landing: {
      ctaLogin: 'Sign in to MOTIL',
      ctaExplore: 'Explore the system',
      ctaContact: 'Talk to N3URALIA',
      alts: {
        flow: 'Operational flow: people, assets, work, materials, production, cost, risk and decisions connected in one line',
        truck: 'Mining haul truck on a site road at dusk, with dark mountains in the background',
        map: 'South America sculpted in dark mineral stone with copper veins',
      },
      seo: {
        description:
          'Mining Operating System in Chile connecting production, maintenance, inventory, procurement, finance, HR, HSE and legal with operational traceability.',
        orgDescription: 'Chilean software and artificial intelligence company, creator of MOTIL Mining OS.',
      },
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
