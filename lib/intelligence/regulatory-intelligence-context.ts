import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import {
  loadRegulatoryCanonicalEvidence,
  type RegulatoryCanonicalEvidenceScope,
} from '@/lib/intelligence/regulatory-canonical-evidence';
import { getRegulatoryInstallationContext } from '@/lib/intelligence/regulatory-installation-context';
import { listRegulatorySources, REGULATORY_SOURCE_POLICY } from '@/lib/intelligence/regulatory-sources';

type RegulatoryContext = {
  supabase: any;
  organizationId: string;
  userId: string;
  role?: string;
};

function canRead(level: string) {
  return level === 'ED' || level === 'LEC';
}

async function resolveAllowedScopes(context: RegulatoryContext): Promise<RegulatoryCanonicalEvidenceScope[]> {
  const [
    mantOps,
    mantExec,
    prodOps,
    hseDocs,
    hseBoard,
    hseRisks,
    mantDocs,
    warehouseDocs,
    sosDocs,
    legal,
  ] = await Promise.all([
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_GERENCIAL),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.PROD_OPERACIONES),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_DOCUMENTACION),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_TABLERO),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_RIESGOS),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_DOCUMENTOS),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.BODEGA_DOCUMENTOS),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.SOS_DOCUMENTOS),
    getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO),
  ]);

  const scopes: RegulatoryCanonicalEvidenceScope[] = [];
  if ([mantOps, mantExec, prodOps].some(canRead)) scopes.push('assets');
  if ([hseDocs, mantDocs, warehouseDocs, sosDocs, legal].some(canRead)) scopes.push('documents');
  if ([hseDocs, hseBoard, hseRisks].some(canRead)) scopes.push('hse');
  return scopes;
}

function buildPromptContext(input: {
  sources: ReturnType<typeof listRegulatorySources>;
  canonicalEvidence: Awaited<ReturnType<typeof loadRegulatoryCanonicalEvidence>>;
  installationContext: ReturnType<typeof getRegulatoryInstallationContext>;
}) {
  const sourceRows = input.sources.map((source) =>
    `${source.id} | ${source.versionOrResolution || 'sin versión explícita'} | status=${source.status} | reviewed=${source.lastReviewedAt}`,
  );
  const coverageRows = input.canonicalEvidence.coverage.map((row) =>
    `${row.scope} | ${row.status} | source=${row.source}${row.reason ? ` | reason=${row.reason}` : ''}`,
  );
  const evidenceRows = input.canonicalEvidence.items.slice(0, 20).map((row) =>
    `${row.scope} | ${row.canonicalRef} | ${row.label} | freshness=${row.freshnessAt || 'unknown'}`,
  );

  return [
    'CONTEXTO REGULATORIO SERNAGEOMIN — ADVISORY / NO CANÓNICO OPERACIONAL',
    'Regla: este contexto describe referencias, estructuras y evidencia esperable. Nunca prueba cumplimiento, aplicabilidad legal, causalidad, prioridad ni autorización.',
    'La evidencia operacional canónica de MOTIL mantiene precedencia. Una referencia regulatoria no convierte por sí sola un registro en cumplimiento ni incumplimiento.',
    `Fuentes regulatorias registradas: ${input.sources.length}`,
    ...sourceRows,
    `RES 0886 approved_reference=${input.installationContext.nodeCount}; candidates_pending_review=${input.installationContext.extractionCandidateCount}`,
    'Cobertura de evidencia canónica autorizada:',
    ...coverageRows,
    'Referencias canónicas visibles (muestra acotada):',
    ...(evidenceRows.length ? evidenceRows : ['sin referencias canónicas visibles para los permisos actuales']),
    'Patrón de respuesta regulatoria: OBSERVADO EN MOTIL → REFERENCIA REGULATORIA → BRECHA/INCERTIDUMBRE → VALIDACIÓN HUMANA.',
  ].join('\n');
}

export async function loadRegulatoryIntelligenceContext(
  context: RegulatoryContext,
  limit = 20,
) {
  try {
    const allowedScopes = await resolveAllowedScopes(context);
    const [canonicalEvidence, installationContext] = await Promise.all([
      loadRegulatoryCanonicalEvidence(context, allowedScopes, limit),
      Promise.resolve(getRegulatoryInstallationContext()),
    ]);
    const sources = listRegulatorySources({ evidenceClass: 'regulatory_knowledge' });

    return {
      available: true,
      authority: 'advisory_reference_only' as const,
      allowedScopes,
      sourceCount: sources.length,
      sources,
      installationContext,
      canonicalEvidence,
      promptContext: buildPromptContext({ sources, canonicalEvidence, installationContext }),
      policy: REGULATORY_SOURCE_POLICY,
      complianceVerdictCalculated: false,
      operationalMutationExecuted: false,
      errorCode: null as string | null,
    };
  } catch (error) {
    console.warn('[regulatory-intelligence-context] fail-open', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return {
      available: false,
      authority: 'advisory_reference_only' as const,
      allowedScopes: [] as RegulatoryCanonicalEvidenceScope[],
      sourceCount: 0,
      sources: [],
      installationContext: null,
      canonicalEvidence: null,
      promptContext: [
        'CONTEXTO REGULATORIO SERNAGEOMIN — NO DISPONIBLE',
        'Continúa exclusivamente con evidencia operacional canónica y declara que el contexto regulatorio no pudo cargarse.',
      ].join('\n'),
      policy: REGULATORY_SOURCE_POLICY,
      complianceVerdictCalculated: false,
      operationalMutationExecuted: false,
      errorCode: 'regulatory_context_unavailable',
    };
  }
}
