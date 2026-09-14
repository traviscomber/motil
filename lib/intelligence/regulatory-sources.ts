export type RegulatoryAuthority = 'SERNAGEOMIN';
export type RegulatoryEvidenceClass = 'regulatory_knowledge' | 'external_reference';
export type RegulatorySourceType = 'resolution' | 'regulation' | 'form_family' | 'guide' | 'procedure' | 'statistics' | 'viewer';
export type RegulatorySourceStatus = 'active_reference' | 'pending_exact_extraction';

export type RegulatorySource = {
  id: string;
  authority: RegulatoryAuthority;
  title: string;
  sourceType: RegulatorySourceType;
  evidenceClass: RegulatoryEvidenceClass;
  canonicalUrl: string;
  versionOrResolution: string | null;
  effectiveDate: string | null;
  lastReviewedAt: string;
  domains: string[];
  status: RegulatorySourceStatus;
  notes: string;
};

export type Res0886TaxonomyEnvelope = {
  sourceId: 'sernageomin-res-0886-2025';
  purpose: 'installation_breakdown_reference';
  canonicalEntityBoundary: 'reference_only';
  mappingPolicy: 'never_overwrite_company_identifiers';
  reviewPolicy: 'human_review_required';
  taxonomyStatus: 'pending_exact_extraction';
  requiredMappingFields: readonly [
    'regulatory_code', 'regulatory_label', 'motil_entity_type', 'motil_entity_id', 'mapping_status', 'confidence', 'reviewed_by',
  ];
};

export const REGULATORY_SOURCE_POLICY = {
  authorityBoundary: 'Regulatory knowledge describes requirements, structures and expected evidence. It never proves site compliance.',
  operationalBoundary: 'No regulatory source may overwrite canonical operational truth or company identifiers.',
  legalBoundary: 'MOTIL must not autonomously declare legal compliance, certification or reportability from this registry.',
  provenanceBoundary: 'Every regulatory assertion must retain source identity, version/provenance and review date.',
} as const;

export const REGULATORY_SOURCES: readonly RegulatorySource[] = [
  {
    id: 'sernageomin-res-0886-2025', authority: 'SERNAGEOMIN',
    title: 'Instructivo para estandarización de listado o estructura de quiebre de instalaciones mineras',
    sourceType: 'resolution', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/mineria/',
    versionOrResolution: 'RES N°0886', effectiveDate: null, lastReviewedAt: '2026-09-13',
    domains: ['assets', 'maintenance', 'hse', 'documents', 'inspections', 'closure'], status: 'pending_exact_extraction',
    notes: 'Registry active. Exact taxonomy values must be extracted from the official resolution before mappings are approved.',
  },
  {
    id: 'sernageomin-ds-132', authority: 'SERNAGEOMIN', title: 'Reglamento de Seguridad Minera — DS 132',
    sourceType: 'regulation', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/seguridad-minera/',
    versionOrResolution: 'DS 132', effectiveDate: null, lastReviewedAt: '2026-09-13',
    domains: ['hse', 'operations', 'assets', 'maintenance', 'inspections'], status: 'active_reference',
    notes: 'General mining-safety regulatory context. Applicability and current text must be checked against the authoritative source/version.',
  },
  {
    id: 'sernageomin-simin-forms', authority: 'SERNAGEOMIN', title: 'SIMIN / Formularios de Seguridad Minera',
    sourceType: 'form_family', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    versionOrResolution: null, effectiveDate: null, lastReviewedAt: '2026-09-13',
    domains: ['hse', 'contractors', 'production', 'reporting'], status: 'active_reference',
    notes: 'Includes reporting structures such as E-200 and serious/fatal/high-potential accident notification forms; registry does not imply submission.',
  },
  {
    id: 'sernageomin-ds-248-e700', authority: 'SERNAGEOMIN', title: 'DS 248 / E-700 tailings monitoring context',
    sourceType: 'form_family', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/formularios-seguridad-minera/',
    versionOrResolution: 'DS 248 / E-700', effectiveDate: null, lastReviewedAt: '2026-09-13',
    domains: ['tailings', 'geotechnical', 'monitoring', 'inspections'], status: 'active_reference',
    notes: 'Useful for operational, geotechnical, instrumentation and inspection evidence structures where legally applicable.',
  },
  {
    id: 'sernageomin-hydrometallurgical-plants-2025', authority: 'SERNAGEOMIN',
    title: 'Guía técnica para la elaboración y presentación de proyectos de plantas hidrometalúrgicas de cobre en faenas mineras',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/proyectos-mineros/',
    versionOrResolution: '2025', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['production', 'plant', 'lixiviation', 'sx', 'ew', 'hse', 'projects'], status: 'active_reference',
    notes: 'Technical minimum-content reference for LIX–SX–EW project formulation and review under DS 132. It describes expected project evidence; it does not prove plant compliance or approval.',
  },
  {
    id: 'sernageomin-tailings-project-guide-2025', authority: 'SERNAGEOMIN',
    title: 'Guía para la Elaboración y Presentación de Proyectos de Depósitos de Relaves',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/proyectos-mineros/',
    versionOrResolution: '2025 / DS 248 context', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['tailings', 'geotechnical', 'monitoring', 'hse', 'projects'], status: 'active_reference',
    notes: 'Uniform technical criteria for project presentation under DS 248. Separate from E-700 operational reporting and from proof of approval or safe condition.',
  },
  {
    id: 'sernageomin-trolley-assist-2025', authority: 'SERNAGEOMIN',
    title: 'Guía de presentación de pilotos o proyectos con tecnología Trolley Assist en faenas mineras',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/proyectos-mineros/',
    versionOrResolution: '2025', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['haulage', 'assets', 'electrical', 'hse', 'operations', 'projects'], status: 'active_reference',
    notes: 'Reference for open-pit Trolley Assist pilots/projects, including planning, risk management, operation and technical antecedents. Applicability must be validated for the specific project.',
  },
  {
    id: 'sernageomin-decarbonization-technologies-2025', authority: 'SERNAGEOMIN',
    title: 'Guía de implementación de proyectos mineros y revisión de tecnologías que contribuyan a la descarbonización de la industria minera en Chile',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/proyectos-mineros/',
    versionOrResolution: '2025', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['operations', 'assets', 'hse', 'projects', 'decarbonization'], status: 'active_reference',
    notes: 'Reference framework for safe review of decarbonization technologies in mining. It is not a technology certification or authorization.',
  },
  {
    id: 'sernageomin-closure-guides', authority: 'SERNAGEOMIN', title: 'Guías de presentación y aspectos técnicos de Planes de Cierre',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/guias-de-presentacion-de-planes-de-cierre/',
    versionOrResolution: 'Ley 20.551 / guías vigentes', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['closure', 'risk', 'monitoring', 'finance', 'documents'], status: 'active_reference',
    notes: 'Lifecycle reference for closure measures, monitoring, risk and guarantee context. Does not prove an approved closure plan.',
  },
  {
    id: 'sernageomin-closure-technical-guides', authority: 'SERNAGEOMIN', title: 'Guías de Aspectos Técnicos de los Planes de Cierre',
    sourceType: 'guide', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/guias-aspectos-tecnicos-planes-de-cierre/',
    versionOrResolution: 'Guías vigentes', effectiveDate: null, lastReviewedAt: '2026-09-14',
    domains: ['closure', 'risk', 'physical_stability', 'chemical_stability', 'monitoring', 'finance', 'tailings'], status: 'active_reference',
    notes: 'Covers closure risk evaluation, physical stability, chemical stability, useful life and financial guarantees. Use as expected-evidence context only; never as proof of site condition.',
  },
  {
    id: 'sernageomin-declaracion-minera-2025', authority: 'SERNAGEOMIN', title: 'Declaración Minera 2025',
    sourceType: 'procedure', evidenceClass: 'regulatory_knowledge', canonicalUrl: 'https://www.sernageomin.cl/declaracion-minera/',
    versionOrResolution: '2025', effectiveDate: null, lastReviewedAt: '2026-09-13',
    domains: ['small_mining', 'operations', 'safety', 'closure'], status: 'active_reference',
    notes: 'Compact reference model for eligible operations up to the published scope. Must not be generalized outside legal applicability.',
  },
];

export const RES_0886_TAXONOMY_ENVELOPE: Res0886TaxonomyEnvelope = {
  sourceId: 'sernageomin-res-0886-2025', purpose: 'installation_breakdown_reference', canonicalEntityBoundary: 'reference_only',
  mappingPolicy: 'never_overwrite_company_identifiers', reviewPolicy: 'human_review_required', taxonomyStatus: 'pending_exact_extraction',
  requiredMappingFields: ['regulatory_code', 'regulatory_label', 'motil_entity_type', 'motil_entity_id', 'mapping_status', 'confidence', 'reviewed_by'],
};

export function listRegulatorySources(options?: { domain?: string; evidenceClass?: RegulatoryEvidenceClass }) {
  const domain = options?.domain?.trim().toLowerCase();
  return REGULATORY_SOURCES.filter((source) => {
    if (options?.evidenceClass && source.evidenceClass !== options.evidenceClass) return false;
    if (domain && !source.domains.some((candidate) => candidate.toLowerCase() === domain)) return false;
    return true;
  });
}
