type FinanceDecisionCandidate = {
  decisionKey: string;
  targetDomain: 'finance';
  title: string;
  summary: string;
  evidenceRefs: Record<string, unknown>[];
  uncertainty: string | null;
  contradictions: string[];
  missingEvidence: string[];
  recommendedHumanAction: string;
};

const financeActionByCode: Record<string, string> = {
  validation: 'Revisar la validación financiera exhaustiva y resolver la excepción antes de usar el conjunto como base de cierre o decisión financiera.',
  treasury_missing_due_date: 'Completar o validar la fecha de vencimiento antes de registrar o programar pagos.',
  missing_cost_centers: 'Revisar las líneas sin centro de costo y completar la imputación sólo cuando la fuente permita identificarla de forma trazable.',
  zero_amount_lines: 'Revisar si las líneas con monto cero corresponden a registros válidos de la fuente o requieren corrección en el flujo de origen.',
  unlinked_products: 'Resolver el cruce con producto canónico antes de usar esas líneas para análisis por producto.',
};

export async function financeDecisionCandidates(db: any, organizationId: string): Promise<FinanceDecisionCandidate[]> {
  const { data, error } = await db
    .from('canonical_finance_alerts')
    .select('alert_code,title,severity,exception_count,description')
    .eq('organization_id', organizationId)
    .gt('exception_count', 0)
    .order('severity', { ascending: true })
    .order('exception_count', { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data || []).map((row: any) => {
    const alertCode = String(row.alert_code || 'unknown');
    const count = Number(row.exception_count || 0);
    const severity = String(row.severity || 'warning');
    const decisionKey = `operational:finance:alert:${alertCode}`;

    return {
      decisionKey,
      targetDomain: 'finance',
      title: row.title || `Excepción financiera · ${alertCode}`,
      summary: `${row.description || 'La fuente financiera registra una excepción que requiere revisión.'} Casos observados: ${count}. Severidad de la fuente: ${severity}.`,
      evidenceRefs: [
        {
          source: 'canonical_finance_alerts',
          decisionKey,
          alertCode,
          exceptionCount: count,
          severity,
          mode: 'read',
        },
      ],
      uncertainty: 'La alerta describe calidad, completitud o validación de información financiera. No demuestra por sí sola pérdida económica, fraude, incumplimiento contable ni impacto operacional.',
      contradictions: [],
      missingEvidence: [],
      recommendedHumanAction: financeActionByCode[alertCode]
        || 'Revisar la excepción en Finanzas, validar su fuente y resolverla en el flujo autorizado antes de usarla para una decisión material.',
    };
  });
}

export async function isFinanceDecisionResolved(db: any, organizationId: string, decisionKey: string): Promise<boolean> {
  if (!decisionKey.startsWith('operational:finance:alert:')) return false;
  const alertCode = decisionKey.replace('operational:finance:alert:', '');
  const { data, error } = await db
    .from('canonical_finance_alerts')
    .select('exception_count')
    .eq('organization_id', organizationId)
    .eq('alert_code', alertCode)
    .maybeSingle();

  if (error) throw error;
  return !data || Number(data.exception_count || 0) <= 0;
}
