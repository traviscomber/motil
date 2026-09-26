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
      wordmarkLine: 'SISTEMA OPERATIVO PARA MINERÍA',
      ctaLogin: 'Ingresar a MOTIL',
      ctaExplore: 'Conocer el sistema',
      ctaContact: 'Hablar con N3URALIA',
      hero: {
        eyebrow: 'Sistema Operativo para Minería',
        h1Lines: ['Una operación.', 'Una sola fuente de verdad.', 'Mejores decisiones.'],
        body: 'MOTIL conecta personas, activos, producción, mantenimiento y evidencia operacional en un solo sistema operativo minero.',
      },
      context: {
        aria: 'Un solo contexto operacional',
        eyebrow: '01 — Un solo contexto operacional',
        h2Lines: ['De la operación', 'al ', 'impacto real.'],
        body: 'MOTIL conecta personas, activos, trabajo, materiales, producción, costo y riesgo en un solo contexto operacional.',
        pillars: [
          { title: 'Conectado', text: 'Un solo contexto operacional.' },
          { title: 'Trazable', text: 'La evidencia sigue cada acción.' },
          { title: 'Canónico', text: 'Una sola fuente de verdad.' },
        ],
      },
      mining: {
        aria: 'Construido para minería',
        eyebrow: '02 — Construido para minería',
        h2Lines: ['Operaciones reales.', 'Datos reales.', 'Decisiones reales.'],
        body: 'De la actividad en terreno a las decisiones de gerencia, MOTIL mantiene la operación conectada en un contexto compartido.',
        domains: [
          { title: 'Operaciones', items: 'Producción · Mantenimiento · Ejecución en terreno' },
          { title: 'Control', items: 'Activos · Materiales · Costo · Riesgo' },
          { title: 'Decisiones', items: 'Evidencia · Contexto · Acción' },
        ],
      },
      latam: {
        aria: 'Chile y LATAM',
        eyebrow: '03 — Chile / LATAM',
        h2Lines: ['Construido en Chile.', 'Diseñado para ', 'LATAM.'],
        body: 'Un sistema operativo para minería diseñado para operaciones reales, listo para escalar a faenas cada vez más conectadas.',
        meta: 'CHILE / PERU / LATAM',
      },
      flow: {
        labels: ['Personas', 'Activos', 'Trabajo', 'Materiales', 'Producción', 'Costo', 'Riesgo', 'Decisiones'],
      },
      footer: {
        areas: ['Personas', 'Activos', 'Operaciones', 'Impacto real'],
        areasAria: 'Áreas de impacto',
        by: 'Una solución de N3URALIA',
      },
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
    pages: {
      mineria: {
        meta: {
          title: 'Sistema Operativo para Minería en Chile',
          description:
            'MOTIL es un Sistema Operativo para Minería en Chile. Conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal bajo una misma trazabilidad operacional.',
          ogTitle: 'Sistema Operativo para Minería en Chile | MOTIL',
          ogDescription: 'Una capa operacional común para conectar la faena completa con trazabilidad, evidencia y control por área.',
        },
        eyebrow: 'Sistema Operativo para Minería · Chile',
        h1: 'Sistema Operativo para Minería en Chile',
        intro:
          'MOTIL conecta una operación minera completa: mina, planta, producción, mantenimiento, inventario, abastecimiento, personas, seguridad, finanzas y cumplimiento bajo una misma trazabilidad operacional.',
        pillars: [
          { title: 'Operación conectada', text: 'Conecta hechos de terreno con responsables, activos, turnos, órdenes, documentos y evidencia.' },
          { title: 'Una capa común', text: 'Cada área conserva su flujo, pero comparte contexto, identidad y trazabilidad con el resto de la faena.' },
          { title: 'Más allá del ERP', text: 'La arquitectura parte desde procesos mineros y operacionales, no desde un ERP horizontal adaptado después.' },
        ],
        modules: {
          title: 'Módulos del Sistema Operativo para Minería',
          intro: 'MOTIL cubre las áreas que sostienen la continuidad operacional y las conecta dentro de una misma arquitectura.',
          aria: 'Módulos de MOTIL Mining OS',
        },
        areas: [
          { name: 'Producción', slug: 'produccion', desc: 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje.' },
          { name: 'Mantenimiento', slug: 'mantenimiento', desc: 'OT, activos, planificación, vehículos, repuestos y Maestranza.' },
          { name: 'Inventario', slug: 'inventario', desc: 'Stock, reservas, repuestos, reposición y trazabilidad de materiales.' },
          { name: 'Compras', slug: 'compras', desc: 'Cotizaciones, comparación de proveedores y órdenes de compra.' },
          { name: 'Finanzas', slug: 'finanzas', desc: 'Costos, compromisos, centros de costo y trazabilidad financiera.' },
          { name: 'RRHH', slug: 'rrhh', desc: 'Personas, competencias, desempeño y evidencia laboral y operacional.' },
          { name: 'Sostenibilidad', slug: 'sostenibilidad', desc: 'HSE, prevención de riesgos, EPP, ambiente, comunidades y cumplimiento.' },
          { name: 'Legal', slug: 'legal', desc: 'Contratos, documentos, permisos, vencimientos y cumplimiento.' },
        ],
        traceability: {
          title: 'Trazabilidad operacional',
          text: 'Cada módulo conserva su responsabilidad, pero conecta personas, activos, órdenes, evidencia, documentos y centros de costo mediante identificadores canónicos.',
        },
        implementation: {
          title: 'Implementación modular',
          text: 'Una operación puede habilitar las áreas que necesita y ampliar cobertura sin construir sistemas paralelos ni perder historial.',
        },
        vsErp: {
          title: 'Sistema Operativo para Minería versus ERP minero',
          text: 'MOTIL incluye capacidades administrativas presentes en un ERP, pero su propuesta principal es operacional. El sistema conecta producción, mantenimiento, activos, HSE, personas, abastecimiento, costos, evidencia y contexto para que la gestión conserve la realidad de la faena.',
        },
        gestionLayer: {
          title: 'Software de gestión minera como capa del sistema',
          text: 'Las funciones de software minero, gestión, mantenimiento, producción e inventario siguen siendo parte de MOTIL y ayudan a capturar búsquedas existentes. La categoría superior, sin embargo, es Sistema Operativo para Minería.',
        },
        faq: {
          title: 'Preguntas sobre Sistemas Operativos para Minería',
          items: [
            {
              q: '¿Qué es un Sistema Operativo para Minería?',
              a: 'Es una capa operacional que conecta procesos, personas, activos, datos, evidencia y decisiones de una faena bajo una misma arquitectura. MOTIL organiza esas relaciones entre áreas mineras y administrativas sin reducir la operación a un ERP horizontal.',
            },
            {
              q: '¿Qué es MOTIL Mining OS?',
              a: 'MOTIL es un Sistema Operativo para Minería desarrollado por Neuralia en Chile. Su foco es conectar la operación y mantener continuidad entre los datos de terreno, la gestión y la decisión.',
            },
            {
              q: '¿En qué se diferencia de un ERP minero?',
              a: 'Un ERP se concentra principalmente en procesos administrativos y transaccionales. MOTIL parte desde la operación minera y conecta producción, mantenimiento, activos, HSE, personas, abastecimiento, costos y evidencia bajo una misma trazabilidad.',
            },
            {
              q: '¿Incluye software de gestión minera?',
              a: 'Sí. Las capacidades de gestión forman parte del sistema, pero no definen la categoría completa. MOTIL busca operar como una capa superior que conecta gestión, operación, evidencia e inteligencia minera.',
            },
            {
              q: '¿Se puede implementar por módulos?',
              a: 'Sí. Producción, Mantenimiento, Inventario, Compras, Finanzas, RRHH, Sostenibilidad y Legal funcionan como módulos conectados bajo una arquitectura común.',
            },
          ],
        },
        closing: {
          title: 'MOTIL Mining OS',
          text: 'Sistema Operativo para Minería desarrollado por Neuralia en Chile: una capa común para conectar información de terreno, evidencia, procesos y decisiones entre áreas.',
          cta: 'Ingresar a MOTIL',
        },
      },
      modulos: {
        chrome: {
          eyebrow: 'Módulo MOTIL · Minería Chile',
          capabilities: 'Capacidades principales',
          integration: 'Cómo se integra en la operación minera',
          connectedTitle: 'Conectado al Mining OS',
          connectedText: 'El módulo comparte contexto con las demás áreas habilitadas sin duplicar la fuente de verdad operacional.',
          traceTitle: 'Trazabilidad operacional',
          traceText: 'Las acciones relevantes mantienen historial y evidencia para revisión operacional, auditoría y toma de decisiones.',
          closingTitle: 'Software minero conectado para Chile',
          closingLead: 'forma parte de MOTIL Mining OS, una plataforma modular para conectar producción, mantenimiento, inventario, compras, finanzas, RRHH, sostenibilidad HSE y legal bajo una trazabilidad común.',
          linkChile: 'Software para minería en Chile',
          linkAll: 'Ver todos los módulos',
          metaTitleSuffix: 'en Chile',
          metaDescriptionSuffix: 'Parte de MOTIL Mining OS para operaciones mineras en Chile.',
        },
        items: {
          produccion: {
            name: 'Producción Minera',
            title: 'Software de producción minera',
            description: 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje conectados a la trazabilidad operacional.',
            capabilities: ['Transporte de Mineral', 'Planta y metalurgia', 'Geología y topografía', 'Química', 'Sondaje de producción y exploración'],
            operations: [
              'Conecta el movimiento de mineral con los registros de planta y el contexto de la operación.',
              'Mantiene información de geología, topografía, química y sondaje dentro del mismo entorno operacional.',
              'Relaciona la evidencia de producción con personas, equipos, turnos y áreas responsables cuando esos datos están disponibles.',
            ],
            outcome: 'El objetivo es reducir registros aislados entre mina y planta y mantener continuidad desde el dato capturado en terreno hasta su revisión operacional.',
          },
          mantenimiento: {
            name: 'Mantenimiento Minero',
            title: 'Software de mantenimiento minero',
            description: 'Órdenes de trabajo, activos móviles y estáticos, planificación, vehículos, historial técnico y Maestranza.',
            capabilities: ['Órdenes de trabajo', 'Equipos móviles y estáticos', 'Vehículos', 'Planificación preventiva', 'Maestranza e historial'],
            operations: [
              'Organiza órdenes de trabajo y las vincula con el activo, responsables, planificación y evidencia de ejecución.',
              'Mantiene historial técnico para equipos móviles, equipos estáticos y vehículos dentro del contexto de la faena.',
              'Conecta mantenimiento preventivo, trabajo de taller y consumo de repuestos con las áreas habilitadas del Mining OS.',
            ],
            outcome: 'La operación puede seguir el ciclo de mantenimiento con una trazabilidad común, evitando que planificación, ejecución, activos y evidencia queden repartidos en sistemas separados.',
          },
          inventario: {
            name: 'Inventario Minero',
            title: 'Inventario y repuestos para minería',
            description: 'Stock, reservas, movimientos, reposición y trazabilidad de repuestos y materiales para la operación.',
            capabilities: ['Stock y movimientos', 'Reservas', 'Reposición', 'Repuestos críticos', 'Historial de consumo'],
            operations: ['Mantiene stock y movimientos con trazabilidad.', 'Relaciona reservas y reposición con necesidades operacionales.', 'Conserva historial de consumo de repuestos y materiales.'],
            outcome: 'Inventario comparte contexto con las áreas habilitadas para sostener una fuente común de información operacional.',
          },
          compras: {
            name: 'Compras Mineras',
            title: 'Compras y proveedores para minería',
            description: 'Cotizaciones, comparación de proveedores, órdenes de compra y seguimiento del abastecimiento.',
            capabilities: ['Cotizaciones', 'Comparación de proveedores', 'Órdenes de compra', 'Proveedores aprobados', 'Seguimiento'],
            operations: ['Ordena solicitudes y cotizaciones.', 'Permite comparar alternativas de proveedores.', 'Mantiene seguimiento de órdenes y abastecimiento.'],
            outcome: 'Compras conecta el abastecimiento con la necesidad operacional que le dio origen cuando ese contexto está disponible.',
          },
          finanzas: {
            name: 'Finanzas Mineras',
            title: 'Control financiero para operaciones mineras',
            description: 'Costos, compromisos, centros de costo y trazabilidad financiera conectados a la operación.',
            capabilities: ['Centros de costo', 'Compromisos', 'Costos operacionales', 'Trazabilidad financiera', 'Resumen certificado'],
            operations: ['Organiza costos y compromisos.', 'Relaciona información con centros de costo.', 'Mantiene trazabilidad entre hechos operacionales y su contexto financiero.'],
            outcome: 'Finanzas permite revisar el impacto económico de la operación sin separar la información de su origen operacional.',
          },
          rrhh: {
            name: 'RRHH Minería',
            title: 'RRHH y desempeño para minería',
            description: 'Personas, asignaciones laborales, competencias, desempeño, evidencia operacional y ficha laboral 360°.',
            capabilities: ['Ficha laboral 360°', 'Competencias y credenciales', 'Desempeño', 'Evidencia operacional', 'Historial laboral'],
            operations: ['Concentra información laboral relevante.', 'Relaciona competencias y credenciales con las personas.', 'Conserva evidencia e historial dentro de los permisos definidos.'],
            outcome: 'RRHH conecta el contexto de las personas con la operación sin duplicar la fuente de verdad laboral.',
          },
          sostenibilidad: {
            name: 'Sostenibilidad y HSE',
            title: 'HSE y sostenibilidad para minería',
            description: 'Prevención de riesgos, inspecciones, EPP, medio ambiente, comunidades y cumplimiento en una misma área.',
            capabilities: ['Prevención de riesgos', 'Inspecciones', 'EPP', 'Medio ambiente', 'Comunidades y cumplimiento'],
            operations: ['Ordena evidencia de prevención e inspecciones.', 'Mantiene contexto de EPP y seguridad.', 'Conecta registros ambientales, comunidades y cumplimiento según los flujos habilitados.'],
            outcome: 'Sostenibilidad mantiene evidencia revisable y conectada con el contexto operacional correspondiente.',
          },
          legal: {
            name: 'Legal Minería',
            title: 'Contratos y cumplimiento para minería',
            description: 'Contratos, documentos, permisos, vencimientos y cumplimiento con trazabilidad documental.',
            capabilities: ['Contratos', 'Documentos', 'Permisos y licencias', 'Vencimientos', 'Cumplimiento'],
            operations: ['Centraliza documentos y contratos.', 'Mantiene seguimiento de permisos, licencias y vencimientos.', 'Relaciona evidencia documental con responsables y áreas cuando corresponde.'],
            outcome: 'Legal mantiene continuidad documental y trazabilidad sin reemplazar la revisión profesional o regulatoria que corresponda.',
          },
        },
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
      wordmarkLine: 'MINING OPERATING SYSTEM',
      ctaLogin: 'Sign in to MOTIL',
      ctaExplore: 'Explore the system',
      ctaContact: 'Talk to N3URALIA',
      hero: {
        eyebrow: 'Mining Operating System',
        h1Lines: ['One operation.', 'One source of truth.', 'Better decisions.'],
        body: 'MOTIL connects people, assets, production, maintenance and operational evidence in one mining operating system.',
      },
      context: {
        aria: 'One operating context',
        eyebrow: '01 — One operating context',
        h2Lines: ['From operations', 'to ', 'real impact.'],
        body: 'MOTIL connects people, assets, work, materials, production, cost and risk in one operational context.',
        pillars: [
          { title: 'Connected', text: 'One operational context.' },
          { title: 'Traceable', text: 'Evidence follows every action.' },
          { title: 'Canonical', text: 'One source of truth.' },
        ],
      },
      mining: {
        aria: 'Built for mining',
        eyebrow: '02 — Built for mining',
        h2Lines: ['Real operations.', 'Real data.', 'Real decisions.'],
        body: 'From field activity to management decisions, MOTIL keeps the operation connected in one shared context.',
        domains: [
          { title: 'Operations', items: 'Production · Maintenance · Field execution' },
          { title: 'Control', items: 'Assets · Materials · Cost · Risk' },
          { title: 'Decisions', items: 'Evidence · Context · Action' },
        ],
      },
      latam: {
        aria: 'Chile and LATAM',
        eyebrow: '03 — Chile / LATAM',
        h2Lines: ['Built in Chile.', 'Designed for ', 'LATAM.'],
        body: 'A mining operating system designed for real operations, ready to scale across increasingly connected sites.',
        meta: 'CHILE / PERU / LATAM',
      },
      flow: {
        labels: ['People', 'Assets', 'Work', 'Materials', 'Production', 'Cost', 'Risk', 'Decisions'],
      },
      footer: {
        areas: ['People', 'Assets', 'Operations', 'Real impact'],
        areasAria: 'Areas of impact',
        by: 'A solution by N3URALIA',
      },
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
    pages: {
      mineria: {
        meta: {
          title: 'Mining Operating System in Chile',
          description:
            'MOTIL is a Mining Operating System in Chile. It connects production, maintenance, inventory, procurement, finance, HR, HSE and legal under one operational traceability.',
          ogTitle: 'Mining Operating System in Chile | MOTIL',
          ogDescription: 'A common operational layer to connect the entire mine site with traceability, evidence and per-area control.',
        },
        eyebrow: 'Mining Operating System · Chile',
        h1: 'Mining Operating System in Chile',
        intro:
          'MOTIL connects a complete mining operation: mine, plant, production, maintenance, inventory, procurement, people, safety, finance and compliance under one operational traceability.',
        pillars: [
          { title: 'Connected operation', text: 'Connects field facts with owners, assets, shifts, work orders, documents and evidence.' },
          { title: 'A common layer', text: 'Each area keeps its own workflow but shares context, identity and traceability with the rest of the site.' },
          { title: 'Beyond ERP', text: 'The architecture starts from mining and operational processes, not from a horizontal ERP adapted afterwards.' },
        ],
        modules: {
          title: 'Mining Operating System modules',
          intro: 'MOTIL covers the areas that sustain operational continuity and connects them within one architecture.',
          aria: 'MOTIL Mining OS modules',
        },
        areas: [
          { name: 'Production', slug: 'produccion', desc: 'Ore haulage, plant, metallurgy, geology, surveying, chemistry and drilling.' },
          { name: 'Maintenance', slug: 'mantenimiento', desc: 'Work orders, assets, planning, vehicles, spare parts and workshop.' },
          { name: 'Inventory', slug: 'inventario', desc: 'Stock, reservations, spare parts, replenishment and materials traceability.' },
          { name: 'Procurement', slug: 'compras', desc: 'Quotes, supplier comparison and purchase orders.' },
          { name: 'Finance', slug: 'finanzas', desc: 'Costs, commitments, cost centers and financial traceability.' },
          { name: 'HR', slug: 'rrhh', desc: 'People, competencies, performance and operational and labor evidence.' },
          { name: 'Sustainability', slug: 'sostenibilidad', desc: 'HSE, risk prevention, PPE, environment, communities and compliance.' },
          { name: 'Legal', slug: 'legal', desc: 'Contracts, documents, permits, expirations and compliance.' },
        ],
        traceability: {
          title: 'Operational traceability',
          text: 'Each module keeps its own responsibility while connecting people, assets, work orders, evidence, documents and cost centers through canonical identifiers.',
        },
        implementation: {
          title: 'Modular implementation',
          text: 'An operation can enable the areas it needs and expand coverage without building parallel systems or losing history.',
        },
        vsErp: {
          title: 'Mining Operating System vs mining ERP',
          text: 'MOTIL includes administrative capabilities found in an ERP, but its core proposal is operational. The system connects production, maintenance, assets, HSE, people, procurement, costs, evidence and context so management keeps the reality of the mine site.',
        },
        gestionLayer: {
          title: 'Mining management software as a system layer',
          text: 'Mining software, management, maintenance, production and inventory functions remain part of MOTIL and capture existing searches. The higher category, however, is Mining Operating System.',
        },
        faq: {
          title: 'Questions about Mining Operating Systems',
          items: [
            {
              q: 'What is a Mining Operating System?',
              a: 'It is an operational layer that connects processes, people, assets, data, evidence and decisions of a mine site under one architecture. MOTIL organizes those relationships across mining and administrative areas without reducing the operation to a horizontal ERP.',
            },
            {
              q: 'What is MOTIL Mining OS?',
              a: 'MOTIL is a Mining Operating System developed by Neuralia in Chile. Its focus is connecting the operation and maintaining continuity between field data, management and decision-making.',
            },
            {
              q: 'How is it different from a mining ERP?',
              a: 'An ERP focuses mainly on administrative and transactional processes. MOTIL starts from the mining operation and connects production, maintenance, assets, HSE, people, procurement, costs and evidence under one traceability.',
            },
            {
              q: 'Does it include mining management software?',
              a: 'Yes. Management capabilities are part of the system, but they do not define the whole category. MOTIL operates as a higher layer connecting management, operations, evidence and mining intelligence.',
            },
            {
              q: 'Can it be implemented by modules?',
              a: 'Yes. Production, Maintenance, Inventory, Procurement, Finance, HR, Sustainability and Legal work as connected modules under a common architecture.',
            },
          ],
        },
        closing: {
          title: 'MOTIL Mining OS',
          text: 'Mining Operating System developed by Neuralia in Chile: a common layer to connect field information, evidence, processes and decisions across areas.',
          cta: 'Sign in to MOTIL',
        },
      },
      modulos: {
        chrome: {
          eyebrow: 'MOTIL module · Mining Chile',
          capabilities: 'Core capabilities',
          integration: 'How it integrates into the mining operation',
          connectedTitle: 'Connected to the Mining OS',
          connectedText: 'The module shares context with the other enabled areas without duplicating the operational source of truth.',
          traceTitle: 'Operational traceability',
          traceText: 'Relevant actions keep history and evidence for operational review, audit and decision-making.',
          closingTitle: 'Connected mining software for Chile',
          closingLead: 'is part of MOTIL Mining OS, a modular platform connecting production, maintenance, inventory, procurement, finance, HR, HSE sustainability and legal under common traceability.',
          linkChile: 'Mining software in Chile',
          linkAll: 'View all modules',
          metaTitleSuffix: 'in Chile',
          metaDescriptionSuffix: 'Part of MOTIL Mining OS for mining operations in Chile.',
        },
        items: {
          produccion: {
            name: 'Mining Production',
            title: 'Mining production software',
            description: 'Ore haulage, plant, metallurgy, geology, surveying, chemistry and drilling connected to operational traceability.',
            capabilities: ['Ore haulage', 'Plant and metallurgy', 'Geology and surveying', 'Chemistry', 'Production and exploration drilling'],
            operations: [
              'Connects ore movement with plant records and the operation context.',
              'Keeps geology, surveying, chemistry and drilling information within the same operational environment.',
              'Relates production evidence with people, equipment, shifts and responsible areas when that data is available.',
            ],
            outcome: 'The goal is to reduce isolated records between mine and plant and keep continuity from the field-captured data to its operational review.',
          },
          mantenimiento: {
            name: 'Mining Maintenance',
            title: 'Mining maintenance software',
            description: 'Work orders, mobile and fixed assets, planning, vehicles, technical history and workshop.',
            capabilities: ['Work orders', 'Mobile and fixed equipment', 'Vehicles', 'Preventive planning', 'Workshop and history'],
            operations: [
              'Organizes work orders and links them with the asset, owners, planning and execution evidence.',
              'Keeps technical history for mobile equipment, fixed equipment and vehicles within the site context.',
              'Connects preventive maintenance, shop work and spare parts consumption with the enabled Mining OS areas.',
            ],
            outcome: 'The operation can follow the maintenance cycle with common traceability, avoiding planning, execution, assets and evidence scattered across separate systems.',
          },
          inventario: {
            name: 'Mining Inventory',
            title: 'Inventory and spare parts for mining',
            description: 'Stock, reservations, movements, replenishment and traceability of spare parts and materials for the operation.',
            capabilities: ['Stock and movements', 'Reservations', 'Replenishment', 'Critical spare parts', 'Consumption history'],
            operations: ['Keeps stock and movements with traceability.', 'Relates reservations and replenishment with operational needs.', 'Preserves spare parts and materials consumption history.'],
            outcome: 'Inventory shares context with the enabled areas to sustain a common source of operational information.',
          },
          compras: {
            name: 'Mining Procurement',
            title: 'Procurement and suppliers for mining',
            description: 'Quotes, supplier comparison, purchase orders and supply chain follow-up.',
            capabilities: ['Quotes', 'Supplier comparison', 'Purchase orders', 'Approved suppliers', 'Follow-up'],
            operations: ['Organizes requests and quotes.', 'Allows comparing supplier alternatives.', 'Keeps purchase orders and supply follow-up.'],
            outcome: 'Procurement connects supply with the operational need that originated it when that context is available.',
          },
          finanzas: {
            name: 'Mining Finance',
            title: 'Financial control for mining operations',
            description: 'Costs, commitments, cost centers and financial traceability connected to the operation.',
            capabilities: ['Cost centers', 'Commitments', 'Operational costs', 'Financial traceability', 'Certified summary'],
            operations: ['Organizes costs and commitments.', 'Relates information with cost centers.', 'Keeps traceability between operational facts and their financial context.'],
            outcome: 'Finance can review the economic impact of the operation without separating information from its operational origin.',
          },
          rrhh: {
            name: 'Mining HR',
            title: 'HR and performance for mining',
            description: 'People, work assignments, competencies, performance, operational evidence and 360° work record.',
            capabilities: ['360° work record', 'Competencies and credentials', 'Performance', 'Operational evidence', 'Work history'],
            operations: ['Concentrates relevant work information.', 'Relates competencies and credentials with people.', 'Preserves evidence and history within defined permissions.'],
            outcome: 'HR connects the context of people with the operation without duplicating the labor source of truth.',
          },
          sostenibilidad: {
            name: 'Sustainability and HSE',
            title: 'HSE and sustainability for mining',
            description: 'Risk prevention, inspections, PPE, environment, communities and compliance in one area.',
            capabilities: ['Risk prevention', 'Inspections', 'PPE', 'Environment', 'Communities and compliance'],
            operations: ['Organizes prevention and inspection evidence.', 'Keeps PPE and safety context.', 'Connects environmental records, communities and compliance according to enabled workflows.'],
            outcome: 'Sustainability keeps reviewable evidence connected to the corresponding operational context.',
          },
          legal: {
            name: 'Mining Legal',
            title: 'Contracts and compliance for mining',
            description: 'Contracts, documents, permits, expirations and compliance with document traceability.',
            capabilities: ['Contracts', 'Documents', 'Permits and licenses', 'Expirations', 'Compliance'],
            operations: ['Centralizes documents and contracts.', 'Keeps permits, licenses and expirations follow-up.', 'Relates document evidence with owners and areas when relevant.'],
            outcome: 'Legal maintains document continuity and traceability without replacing the professional or regulatory review that applies.',
          },
        },
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
