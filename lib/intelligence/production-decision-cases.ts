export type ProductionDecisionCandidate = {
  decisionKey: string;
  targetDomain: 'production';
  title: string;
  summary: string;
  evidenceRefs: Record<string, unknown>[];
  uncertainty: string | null;
  contradictions: string[];
  missingEvidence: string[];
  recommendedHumanAction: string;
};

const CURRENT_WINDOW_DAYS = 31;

type FidelitySpec = {
  domain: string;
  exceptionType: string;
  title: string;
  sourceTable: string;
  sourceDateColumn: string;
  sourceFilters?: Array<[string, string]>;
  recommendedHumanAction: string;
};

const FIDELITY_SPECS: FidelitySpec[] = [
  {
    domain: 'drilling',
    exceptionType: 'missing_hole_code',
    title: 'Perforación · registros sin código de sondaje',
    sourceTable: 'production_drilling_source_reports',
    sourceDateColumn: 'operation_date',
    recommendedHumanAction: 'Revisar los registros fuente sin código de sondaje y completar o reconciliar el identificador antes de atribuirlos a un sondaje canónico.',
  },
  {
    domain: 'drilling',
    exceptionType: 'hole_without_valid_mine',
    title: 'Perforación · sondajes sin mina válida',
    sourceTable: 'production_drill_holes',
    sourceDateColumn: 'start_at',
    sourceFilters: [['source_type', 'source_report']],
    recommendedHumanAction: 'Revisar la referencia de mina en la fuente de perforación y resolver el vínculo canónico antes de usar esos registros para lectura operacional por mina.',
  },
  {
    domain: 'fine_copper',
    exceptionType: 'no_assay',
    title: 'Cobre fino · registros sin assay',
    sourceTable: 'production_fine_copper_v1',
    sourceDateColumn: 'operation_date',
    recommendedHumanAction: 'Validar si existe ensayo/ley fuente para esos registros; mantener la cobertura de cobre fino como incompleta mientras falte esa evidencia.',
  },
  {
    domain: 'concentrate_dispatch',
    exceptionType: 'shipment_review',
    title: 'Despacho de concentrado · revisión pendiente',
    sourceTable: 'production_concentrate_shipments',
    sourceDateColumn: 'shipment_date',
    recommendedHumanAction: 'Revisar el despacho marcado para validación y confirmar su evidencia fuente antes de tratarlo como despacho reconciliado.',
  },
];

function windowStart(latestDate: string) {
  const date = new Date(`${latestDate.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (CURRENT_WINDOW_DAYS - 1));
  return date.toISOString().slice(0, 10);
}

function specKey(domain: string, exceptionType: string) {
  return `${domain}:${exceptionType}`;
}

function specFor(domain: string, exceptionType: string) {
  return FIDELITY_SPECS.find((spec) => spec.domain === domain && spec.exceptionType === exceptionType) || null;
}

function applySourceFilters(query: any, spec: FidelitySpec) {
  let scoped = query;
  for (const [column, value] of spec.sourceFilters || []) scoped = scoped.eq(column, value);
  return scoped;
}

async function sourceCutoff(db: any, organizationId: string, spec: FidelitySpec): Promise<string | null> {
  let query = db
    .from(spec.sourceTable)
    .select(spec.sourceDateColumn)
    .eq('organization_id', organizationId)
    .not(spec.sourceDateColumn, 'is', null);
  query = applySourceFilters(query, spec);
  const { data, error } = await query.order(spec.sourceDateColumn, { ascending: false }).limit(1);
  if (error) throw error;
  const raw = data?.[0]?.[spec.sourceDateColumn];
  return raw ? String(raw).slice(0, 10) : null;
}

async function exceptionWindow(
  db: any,
  organizationId: string,
  spec: FidelitySpec,
): Promise<{ cutoff: string; sourceCutoff: string; latestExceptionDate: string | null; count: number } | null> {
  const latestSourceDate = await sourceCutoff(db, organizationId, spec);
  if (!latestSourceDate) return null;
  const cutoff = windowStart(latestSourceDate);

  const countResult = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('event_date', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('domain', spec.domain)
    .eq('exception_type', spec.exceptionType)
    .gte('event_date', cutoff)
    .lte('event_date', latestSourceDate);
  if (countResult.error) throw countResult.error;

  const latestResult = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('event_date')
    .eq('organization_id', organizationId)
    .eq('domain', spec.domain)
    .eq('exception_type', spec.exceptionType)
    .gte('event_date', cutoff)
    .lte('event_date', latestSourceDate)
    .order('event_date', { ascending: false })
    .limit(1);
  if (latestResult.error) throw latestResult.error;

  return {
    cutoff,
    sourceCutoff: latestSourceDate,
    latestExceptionDate: latestResult.data?.[0]?.event_date || null,
    count: Number(countResult.count || 0),
  };
}

export async function productionDecisionCandidates(db: any, organizationId: string): Promise<ProductionDecisionCandidate[]> {
  const evaluated = await Promise.all(
    FIDELITY_SPECS.map(async (spec) => ({ spec, window: await exceptionWindow(db, organizationId, spec) })),
  );

  return evaluated
    .filter((entry) => entry.window && entry.window.count > 0)
    .sort((a, b) => (b.window?.count || 0) - (a.window?.count || 0))
    .map(({ spec, window }) => {
      const state = window!;
      const decisionKey = `operational:production:fidelity:${specKey(spec.domain, spec.exceptionType)}`;
      return {
        decisionKey,
        targetDomain: 'production' as const,
        title: spec.title,
        summary: `La fuente de Producción registra ${state.count} excepción(es) de fidelidad de tipo ${spec.exceptionType} para ${spec.domain} dentro de la ventana ${state.cutoff} → ${state.sourceCutoff}. Última excepción visible: ${state.latestExceptionDate || 'sin fecha visible'}.`,
        evidenceRefs: [
          {
            source: 'production_source_fidelity_exceptions_v1',
            sourceCutoffTable: spec.sourceTable,
            decisionKey,
            domain: spec.domain,
            exceptionType: spec.exceptionType,
            count: state.count,
            cutoff: state.cutoff,
            sourceCutoff: state.sourceCutoff,
            latestExceptionDate: state.latestExceptionDate,
            mode: 'read',
          },
        ],
        uncertainty: 'La excepción describe calidad, vínculo o cobertura de la fuente; no demuestra por sí sola una falla física, incumplimiento productivo, causa raíz ni impacto económico.',
        contradictions: [],
        missingEvidence: ['La excepción debe resolverse o dejar de aparecer dentro de la ventana vigente de su propia fuente antes de tratar el dato como reconciliado para este uso.'],
        recommendedHumanAction: spec.recommendedHumanAction,
      };
    });
}

export async function isProductionDecisionResolved(db: any, organizationId: string, decisionKey: string): Promise<boolean> {
  const prefix = 'operational:production:fidelity:';
  if (!decisionKey.startsWith(prefix)) return false;
  const remainder = decisionKey.slice(prefix.length);
  const splitAt = remainder.indexOf(':');
  if (splitAt < 1) return false;
  const domain = remainder.slice(0, splitAt);
  const exceptionType = remainder.slice(splitAt + 1);
  const spec = specFor(domain, exceptionType);
  if (!spec) return false;

  const window = await exceptionWindow(db, organizationId, spec);
  if (!window) return false;
  return window.count === 0;
}
