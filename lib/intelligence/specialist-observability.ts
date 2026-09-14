export type ObservedSpecialist =
  | 'executive_core'
  | 'production'
  | 'maintenance'
  | 'inventory'
  | 'procurement'
  | 'finance'
  | 'equipment';

type SourceRef = {
  source?: unknown;
  tool?: unknown;
  mode?: unknown;
};

const TOOL_SPECIALISTS: Record<string, ObservedSpecialist[]> = {
  read_executive_production: ['executive_core', 'production'],
  read_executive_maintenance: ['executive_core', 'maintenance'],
  read_executive_inventory: ['executive_core', 'inventory'],
  read_executive_procurement: ['executive_core', 'procurement'],
  read_executive_finance: ['executive_core', 'finance'],
  read_executive_supply_chain: ['executive_core', 'maintenance', 'inventory', 'procurement'],
  read_executive_maintenance_inventory_dependency: ['executive_core', 'maintenance', 'inventory'],
  read_executive_maintenance_procurement_dependency: ['executive_core', 'maintenance', 'procurement'],
  read_equipment_intelligence: ['executive_core', 'equipment'],
};

export function deriveObservedSpecialists(sourceRefs: SourceRef[] | null | undefined) {
  const specialists = new Set<ObservedSpecialist>();
  const observedTools: string[] = [];
  const unknownTools: string[] = [];

  for (const ref of Array.isArray(sourceRefs) ? sourceRefs : []) {
    const tool = typeof ref?.tool === 'string' ? ref.tool.trim() : '';
    if (!tool) continue;
    observedTools.push(tool);
    const mapped = TOOL_SPECIALISTS[tool];
    if (!mapped) {
      unknownTools.push(tool);
      continue;
    }
    mapped.forEach((specialist) => specialists.add(specialist));
  }

  return {
    specialists: Array.from(specialists),
    observedTools: Array.from(new Set(observedTools)),
    unknownTools: Array.from(new Set(unknownTools)),
    traceAvailable: observedTools.length > 0,
    attributionAuthority: 'observed_tool_trace_only' as const,
    inferredFromPrompt: false,
  };
}

export function aggregateObservedSpecialists(
  rows: Array<{ source_refs?: SourceRef[] | null }>,
) {
  const counts: Record<string, number> = {};
  let tracedRuns = 0;
  let attributedRuns = 0;

  for (const row of rows) {
    const observation = deriveObservedSpecialists(row.source_refs);
    if (observation.traceAvailable) tracedRuns += 1;
    if (observation.specialists.length) attributedRuns += 1;
    for (const specialist of observation.specialists) {
      counts[specialist] = (counts[specialist] || 0) + 1;
    }
  }

  return {
    counts,
    tracedRuns,
    attributedRuns,
    policy: {
      attributionAuthority: 'observed_tool_trace_only',
      noPromptInference: true,
      noUiAgentSelection: true,
    },
  };
}
