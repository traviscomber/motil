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
  expectedEvidence: string[];
  motilDomains: string[];
  sourceUrl: string;
  humanValidationRequired: true;
};

export const SERNAGEOMIN_OBLIGATIONS_POLICY = {
  boundary: 'This catalog is an operational checklist derived from official SERNAGEOMIN sources. It does not determine legal applicability or prove compliance.',
  applicability: 'Applicability must be validated against the current official rule, the specific faena, installation, project, production scale and operating condition.',
  evidence: 'MOTIL may link canonical evidence to an obligation, but only a qualified human reviewer may confirm applicability, fulfillment or non-fulfillment.',
} as const;

export const SERNAGEOMIN_OBLIGATIONS: readonly SernageominObligation[] = [
  {
    id: 'sernageomin-approved-project-and-closure-plan',
    authority: 'SERNAGEOMIN',
    title: 'Proyecto de explotación y plan de cierre aprobados antes de operar',
    legalBasis: ['DS 132', 'Ley 20.551'],
    cadence: 'before_operation',
    trigger: 'Inicio de una faena o modificación material que requiera aprobación sectorial',
    expectedEvidence: ['resolucion_aprobacion_proyecto', 'plan_cierre_aprobado', 'version_vigente', 'instalaciones_cubiertas'],
    motilDomains: ['projects', 'operations', 'closure', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-start-restart-notice',
    authority: 'SERNAGEOMIN',
    title: 'Aviso de inicio o reinicio de obras o actividades',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'event_driven',
    trigger: 'Inicio o reinicio de obras o actividades mineras',
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
    trigger: 'Accidente fatal o grave, o evento con alto potencial de dano personal o material',
    expectedEvidence: ['evento', 'clasificacion', 'aviso_inmediato', 'personas_afectadas', 'medidas_iniciales', 'investigacion'],
    motilDomains: ['hse', 'incidents', 'operations', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-monthly-accidentability',
    authority: 'SERNAGEOMIN',
    title: 'Declaracion mensual de accidentabilidad aplicable',
    legalBasis: ['SIMIN', 'formularios E-100/E-200/E-300'],
    cadence: 'monthly',
    trigger: 'Cierre del periodo mensual de reportabilidad',
    expectedEvidence: ['periodo', 'horas_hombre', 'dotacion', 'accidentes', 'formulario_presentado', 'acuse_o_respaldo'],
    motilDomains: ['hse', 'contractors', 'reporting', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-internal-critical-operation-rules',
    authority: 'SERNAGEOMIN',
    title: 'Reglamentos y procedimientos internos para operaciones criticas',
    legalBasis: ['DS 132'],
    cadence: 'continuous',
    trigger: 'Operacion de procesos criticos en la faena',
    expectedEvidence: ['reglamento_interno', 'procedimiento_vigente', 'aprobacion_si_corresponde', 'capacitacion', 'control_versiones'],
    motilDomains: ['hse', 'operations', 'maintenance', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-inspection-findings-response',
    authority: 'SERNAGEOMIN',
    title: 'Respuesta y cierre trazable de hallazgos de fiscalizacion',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'event_driven',
    trigger: 'Fiscalizacion, observacion o hallazgo emitido por SERNAGEOMIN',
    expectedEvidence: ['hallazgo', 'requerimiento', 'responsable', 'plan_accion', 'fecha_compromiso', 'evidencia_cierre', 'respuesta_presentada'],
    motilDomains: ['inspections', 'hse', 'tasks', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-book-registration',
    authority: 'SERNAGEOMIN',
    title: 'Autorizacion e inscripcion del Libro de SERNAGEOMIN cuando corresponda',
    legalBasis: ['Reglamento de Seguridad Minera', 'SIMIN'],
    cadence: 'lifecycle',
    trigger: 'Constitucion, inicio o condicion operacional que requiera libro autorizado',
    expectedEvidence: ['solicitud', 'autorizacion', 'identificacion_libro', 'faena', 'responsable', 'vigencia_o_estado'],
    motilDomains: ['operations', 'documents', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/simin/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-explosives-vehicle-authorization',
    authority: 'SERNAGEOMIN',
    title: 'Autorizacion de vehiculos para transporte de explosivos dentro de faena',
    legalBasis: ['Reglamento de Seguridad Minera'],
    cadence: 'lifecycle',
    trigger: 'Uso de un vehiculo para transporte de explosivos al interior de la faena',
    expectedEvidence: ['vehiculo', 'empresa', 'condiciones_seguridad', 'autorizacion', 'vigencia'],
    motilDomains: ['assets', 'explosives', 'hse', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-tailings-e700',
    authority: 'SERNAGEOMIN',
    title: 'Reporte E-700 para depositos de relaves cuando sea aplicable',
    legalBasis: ['DS 248', 'E-700'],
    cadence: 'quarterly',
    trigger: 'Operacion de deposito de relaves sujeto a reporte',
    expectedEvidence: ['periodo', 'estado_operacional', 'monitoreo_instrumental', 'inspecciones', 'variables_geotecnicas', 'formulario_presentado'],
    motilDomains: ['tailings', 'geotechnical', 'monitoring', 'inspections', 'legal'],
    sourceUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    humanValidationRequired: true,
  },
  {
    id: 'sernageomin-closure-lifecycle',
    authority: 'SERNAGEOMIN',
    title: 'Mantener plan de cierre coherente con la operacion y gestionar cierre temporal o definitivo',
    legalBasis: ['Ley 20.551', 'DS 132'],
    cadence: 'lifecycle',
    trigger: 'Cambio material de operacion, paralizacion temporal o termino de la faena',
    expectedEvidence: ['plan_cierre_vigente', 'medidas', 'cronograma', 'monitoreo', 'estabilidad_fisica', 'estabilidad_quimica', 'garantias_si_aplica'],
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
