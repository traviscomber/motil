// Sección "Cobertura y trazabilidad" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronDown,
  Database,
  FileText,
  Gauge,
  Hash,
  MapPin,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { date, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export type Asset360FinanceReconciliation = {
  finance_asset_id?: string | null;
  finance_asset_code?: string | null;
  finance_asset_name?: string | null;
  candidate_count?: number | string | null;
  reconciliation_status?: string | null;
  match_method?: string | null;
} | null;

export type Asset360IdentityHistoryRow = {
  source_asset_id?: string | null;
  source_asset_code?: string | null;
  source_asset_name?: string | null;
  target_asset_id?: string | null;
  target_asset_code?: string | null;
  target_asset_name?: string | null;
  evidence_rule?: string | null;
  identity_status?: string | null;
  canonicalized?: boolean | null;
};

export type Asset360CoverageAsset = {
  source_file?: string | null;
  validation_status?: string | null;
  location?: string | null;
  location_evidence_source?: string | null;
  criticality_evidence_source?: string | null;
  criticality_evidence_at?: string | null;
  operational_status_evidence_source?: string | null;
  cost_center_code?: string | null;
  cost_center_evidence_source?: string | null;
  license_plate?: string | null;
  license_plate_evidence_source?: string | null;
  reference_family?: string | null;
  reference_family_evidence_source?: string | null;
  source_sheet?: string | null;
  source_row?: number | null;
  updated_at?: string | null;
  imported_at?: string | null;
};

const evidenceSourceLabel = (source?: string | null) => {
  if (!source) return 'Sin fuente resuelta';
  const labels: Record<string, string> = {
    maintenance_canonical_assets_v1: 'Maestro canónico',
    canonical_assets_current: 'Maestro canónico actual',
    maintenance_asset_status_history: 'Historial de estado del activo',
    asset_operational_state_v1: 'Estado operacional consolidado',
    planning_maintenance_source_rows: 'Planificación de mantenimiento',
    planning_or_production_evidence: 'Planificación / producción',
    cost_centers_exact_identity: 'Centro de costo por identidad exacta',
    purchase_history_exact_identity: 'Centro de costo por histórico de compras',
    asset_runtime_readings: 'Lecturas operacionales',
    planning_asset_meter_readings: 'Planificación · horómetro',
    schedule_snapshot: 'Pauta preventiva',
    cost_center_family: 'Familia del centro de costo',
    deterministic_name_classifier: 'Clasificador determinístico del nombre',
    deterministic_name_brand: 'Marca explícita extraída del nombre',
    deterministic_name_plate: 'Patente extraída del nombre con formato validado',
  };
  return labels[source] || source;
};

export function Asset360CoverageSection({
  coverageItems,
  coverageAvailableCount,
  coverageMissingCount,
  asset,
  displayCriticality,
  displayStatus,
  effectiveMeterLabel,
  effectiveMeterSuffix,
  meterHours,
  meterEvidenceSource,
  usesAnnualControl,
  hasAnnualReadingConflict,
  latestEvidence,
  evidenceDomainCount,
  financeReconciliation,
  identityHistory,
}: {
  coverageItems: ReadonlyArray<readonly [string, boolean, string]>;
  coverageAvailableCount: number;
  coverageMissingCount: number;
  asset: Asset360CoverageAsset;
  displayCriticality?: string | null;
  displayStatus?: string | null;
  effectiveMeterLabel: string;
  effectiveMeterSuffix: string;
  meterHours?: number | string | null;
  meterEvidenceSource?: string | null;
  usesAnnualControl: boolean;
  hasAnnualReadingConflict: boolean;
  latestEvidence: { value: string; source: string } | null;
  evidenceDomainCount?: number | string | null;
  financeReconciliation?: Asset360FinanceReconciliation;
  identityHistory: Asset360IdentityHistoryRow[];
}) {
  const sourceLabel = asset.source_file?.startsWith('public.')
    ? 'Maestro de activos'
    : asset.source_file || 'Fuente no informada';

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Cobertura y trazabilidad"
        hint={coverageMissingCount > 0 ? `${coverageMissingCount} brechas de evidencia` : 'Cobertura completa'}
      />
      <div className="border-t border-border">
        {coverageMissingCount > 0 ? (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Brechas de evidencia</p>
            <div className="mt-3 divide-y divide-border">
              {coverageItems.filter(([, available]) => !available).map(([label, , status]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground sm:text-right">{status}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{coverageAvailableCount}/{coverageItems.length} capas con evidencia.</p>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            {coverageAvailableCount}/{coverageItems.length} capas con evidencia. Sin brechas detectadas.
          </div>
        )}

        <details className="group border-t border-border px-4 py-4">
          <summary className="cursor-pointer list-none">
            <span className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Trazabilidad técnica</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Fuente, hoja, fila y conciliación financiera</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Horómetro, confiabilidad y costos se muestran sólo cuando existe evidencia operacional o económica enlazada.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IdentityItem icon={Database} label="Fuente maestra" value={sourceLabel} />
              <IdentityItem
                icon={ShieldCheck}
                label="Calidad del maestro"
                value={
                  asset.validation_status === 'valid'
                    ? 'Validado'
                    : asset.validation_status === 'warning'
                      ? 'Requiere enriquecimiento'
                      : asset.validation_status || 'No informada'
                }
                meta={asset.validation_status === 'warning' ? 'Identidad preservada; pueden faltar atributos técnicos' : null}
              />
              <IdentityItem icon={MapPin} label="Ubicación" value={asset.location} meta={evidenceSourceLabel(asset.location_evidence_source)} />
              <IdentityItem
                icon={ShieldCheck}
                label="Criticidad"
                value={displayCriticality}
                meta={asset.criticality_evidence_at
                  ? `${evidenceSourceLabel(asset.criticality_evidence_source)} · ${date(asset.criticality_evidence_at)}`
                  : evidenceSourceLabel(asset.criticality_evidence_source)}
              />
              <IdentityItem icon={Activity} label="Estado" value={displayStatus} meta={evidenceSourceLabel(asset.operational_status_evidence_source)} />
              <IdentityItem icon={Building2} label="Centro de costo" value={asset.cost_center_code} meta={evidenceSourceLabel(asset.cost_center_evidence_source)} />
              <IdentityItem icon={Hash} label="Patente" value={asset.license_plate} meta={asset.license_plate ? evidenceSourceLabel(asset.license_plate_evidence_source) : null} />
              <IdentityItem icon={Wrench} label="Familia referencial" value={asset.reference_family} meta={asset.reference_family ? `${evidenceSourceLabel(asset.reference_family_evidence_source)} · no canónico` : null} />
              <IdentityItem
                icon={Gauge}
                label={effectiveMeterLabel}
                value={meterHours != null
                  ? `${number(meterHours, 1)} ${effectiveMeterSuffix}`.trim()
                  : usesAnnualControl
                    ? 'Anual'
                    : null}
                meta={evidenceSourceLabel(meterEvidenceSource)}
              />
              {hasAnnualReadingConflict ? (
                <IdentityItem
                  icon={AlertTriangle}
                  label="Lectura de control"
                  value="Requiere validación"
                  meta="Valor numérico con unidad anual en planificación"
                />
              ) : null}
              <IdentityItem
                icon={FileText}
                label="Hoja"
                value={asset.source_sheet}
                meta={asset.source_row != null ? `Fila ${asset.source_row}` : null}
              />
              <IdentityItem icon={CalendarDays} label="Última actualización" value={date(asset.updated_at || asset.imported_at)} />
              <IdentityItem
                icon={Activity}
                label="Última evidencia"
                value={date(latestEvidence?.value)}
                meta={latestEvidence
                  ? `${latestEvidence.source}${latestEvidence.source === 'Operación' && evidenceDomainCount != null
                      ? ` · ${number(evidenceDomainCount, 0)} dominios`
                      : ''}`
                  : null}
              />
            </div>
            {financeReconciliation ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Conciliación financiera</p>
                <p className="mt-1 text-sm font-medium">
                  {financeReconciliation.finance_asset_code || financeReconciliation.finance_asset_name
                    ? `${financeReconciliation.finance_asset_code || ''}${financeReconciliation.finance_asset_code && financeReconciliation.finance_asset_name ? ' · ' : ''}${financeReconciliation.finance_asset_name || ''}`
                    : 'Activo financiero sin identificación visible'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {financeReconciliation.reconciliation_status || 'Sin estado'} · {financeReconciliation.match_method || 'sin método'}
                </p>
              </div>
            ) : null}
            {identityHistory.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Identidad consolidada</p>
                <p className="mt-1 text-sm font-medium">
                  {identityHistory.length} {identityHistory.length === 1 ? 'alias histórico aprobado' : 'alias históricos aprobados'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {identityHistory
                    .slice(0, 3)
                    .map((row) => row.source_asset_name || row.source_asset_code)
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </details>
  );
}
