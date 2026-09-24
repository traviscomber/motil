// Deterministic meter evidence resolution for asset views.
// Dedupes observed readings, flags material sequence decreases and assembles
// runtime cost intelligence from explicit evidence only.
// Never invents readings, units or sources.

export type MeterReadingRow = {
  canonical_asset_id?: string | null;
  recorded_at?: string | null;
  meter_value?: number | string | null;
  meter_unit?: string | null;
  source_kind?: string | null;
  source_reference?: string | null;
};

export type PreventiveMeterRow = {
  effective_current_meter?: number | string | null;
  meter_evidence_source?: string | null;
};

export type PlanningCurrentRow = {
  current_reading?: number | string | null;
  meter_unit?: string | null;
  current_reading_at?: string | null;
  updated_at?: string | null;
};

export function dedupeMeterReadings(rows: MeterReadingRow[], assetId: string, limit = 12) {
  const signature = (row: MeterReadingRow) =>
    [row.canonical_asset_id || assetId, row.recorded_at || '', row.meter_value ?? '', row.meter_unit || ''].join('|');
  const deduped = Array.from(
    rows.reduce((map: Map<string, MeterReadingRow>, row) => {
      const key = signature(row);
      if (!map.has(key)) map.set(key, row);
      return map;
    }, new Map()).values(),
  );
  return {
    history: deduped.slice(0, limit),
    duplicateRowsIgnored: Math.max(rows.length - deduped.length, 0),
  };
}

export function countMaterialMeterDecreases(rows: MeterReadingRow[]) {
  const chronological = [...rows]
    .filter((row) => row.meter_value != null && row.recorded_at)
    .sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)));
  let decreases = 0;
  for (let index = 1; index < chronological.length; index += 1) {
    const previous = Number(chronological[index - 1]?.meter_value);
    const current = Number(chronological[index]?.meter_value);
    if (Number.isFinite(previous) && Number.isFinite(current) && previous - current > 1) {
      decreases += 1;
    }
  }
  return decreases;
}

export function resolvePreventiveMeterSnapshot(preventives: PreventiveMeterRow[]) {
  const values = preventives
    .filter((row) => {
      const value = Number(row.effective_current_meter);
      if (!Number.isFinite(value)) return false;
      return !(value === 0 && String(row.meter_evidence_source || '').toLowerCase() === 'schedule_snapshot');
    })
    .map((row) => Number(row.effective_current_meter));
  const unique = Array.from(new Set(values));
  return unique.length === 1 ? unique[0] : null;
}

export function resolvePlanningCurrentMeter(planningRows: PlanningCurrentRow[]) {
  const usableRows = planningRows.filter((row) => {
    const meterUnit = String(row.meter_unit || '').trim().toLowerCase();
    return (
      row.current_reading !== null &&
      row.current_reading !== undefined &&
      Number.isFinite(Number(row.current_reading)) &&
      !['anual', 'annual'].includes(meterUnit)
    );
  });
  const uniqueMeters = Array.from(new Set(usableRows.map((row) => Number(row.current_reading))));
  const meter = uniqueMeters.length === 1 ? uniqueMeters[0] : null;
  const evidence =
    meter != null
      ? usableRows
          .filter((row) => Number(row.current_reading) === meter)
          .sort((a, b) =>
            String(b.current_reading_at || b.updated_at || '').localeCompare(String(a.current_reading_at || a.updated_at || '')),
          )[0] || null
      : null;
  return { meter, evidence };
}

type RuntimeCostBase = {
  reading_count?: number | string | null;
  first_reading_at?: string | null;
  last_reading_at?: string | null;
  latest_meter_hours?: number | string | null;
  [key: string]: unknown;
};

export function buildRuntimeCostIntelligence(input: {
  base: RuntimeCostBase | null;
  planningMeterHistory: MeterReadingRow[];
  latestPlanningMeter: MeterReadingRow | null;
  planningCurrentMeter: number | null;
  planningCurrentEvidence: PlanningCurrentRow | null;
  preventiveMeterSnapshot: number | null;
  preventives: PreventiveMeterRow[];
  normalizedMeterUnit: string | null;
  planningMeterUnit: string | null;
  duplicateRowsIgnored: number;
  materialMeterDecreases: number;
}) {
  const {
    base,
    planningMeterHistory,
    latestPlanningMeter,
    planningCurrentMeter,
    planningCurrentEvidence,
    preventiveMeterSnapshot,
    preventives,
    normalizedMeterUnit,
    planningMeterUnit,
    duplicateRowsIgnored,
    materialMeterDecreases,
  } = input;

  const latestMeter =
    base?.latest_meter_hours ??
    latestPlanningMeter?.meter_value ??
    planningCurrentMeter ??
    preventiveMeterSnapshot ??
    null;
  const lastReadingAt =
    base?.last_reading_at ??
    latestPlanningMeter?.recorded_at ??
    planningCurrentEvidence?.current_reading_at ??
    planningCurrentEvidence?.updated_at ??
    null;
  const meterUnit =
    base?.latest_meter_hours != null
      ? 'h'
      : latestPlanningMeter?.meter_unit ||
        planningCurrentEvidence?.meter_unit ||
        normalizedMeterUnit ||
        planningMeterUnit ||
        (preventiveMeterSnapshot != null ? 'h' : null);
  const meterEvidenceSource =
    base?.latest_meter_hours != null
      ? 'asset_runtime_readings'
      : latestPlanningMeter?.meter_value != null
        ? latestPlanningMeter.source_kind || latestPlanningMeter.source_reference || 'planning_asset_meter_readings'
        : planningCurrentMeter != null
          ? 'planning_maintenance_source_rows'
          : preventiveMeterSnapshot != null
            ? preventives.find((row) => Number(row.effective_current_meter) === preventiveMeterSnapshot)?.meter_evidence_source || 'schedule_snapshot'
            : null;

  if (latestMeter == null && !base) return null;

  return {
    ...(base || {}),
    reading_count:
      Number(base?.reading_count || 0) > 0
        ? Number(base?.reading_count || 0)
        : planningMeterHistory.length > 0
          ? planningMeterHistory.length
          : planningCurrentMeter != null
            ? 1
            : preventiveMeterSnapshot != null
              ? 1
              : 0,
    first_reading_at:
      base?.first_reading_at ??
      (planningMeterHistory.length > 0 ? planningMeterHistory[planningMeterHistory.length - 1]?.recorded_at || null : null),
    last_reading_at: lastReadingAt,
    latest_meter_hours: latestMeter,
    latest_meter_unit: meterUnit,
    meter_evidence_source: meterEvidenceSource,
    duplicate_meter_rows_ignored: duplicateRowsIgnored,
    material_meter_decrease_count: materialMeterDecreases,
    meter_sequence_status: materialMeterDecreases > 0 ? 'review_required' : 'consistent',
  };
}
