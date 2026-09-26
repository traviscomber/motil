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
    auth: {
      login: {
        badge: 'Acceso seguro a Motil',
        heading: 'Gestión operacional conectada y trazable',
        subtitle:
          'Accede a producción, mantenimiento, inventario, HSE, documentos y control financiero desde un solo entorno.',
        cards: [
          { title: 'Operación diaria', text: 'Órdenes, activos, inventario y seguimiento en terreno.' },
          { title: 'Control y evidencia', text: 'Historial, documentos, permisos y decisiones trazables.' },
        ],
        benefits: [
          'Acceso centralizado para operación, mantención y gerencia',
          'Trazabilidad de acciones y evidencia de trabajo',
          'Contexto y permisos aplicados según el usuario',
        ],
        title: 'Iniciar sesión',
        cardDescription: 'Motil · Plataforma operacional',
        emailLabel: 'Correo electrónico',
        passwordLabel: 'Contraseña',
        submit: 'Iniciar sesión',
        submitting: 'Ingresando…',
        helpNote: 'Solicita acceso al administrador de tu organización cuando no tengas credenciales.',
        errors: {
          sessionExpired: 'Tu sesión expiró. Inicia sesión nuevamente.',
          sessionFailed:
            'Las credenciales fueron aceptadas, pero la sesión no pudo establecerse. Intenta nuevamente.',
          invalidCredentials: 'Credenciales inválidas',
          network: 'No fue posible conectar con el servicio de acceso. Intenta nuevamente.',
        },
      },
      register: {
        title: 'Crear cuenta',
        subtitle: 'Motil - Plataforma Operacional Minera',
        fullNameLabel: 'Nombre completo',
        emailLabel: 'Correo electrónico',
        passwordLabel: 'Contraseña',
        passwordHint: 'Mínimo 8 caracteres, mayúscula, número y símbolo (!@#$%^&*)',
        confirmLabel: 'Confirmar contraseña',
        submit: 'Crear cuenta',
        submitting: 'Registrando...',
        successTitle: '¡Registro exitoso!',
        successRedirect: 'Redirigiendo a inicio de sesión en 2 segundos...',
        hasAccount: '¿Ya tienes cuenta?',
        signInLink: 'Inicia sesión aquí',
        developedWith: 'Desarrollado con',
        errors: {
          allFields: 'Todos los campos son obligatorios',
          mismatch: 'Las contraseñas no coinciden',
          weakPrefix: 'Contraseña débil',
          signupFailed: 'Error al registrarse. Intenta de nuevo.',
        },
        passwordRules: {
          minChars: 'Mínimo 8 caracteres',
          upper: 'Debe contener mayúscula',
          number: 'Debe contener número',
          symbol: 'Debe contener símbolo (!@#$%^&*)',
        },
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
    auth: {
      login: {
        badge: 'Secure access to Motil',
        heading: 'Connected, traceable operational management',
        subtitle:
          'Access production, maintenance, inventory, HSE, documents and financial control from a single environment.',
        cards: [
          { title: 'Daily operations', text: 'Orders, assets, inventory and field tracking.' },
          { title: 'Control and evidence', text: 'History, documents, permissions and traceable decisions.' },
        ],
        benefits: [
          'Centralized access for operations, maintenance and management',
          'Traceability of actions and work evidence',
          'Context and permissions applied per user',
        ],
        title: 'Sign in',
        cardDescription: 'Motil · Operational platform',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        submit: 'Sign in',
        submitting: 'Signing in…',
        helpNote: 'Request access from your organization administrator if you do not have credentials.',
        errors: {
          sessionExpired: 'Your session expired. Sign in again.',
          sessionFailed:
            'Credentials were accepted, but the session could not be established. Try again.',
          invalidCredentials: 'Invalid credentials',
          network: 'Could not connect to the access service. Try again.',
        },
      },
      register: {
        title: 'Create account',
        subtitle: 'Motil - Mining Operations Platform',
        fullNameLabel: 'Full name',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        passwordHint: 'Minimum 8 characters, uppercase, number and symbol (!@#$%^&*)',
        confirmLabel: 'Confirm password',
        submit: 'Create account',
        submitting: 'Registering...',
        successTitle: 'Registration successful!',
        successRedirect: 'Redirecting to sign in in 2 seconds...',
        hasAccount: 'Already have an account?',
        signInLink: 'Sign in here',
        developedWith: 'Developed with',
        errors: {
          allFields: 'All fields are required',
          mismatch: 'Passwords do not match',
          weakPrefix: 'Weak password',
          signupFailed: 'Sign up failed. Please try again.',
        },
        passwordRules: {
          minChars: 'Minimum 8 characters',
          upper: 'Must contain an uppercase letter',
          number: 'Must contain a number',
          symbol: 'Must contain a symbol (!@#$%^&*)',
        },
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
