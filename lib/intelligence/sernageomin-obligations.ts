export type SernageominObligationCadence =
  | 'before_operation'
  | 'event_driven'
  | 'monthly'
  | 'quarterly'
  | 'continuous'
  | 'lifecycle';

export type SernageominObligation = {
  id: string;
  authority: 'SERNAGEOMIN';
  title: string;
  legalBasis: string[];
  cadence: SernageominObligationCadence;
  trigger: string;
  applicabilityNote: string;
  timingRule: string;
  responsibleFunctions: string[];
  expectedEvidence: string[];
  motilDomains: string[];
  sourceUrl: string;
  humanValidationRequired: true;
};

export const SERNAGEOMIN_OBLIGATIONS_POLICY = {
  boundary: 'This catalog is an operational checklist derived from official SERNAGEOMIN sources. It does not determine legal applicability or prove compliance.',
  applicability: 'Applicability must be validated against the current official rule, the specific faena, installation, project, production scale and operating condition.',
  evidence: 'MOTIL may link canonical evidence to an obligation, but only a qualified human reviewer may confirm applicability, fulfillment or non-fulfillment.',
  timing: 'A timing rule is only stated as exact when supported by an official source. Otherwise MOTIL must show the operational frequency and require human validation of the legal deadline.',
} as const;

export const SERNAGEOMIN_OBLIGATIONS: readonly SernageominObligation[] = [
  {
    id: 'sernageomin-approved-project-and-closure-plan',
    authority: 'SERNAGEOMIN',
    title: 'Proyecto de explotación y plan de cierre antes de operar',
    legalBasis: ['DS 132', 'Ley 20.551', 'DS 41'],
    cadence: 'before_operation',
    trigger: 'Inicio de una faena o modificación material del proyecto minero',
    applicabilityNote: 'La ruta exacta depende de escala, instalación y tipo de proyecto. Para faenas hasta 1.000 t/mes existe Declaración Minera; sobre ese umbral aplican las rutas de proyecto y cierre que correspondan.',
    timingRule: 'Previo al inicio de operación; validar procedimiento y resolución aplicable.',
    responsibleFunctions: ['Operaciones', 'Legal', 'Planificación minera'],
    expectedEvidence: ['resolucion_aprobacion_proyecto', 'plan_cierre_aprobado', 'version_vigente', 'instalaciones_cubiertas'],
    motilDomains: ['projects', 'operations', 'closure', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/proyectos-mineros/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-start-restart-notice',
    authority: 'SERNAGEOMIN',
    title: 'Aviso de inicio o reinicio de obras o actividades',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'event_driven',
    trigger: 'Inicio o reinicio de obras o actividades mineras',
    applicabilityNote: 'SIMIN contempla avisos para empresas mandantes y contratistas; validar formulario y anticipación aplicable a la faena.',
    timingRule: 'Antes de iniciar o reiniciar; validar anticipación exigible según régimen aplicable.',
    responsibleFunctions: ['Operaciones', 'Legal', 'HSE'],
    expectedEvidence: ['aviso_presentado', 'fecha_presentacion', 'faena', 'empresa_mandante_o_contratista', 'responsable'],
    motilDomains: ['operations', 'contractors', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-accident-high-potential-notice',
    authority: 'SERNAGEOMIN',
    title: 'Aviso de accidente fatal, grave o evento de alto potencial',
    legalBasis: ['DS 132 art. 23', 'Reglamento de Seguridad Minera'],
    cadence: 'event_driven',
    trigger: 'Accidente fatal o grave, o evento con alto potencial de daño personal o material',
    applicabilityNote: 'La clasificación del evento y las obligaciones posteriores requieren validación HSE/legal.',
    timingRule: 'Aviso inmediato y dentro de 24 horas. Para productores sobre 500 t/mes, informe técnico de investigación dentro de 15 días.',
    responsibleFunctions: ['HSE', 'Operaciones', 'Legal'],
    expectedEvidence: ['evento', 'clasificacion', 'aviso_sernageomin', 'fecha_hora_aviso', 'personas_afectadas', 'medidas_iniciales', 'informe_investigacion'],
    motilDomains: ['hse', 'incidents', 'operations', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-monthly-accidentability',
    authority: 'SERNAGEOMIN',
    title: 'Declaración mensual de accidentabilidad y producción aplicable',
    legalBasis: ['SIMIN', 'formularios E-100/E-200/E-300'],
    cadence: 'monthly',
    trigger: 'Cierre del período mensual de reportabilidad',
    applicabilityNote: 'SIMIN dispone formularios según tipo de empresa y actividad. Debe validarse cuál corresponde a la organización y faena.',
    timingRule: 'Mensual; validar fecha de corte y presentación aplicable.',
    responsibleFunctions: ['HSE', 'Operaciones', 'RRHH'],
    expectedEvidence: ['periodo', 'horas_hombre', 'dotacion', 'accidentes', 'produccion_si_aplica', 'formulario_presentado', 'acuse_o_respaldo'],
    motilDomains: ['hse', 'contractors', 'production', 'reporting', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-internal-critical-operation-rules',
    authority: 'SERNAGEOMIN',
    title: 'Reglamentos y procedimientos internos de operaciones críticas',
    legalBasis: ['DS 132'],
    cadence: 'continuous',
    trigger: 'Operación de procesos o actividades críticas reguladas por el Reglamento de Seguridad Minera',
    applicabilityNote: 'El set de procedimientos exigibles depende del método, instalaciones, equipos y riesgos de la faena.',
    timingRule: 'Vigentes durante la operación y actualizados cuando cambie el proceso o riesgo.',
    responsibleFunctions: ['HSE', 'Operaciones', 'Mantenimiento'],
    expectedEvidence: ['reglamento_interno', 'procedimiento_vigente', 'aprobacion_si_corresponde', 'capacitacion', 'control_versiones'],
    motilDomains: ['hse', 'operations', 'maintenance', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-inspection-findings-response',
    authority: 'SERNAGEOMIN',
    title: 'Respuesta y cierre trazable de hallazgos de fiscalización',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'event_driven',
    trigger: 'Fiscalización, observación o hallazgo emitido por SERNAGEOMIN',
    applicabilityNote: 'Cada requerimiento puede contener un plazo específico. MOTIL debe preservar el documento fuente y su fecha de notificación.',
    timingRule: 'Según requerimiento/notificación de SERNAGEOMIN; no inferir plazo si no está en la evidencia.',
    responsibleFunctions: ['Legal', 'HSE', 'Responsable de instalación'],
    expectedEvidence: ['hallazgo', 'notificacion', 'requerimiento', 'responsable', 'plan_accion', 'fecha_compromiso', 'evidencia_cierre', 'respuesta_presentada'],
    motilDomains: ['inspections', 'hse', 'tasks', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-book-registration',
    authority: 'SERNAGEOMIN',
    title: 'Autorización e inscripción del Libro de SERNAGEOMIN cuando corresponda',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'lifecycle',
    trigger: 'Constitución, inicio o condición operacional que requiera libro autorizado',
    applicabilityNote: 'Validar exigibilidad para la faena y estado actual del libro.',
    timingRule: 'Antes de requerirse operacionalmente; mantener trazabilidad de autorización y estado.',
    responsibleFunctions: ['Legal', 'Operaciones'],
    expectedEvidence: ['solicitud', 'autorizacion', 'identificacion_libro', 'faena', 'responsable', 'vigencia_o_estado'],
    motilDomains: ['operations', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-explosives-vehicle-authorization',
    authority: 'SERNAGEOMIN',
    title: 'Autorización de vehículos para transporte de explosivos dentro de faena',
    legalBasis: ['Reglamento de Seguridad Minera'],
    cadence: 'lifecycle',
    trigger: 'Uso de un vehículo para transporte de explosivos al interior de la faena',
    applicabilityNote: 'Aplica cuando la operación utilice vehículos para transporte interno de explosivos; validar además requisitos de otras autoridades competentes.',
    timingRule: 'Antes de utilizar el vehículo para esta función.',
    responsibleFunctions: ['HSE', 'Operaciones', 'Activos'],
    expectedEvidence: ['vehiculo', 'empresa', 'condiciones_seguridad', 'autorizacion', 'vigencia'],
    motilDomains: ['assets', 'explosives', 'hse', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-tailings-e700',
    authority: 'SERNAGEOMIN',
    title: 'Reporte E-700 para depósitos de relaves cuando sea aplicable',
    legalBasis: ['DS 248', 'E-700'],
    cadence: 'quarterly',
    trigger: 'Operación de depósito de relaves sujeto a reporte',
    applicabilityNote: 'Existen formularios E-700 diferenciados por tipo de depósito. Debe seleccionarse el que corresponda a la instalación.',
    timingRule: 'Trimestral; validar período y fecha de presentación aplicables.',
    responsibleFunctions: ['Operaciones', 'Geotecnia', 'HSE'],
    expectedEvidence: ['periodo', 'estado_operacional', 'monitoreo_instrumental', 'inspecciones', 'variables_geotecnicas', 'formulario_presentado'],
    motilDomains: ['tailings', 'geotechnical', 'monitoring', 'inspections', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-closure-lifecycle',
    authority: 'SERNAGEOMIN',
    title: 'Plan de cierre vigente y coherente con la operación',
    legalBasis: ['Ley 20.551', 'DS 41'],
    cadence: 'lifecycle',
    trigger: 'Inicio/reinicio, modificación material, paralización temporal, cierre parcial/definitivo o cambio relevante del plan',
    applicabilityNote: 'El procedimiento y exigencias cambian según capacidad, condición de cierre e instalaciones. Para aplicación general deben controlarse además riesgo, estabilidad, vida útil, valorización y garantías.',
    timingRule: 'Durante todo el ciclo de vida; los hitos concretos dependen del procedimiento y resolución vigente.',
    responsibleFunctions: ['Legal', 'Planificación minera', 'Finanzas', 'HSE'],
    expectedEvidence: ['plan_cierre_vigente', 'resolucion', 'medidas', 'cronograma', 'monitoreo', 'estabilidad_fisica', 'estabilidad_quimica', 'valorizacion', 'garantias_si_aplica'],
    motilDomains: ['closure', 'risk', 'finance', 'monitoring', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/planes-de-cierre/',
    humanValidationRequired: true,
  },
];

export function listSernageominObligations(domain?: string) {
  const normalized = domain?.trim().toLowerCase();
  if (!normalized) return SERNAGEOMIN_OBLIGATIONS;
  return SERNAGEOMIN_OBLIGATIONS.filter((item) =>
    item.motilDomains.some((candidate) => candidate.toLowerCase() === normalized),
  );
}
