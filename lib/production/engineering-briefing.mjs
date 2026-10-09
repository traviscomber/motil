const GAP_LABELS = {
  orientation_source_missing: 'Orientación sin fuente original',
  external_topography_result_missing: 'Falta resultado topográfico externo',
  verified_setup_values_missing: 'Faltan parámetros de instalación verificados',
  numeric_angle_convention_unresolved: 'Convención angular por resolver',
  measurement_not_completed: 'Medición pendiente',
  canonical_orientation_partial: 'Orientación canónica parcial',
};

/**
 * Summarizes only observed source records. Counts are not extrapolated.
 * @param {{
 *  plan: { plan_code?:string, status?:string, period_start?:string, period_end?:string } | null,
 *  period: { status:string, evaluatedDate:string, canUseAsCurrent:boolean },
 *  lines: Array<{line_type?:string, mine_name_raw?:string|null, sector_raw?:string|null, planned_advance_m?:number|null, planned_drilling_m?:number|null, planned_tons?:number|null}>,
 *  lineTotal: number | null,
 *  gaps: Array<{source_gap_class?:string|null, hole_code?:string|null, required_source_action?:string|null}>,
 *  gapTotal: number | null,
 *  tasks: Array<{task_key?:string,title?:string,severity?:string,due_at?:string|null,evidence_summary?:string|null}>
 * }} input
 */
export function summarizeEngineeringEvidence(input) {
  const { plan, period, lines, lineTotal, gaps, gapTotal, tasks } = input;
  const buckets = new Map();
  for (const gap of gaps) {
    const code = gap.source_gap_class || 'unclassified';
    buckets.set(code, (buckets.get(code) || 0) + 1);
  }
  const gapClasses = [...buckets].map(([code, sampled]) => ({
    code, label: GAP_LABELS[code] || 'Brecha sin clasificación', sampled,
  })).sort((a,b) => b.sampled-a.sampled || a.code.localeCompare(b.code));
  const gapCountVerified = Number.isInteger(gapTotal) && gapTotal >= 0;
  const lineCountVerified = Number.isInteger(lineTotal) && lineTotal >= 0;
  const sourceGapComplete = gapCountVerified && gaps.length === gapTotal;
  const planLinesComplete = lineCountVerified && lines.length === lineTotal;
  const taskPreview = tasks.slice(0, 8).map(task => ({
    key: task.task_key || null, title: String(task.title || '').slice(0,180),
    severity: task.severity || null, due_at: task.due_at || null,
    evidence: String(task.evidence_summary || '').slice(0,260),
  }));
  return {
    evaluatedDate: period.evaluatedDate,
    plan: plan ? {
      code: plan.plan_code, rawStatus: plan.status,
      periodStart: plan.period_start, periodEnd: plan.period_end,
    } : null,
    planPeriod: period.status,
    hasCurrentPlan: period.canUseAsCurrent,
    planLines: {
      total: lineCountVerified ? lineTotal : null, sampled: lines.length,
      complete: Boolean(planLinesComplete),
      missingMineInSample: lines.filter(l => !l.mine_name_raw?.trim()).length,
      missingSectorOnDetailedLinesInSample: lines.filter(l => l.line_type !== 'mine_total' && !l.sector_raw?.trim()).length,
      sample: lines.slice(0, 24).map(l => ({
        mine: l.mine_name_raw || null, sector: l.sector_raw || null,
        type: l.line_type || null, advanceM: l.planned_advance_m ?? null,
        drillingM: l.planned_drilling_m ?? null, tons: l.planned_tons ?? null,
      })),
    },
    topography: {
      actualSurveySource: 'unavailable_in_canonical_topography_api',
      verifiedExecution: false,
      gapCount: gapCountVerified ? gapTotal : null,
      sampledGaps: gaps.length,
      allGapsCovered: Boolean(sourceGapComplete),
      gapClasses,
      sampleCodes: gaps.slice(0, 6).map(g => ({
        hole: g.hole_code || null,
        reason: g.source_gap_class || null,
        sourceAction: String(g.required_source_action || '').slice(0,180),
      })),
    },
    actionableTasks: { sampledCount: taskPreview.length, sample: taskPreview, sampleLimit: 8 },
    comparisonBlocker: 'No existe una fuente topográfica canónica de ejecución para cotejar avance real con metros planificados por mina, sector y fecha.',
  };
}

/** @param {ReturnType<typeof summarizeEngineeringEvidence>} evidence */
export function formatEngineeringBriefing(evidence) {
  const p = evidence.plan;
  const planText = p
    ? 'Plan ' + (p.code || 'sin código') + ' (' + p.periodStart + ' a ' + p.periodEnd + '): ' +
      (evidence.planPeriod === 'current' ? 'vigente' : evidence.planPeriod === 'expired' ? 'vencido' :
       evidence.planPeriod === 'upcoming' ? 'futuro, aún no vigente' : 'sin período válido')
    : 'No existe un plan mensual activo acreditado.';
  const gapCount = evidence.topography.gapCount;
  const gapsText = gapCount === null ? 'total no verificable' : String(gapCount);
  const scope = evidence.topography.allGapsCovered ? 'cobertura completa de la consulta'
    : 'muestra parcial de ' + evidence.topography.sampledGaps + ' registros';
  const dominant = evidence.topography.gapClasses.slice(0,3)
    .map(g => g.label + ': ' + g.sampled + (evidence.topography.allGapsCovered ? '' : ' en muestra')).join('; ');
  const taskCount = evidence.actionableTasks.sampledCount;
  const tasksText = taskCount === 0
    ? '0 tareas registradas en la bandeja del cargo; esto no demuestra que no existan pendientes'
    : String(taskCount) + ' tareas priorizadas consultadas (muestra acotada)';
  return [
    'Ingeniería · estado al ' + evidence.evaluatedDate,
    planText + '.',
    'Brechas de fuentes topográficas: ' + gapsText + ' (' + scope + ').' + (dominant ? ' Principales: ' + dominant + '.' : ''),
    'Tareas: ' + tasksText + '.',
    'Avance real por sector: no verificable en la fuente topográfica canónica. No se compara plan con ejecución supuesta.',
    'Siguientes validaciones: 1) plan mensual aprobado que cubra la fecha; 2) levantamientos y parámetros originales verificables; 3) asignar responsables a las excepciones y confirmar fuentes.',
  ].join('\n');
}
