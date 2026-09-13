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

function windowStart(latestDate: string) {
  const date = new Date(`${latestDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (CURRENT_WINDOW_DAYS - 1));
  return date.toISOString().slice(0, 10);
}

function label(domain: string, exceptionType: string) {
  const known: Record<string, string> = {
    'drilling:hole_without_valid_mine': 'Perforación · sondajes sin mina válida',
    'drilling:missing_hole_code': 'Perforación · registros sin código de sondaje',
    'fine_copper:no_assay': 'Cobre fino · registros sin assay',
    'concentrate_dispatch:shipment_review': 'Despacho de concentrado · revisión pendiente',
  };
  return known[`${domain}:${exceptionType}`] || `${domain} · ${exceptionType}`;
}

function action(domain: string, exceptionType: string) {
  if (domain === 'drilling' && exceptionType === 'hole_without_valid_mine') {
    return 'Revisar la referencia de mina en la fuente de perforación y resolver el vínculo canónico antes de usar esos registros para lectura operacional por mina.';
  }
  if (domain === 'drilling' && exceptionType === 'missing_hole_code') {
    return 'Revisar los registros fuente sin código de sondaje y completar o reconciliar el identificador antes de atribuirlos a un sondaje canónico.';
  }
  if (domain === 'fine_copper' && exceptionType === 'no_assay') {
    return 'Validar si existe ensayo/ley fuente para esos registros; mantener la cobertura de cobre fino como incompleta mientras falte esa evidencia.';
  }
  if (domain === 'concentrate_dispatch' && exceptionType === 'shipment_review') {
    return 'Revisar el despacho marcado para validación y confirmar su evidencia fuente antes de tratarlo como despacho reconciliado.';
  }
  return 'Revisar la excepción en su fuente, completar o reconciliar la evidencia faltante y revalidar el dominio antes de usarla para una decisión operacional.';
}

async function latestFidelityDate(db: any, organizationId: string): Promise<string | null> {
  const { data, error } = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('event_date')
    .eq('organization_id', organizationId)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.event_date || null;
}

export async function productionDecisionCandidates(db: any, organizationId: string): Promise<ProductionDecisionCandidate[]> {
  const latestDate = await latestFidelityDate(db, organizationId);
  if (!latestDate) return [];
  const cutoff = windowStart(latestDate);

  const { data, error } = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('domain,exception_type,event_date,reference_code,description,source_file,source_sheet,source_row')
    .eq('organization_id', organizationId)
    .gte('event_date', cutoff)
    .lte('event_date', latestDate)
    .order('event_date', { ascending: false })
    .limit(500);
  if (error) throw error;

  const groups = new Map<string, { domain: string; exceptionType: string; rows: any[] }>();
  for (const row of data || []) {
    const domain = String(row.domain || 'unknown');
    const exceptionType = String(row.exception_type || 'unknown');
    const key = `${domain}:${exceptionType}`;
    const group = groups.get(key) || { domain, exceptionType, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .sort((a, b) => b.rows.length - a.rows.length)
    .slice(0, 20)
    .map(({ domain, exceptionType, rows }) => {
      const latest = rows[0]?.event_date || latestDate;
      const decisionKey = `operational:production:fidelity:${domain}:${exceptionType}`;
      return {
        decisionKey,
        targetDomain: 'production' as const,
        title: label(domain, exceptionType),
        summary: `La fuente de Producción registra ${rows.length} excepción(es) de fidelidad de tipo ${exceptionType} para ${domain} dentro de la ventana ${cutoff} → ${latestDate}. Última evidencia: ${latest}.`,
        evidenceRefs: [
          {
            source: 'production_source_fidelity_exceptions_v1',
            decisionKey,
            domain,
            exceptionType,
            count: rows.length,
            cutoff,
            latestEventDate: latest,
            mode: 'read',
          },
        ],
        uncertainty: 'La excepción describe calidad, vínculo o cobertura de la fuente; no demuestra por sí sola una falla física, incumplimiento productivo, causa raíz ni impacto económico.',
        contradictions: [],
        missingEvidence: [`La excepción debe resolverse o dejar de aparecer en la ventana vigente de la fuente antes de tratar el dato como reconciliado para este uso.`],
        recommendedHumanAction: action(domain, exceptionType),
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

  const latestDate = await latestFidelityDate(db, organizationId);
  if (!latestDate) return true;
  const cutoff = windowStart(latestDate);
  const { data, error } = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('event_date')
    .eq('organization_id', organizationId)
    .eq('domain', domain)
    .eq('exception_type', exceptionType)
    .gte('event_date', cutoff)
    .lte('event_date', latestDate)
    .limit(1);
  if (error) throw error;
  return !data?.length;
}
