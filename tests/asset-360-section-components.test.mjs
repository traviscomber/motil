import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overview = fs.readFileSync('components/maintenance/asset-360-overview.tsx', 'utf8');
const format = fs.readFileSync('components/maintenance/asset-360/format.ts', 'utf8');
const primitives = fs.readFileSync('components/maintenance/asset-360/primitives.tsx', 'utf8');
const purchaseSection = fs.readFileSync(
  'components/maintenance/asset-360/purchase-section.tsx',
  'utf8',
);
const interventionSection = fs.readFileSync(
  'components/maintenance/asset-360/intervention-section.tsx',
  'utf8',
);
const runtimeSection = fs.readFileSync(
  'components/maintenance/asset-360/runtime-section.tsx',
  'utf8',
);
const planningSection = fs.readFileSync(
  'components/maintenance/asset-360/planning-section.tsx',
  'utf8',
);
const drillingSection = fs.readFileSync(
  'components/maintenance/asset-360/drilling-section.tsx',
  'utf8',
);
const historySection = fs.readFileSync(
  'components/maintenance/asset-360/history-section.tsx',
  'utf8',
);
const materialsSection = fs.readFileSync(
  'components/maintenance/asset-360/materials-section.tsx',
  'utf8',
);
const lifecycleSection = fs.readFileSync(
  'components/maintenance/asset-360/lifecycle-section.tsx',
  'utf8',
);
const coverageSection = fs.readFileSync(
  'components/maintenance/asset-360/coverage-section.tsx',
  'utf8',
);
const identityHeader = fs.readFileSync(
  'components/maintenance/asset-360/identity-header.tsx',
  'utf8',
);
const attentionCard = fs.readFileSync(
  'components/maintenance/asset-360/attention-card.tsx',
  'utf8',
);
const maintenanceSection = fs.readFileSync(
  'components/maintenance/asset-360/maintenance-section.tsx',
  'utf8',
);
const availabilitySection = fs.readFileSync(
  'components/maintenance/asset-360/availability-section.tsx',
  'utf8',
);
const economicsSection = fs.readFileSync(
  'components/maintenance/asset-360/economics-section.tsx',
  'utf8',
);

test('asset 360 coverage section owns the reconciliation and identity history types', () => {
  assert.match(coverageSection, /export type Asset360FinanceReconciliation = \{/);
  assert.match(coverageSection, /reconciliation_status\?: string \| null;/);
  assert.match(coverageSection, /export type Asset360IdentityHistoryRow = \{/);
  assert.match(coverageSection, /canonicalized\?: boolean \| null;/);
  assert.match(coverageSection, /export type Asset360CoverageAsset = \{/);
  assert.match(coverageSection, /evidenceSourceLabel = \(source\?: string \| null\)/);
});

test('asset 360 coverage section renders evidence gaps and technical traceability', () => {
  assert.match(coverageSection, /export function Asset360CoverageSection\(/);
  assert.match(coverageSection, /title="Cobertura y trazabilidad"/);
  assert.match(coverageSection, /Brechas de evidencia/);
  assert.match(coverageSection, /Trazabilidad técnica/);
  assert.match(coverageSection, /Fuente maestra/);
  assert.match(coverageSection, /Conciliación financiera/);
  assert.match(coverageSection, /alias históricos aprobados/);
  assert.match(coverageSection, /const sourceLabel = asset\.source_file\?\.startsWith\('public\.'\)/);
});

test('asset 360 overview delegates coverage rendering to the coverage section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/coverage-section'/);
  assert.match(overview, /<Asset360CoverageSection[ \n]/);
  assert.match(overview, /coverageItems=\{coverageItems\}/);
  assert.match(overview, /financeReconciliation=\{financeReconciliation\}/);
  assert.match(overview, /financeReconciliation\?: Asset360FinanceReconciliation;/);
  assert.match(overview, /identityHistory\?: Asset360IdentityHistoryRow\[\];/);
  assert.doesNotMatch(overview, /Brechas de evidencia/);
  assert.doesNotMatch(overview, /Trazabilidad técnica/);
  assert.doesNotMatch(overview, /evidenceSourceLabel/);
});

test('asset 360 lifecycle section renders age, remaining life and acquisition', () => {
  assert.match(lifecycleSection, /export function Asset360LifecycleSection\(/);
  assert.match(lifecycleSection, /if \(!hasLifecycleEvidence\) return null;/);
  assert.match(lifecycleSection, /title="Ciclo de vida"/);
  assert.match(lifecycleSection, /Edad estimada/);
  assert.match(lifecycleSection, /Vida remanente/);
  assert.match(lifecycleSection, /Costo de adquisición/);
  assert.match(lifecycleSection, /assetAgeYears: number \| null;/);
  assert.match(lifecycleSection, /remainingLifeYears: number \| null;/);
});

test('asset 360 overview delegates lifecycle rendering to the lifecycle section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/lifecycle-section'/);
  assert.match(overview, /<Asset360LifecycleSection[ \n]/);
  assert.match(overview, /remainingLifeYears=\{remainingLifeYears\}/);
  assert.match(overview, /acquisitionDate=\{asset\.acquisition_date\}/);
  assert.doesNotMatch(overview, /Edad estimada/);
  assert.doesNotMatch(overview, /Costo de adquisición/);
});

test('asset 360 materials section owns the shared parts row type', () => {
  assert.match(materialsSection, /export type Asset360PartsRow = \{/);
  assert.match(materialsSection, /quantity_requested\?: number \| null;/);
  assert.match(materialsSection, /quantity_returned\?: number \| null;/);
  assert.match(materialsSection, /product\?: \{/);
  assert.match(materialsSection, /workOrder\?: \{/);
});

test('asset 360 materials section renders pending and installed parts', () => {
  assert.match(materialsSection, /export function Asset360MaterialsSection\(/);
  assert.match(materialsSection, /if \(!hasMaterialEvidence\) return null;/);
  assert.match(materialsSection, /title="Materiales y repuestos"/);
  assert.match(materialsSection, /Historial instalado/);
  assert.match(materialsSection, /No hay materiales pendientes asociados al equipo\./);
  assert.match(materialsSection, /Repuesto sin nombre/);
  assert.match(materialsSection, /Sin costo/);
});

test('asset 360 overview delegates materials rendering to the materials section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/materials-section'/);
  assert.match(overview, /<Asset360MaterialsSection[ \n]/);
  assert.match(overview, /pendingParts=\{pendingParts\}/);
  assert.match(overview, /latestPlanPartsStatus=\{latestPlan\?\.parts_status_raw\}/);
  assert.match(overview, /installedParts\?: Asset360PartsRow\[\]/);
  assert.doesNotMatch(overview, /Historial instalado/);
  assert.doesNotMatch(overview, /No hay materiales pendientes asociados al equipo\./);
});

test('asset 360 history section owns the audited intervention and recent event types', () => {
  assert.match(historySection, /export type Asset360RecentEvent = \{/);
  assert.match(historySection, /actor_name\?: string \| null;/);
  assert.match(historySection, /export type Asset360AuditedIntervention = \{/);
  assert.match(historySection, /closure_sequence\?: number \| null;/);
  assert.match(historySection, /preventive_actions\?: string \| null;/);
});

test('asset 360 history section renders audited closures and recent activity', () => {
  assert.match(historySection, /export function Asset360HistorySection\(/);
  assert.match(historySection, /if \(auditedInterventions\.length === 0 && recentEvents\.length === 0\) return null;/);
  assert.match(historySection, /title="Historial de mantención"/);
  assert.match(historySection, /Últimas intervenciones auditadas/);
  assert.match(historySection, /Sin cierres auditados\./);
  assert.match(historySection, /Más historial/);
  assert.match(historySection, /Actividad reciente/);
});

test('asset 360 overview delegates maintenance history to the history section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/history-section'/);
  assert.match(overview, /<Asset360HistorySection[ \n]/);
  assert.match(overview, /auditedInterventions=\{auditedInterventions\}/);
  assert.match(overview, /recentEvents=\{recentEvents\}/);
  assert.match(overview, /auditedInterventions\?: Asset360AuditedIntervention\[\]/);
  assert.match(overview, /recentEvents\?: Asset360RecentEvent\[\]/);
  assert.doesNotMatch(overview, /Últimas intervenciones auditadas/);
  assert.doesNotMatch(overview, /Más historial/);
});

test('asset 360 drilling section owns the drilling evidence and economics types', () => {
  assert.match(drillingSection, /export type Asset360DrillEconomics = \{/);
  assert.match(drillingSection, /cost_clp_per_meter_90d\?: number \| string \| null;/);
  assert.match(drillingSection, /export type Asset360DrillingMaintenanceReviewRow = \{/);
  assert.match(drillingSection, /has_linked_work_order\?: boolean \| null;/);
  assert.match(drillingSection, /export type Asset360DrillingHistoryRow = \{/);
  assert.match(drillingSection, /drilled_meters\?: number \| string \| null;/);
  assert.match(drillingSection, /export type Asset360DrillOperationalEvidence = \{/);
  assert.match(drillingSection, /export type Asset360DrillEconomicsChange = \{/);
  assert.match(drillingSection, /cost_per_meter_change_pct\?: number \| string \| null;/);
});

test('asset 360 drilling section renders production, economics and reports', () => {
  assert.match(drillingSection, /export function Asset360DrillingSection\(/);
  assert.match(drillingSection, /if \(drillingHistory\.length === 0\) return null;/);
  assert.match(drillingSection, /title="Producción"/);
  assert.match(drillingSection, /Metros perforados acumulados/);
  assert.match(drillingSection, /Detalle operacional y económico/);
  assert.match(drillingSection, /Señales para revisión de mantención/);
  assert.match(drillingSection, /m en la muestra visible/);
  assert.match(drillingSection, /Sin metros registrados/);
});

test('asset 360 overview delegates drilling rendering to the drilling section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/drilling-section'/);
  assert.match(overview, /<Asset360DrillingSection[ \n]/);
  assert.match(overview, /consolidatedDrillingMeters=\{consolidatedDrillingMeters\}/);
  assert.match(overview, /lastDrillingDate=\{operatingSpine\?\.last_drilling_date\}/);
  assert.match(overview, /drillingHistory\?: Asset360DrillingHistoryRow\[\]/);
  assert.match(overview, /drillOperationalEvidence\?: Asset360DrillOperationalEvidence;/);
  assert.doesNotMatch(overview, /Metros perforados acumulados/);
  assert.doesNotMatch(overview, /Detalle operacional y económico/);
});

test('asset 360 planning section owns the maintenance priority and planning row types', () => {
  assert.match(planningSection, /export type Asset360MaintenancePriority = \{/);
  assert.match(planningSection, /next_due_meter\?: number \| string \| null;/);
  assert.match(planningSection, /recommended_action\?: string \| null;/);
  assert.match(planningSection, /export type Asset360MaintenancePlanningRow = \{/);
  assert.match(planningSection, /programming_status_raw\?: string \| null;/);
  assert.match(planningSection, /parts_status_raw\?: string \| null;/);
});

test('asset 360 planning section renders priority, threshold and fallback plan', () => {
  assert.match(planningSection, /export function Asset360PlanningSection\(/);
  assert.match(planningSection, /title="Planificación"/);
  assert.match(planningSection, /Umbral de intervención/);
  assert.match(planningSection, /Siguiente acción/);
  assert.match(planningSection, /Estado de planificación; no equivale a quiebre de stock/);
  assert.match(planningSection, /Sin planificación de mantenimiento enlazada/);
  assert.match(planningSection, /Crear plan estándar/);
  assert.match(planningSection, /planes-estandar\?new=1/);
});

test('asset 360 overview delegates planning rendering to the planning section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/planning-section'/);
  assert.match(overview, /<Asset360PlanningSection[ \n]/);
  assert.match(overview, /planningPriorityText=\{planningPriorityText\}/);
  assert.match(overview, /latestPlan=\{latestPlan\}/);
  assert.match(overview, /maintenancePriority\?: Asset360MaintenancePriority;/);
  assert.match(overview, /maintenancePlanning\?: Asset360MaintenancePlanningRow\[\];/);
  assert.doesNotMatch(overview, /Umbral de intervención/);
  assert.doesNotMatch(overview, /Crear plan estándar/);
});

test('asset 360 runtime section owns the runtime intelligence and meter history types', () => {
  assert.match(runtimeSection, /export type Asset360RuntimeCostIntelligence = \{/);
  assert.match(runtimeSection, /audited_cost_per_operating_hour\?: number \| string \| null;/);
  assert.match(runtimeSection, /material_meter_decrease_count\?: number \| string \| null;/);
  assert.match(runtimeSection, /export type Asset360MeterHistoryRow = \{/);
  assert.match(runtimeSection, /meter_value\?: number \| string \| null;/);
});

test('asset 360 runtime section renders meter usage and history', () => {
  assert.match(runtimeSection, /export function Asset360RuntimeSection\(/);
  assert.match(runtimeSection, /if \(!hasRuntimeEvidence\) return null;/);
  assert.match(runtimeSection, /y uso`/);
  assert.match(runtimeSection, /Horas observadas/);
  assert.match(runtimeSection, /Costo auditado \/ hora/);
  assert.match(runtimeSection, /Sólo cierres auditados y horas observadas/);
  assert.match(runtimeSection, /descenso material por revisar/);
  assert.match(runtimeSection, /reinicios detectados/);
});

test('asset 360 overview delegates runtime rendering to the runtime section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/runtime-section'/);
  assert.match(overview, /<Asset360RuntimeSection[ \n]/);
  assert.match(overview, /runtimeCostIntelligence=\{runtimeCostIntelligence\}/);
  assert.match(overview, /effectiveMeterDisplayLabel=\{effectiveMeterDisplayLabel\}/);
  assert.match(overview, /runtimeCostIntelligence\?: Asset360RuntimeCostIntelligence;/);
  assert.match(overview, /meterHistory\?: Asset360MeterHistoryRow\[\];/);
  assert.doesNotMatch(overview, /Horas observadas/);
  assert.doesNotMatch(overview, /descenso material por revisar/);
});

test('asset 360 intervention section owns the task signal and job plan types', () => {
  assert.match(interventionSection, /export type Asset360MaintenanceTaskCandidate = \{/);
  assert.match(interventionSection, /component_key\?: string \| null;/);
  assert.match(interventionSection, /signal_status\?: string \| null;/);
  assert.match(interventionSection, /export type Asset360StandardJobPlan = \{/);
  assert.match(interventionSection, /estimated_duration_hours\?: number \| string \| null;/);
  assert.match(interventionSection, /labor_people_required\?: number \| string \| null;/);
});

test('asset 360 intervention section renders signals and standard job plans', () => {
  assert.match(interventionSection, /export function Asset360InterventionSection\(/);
  assert.match(interventionSection, /if \(maintenanceTaskCandidates\.length === 0 && standardJobPlans\.length === 0\) return null;/);
  assert.match(interventionSection, /title="Señales de intervención"/);
  assert.match(interventionSection, /Evidencia operacional/);
  assert.match(interventionSection, /No equivalen a diagnóstico ni a una OT autorizada/);
  assert.match(interventionSection, /Planes estándar disponibles/);
  assert.match(interventionSection, /No hay señales operacionales enlazadas a este equipo\./);
});

test('asset 360 overview delegates intervention rendering to the intervention section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/intervention-section'/);
  assert.match(overview, /<Asset360InterventionSection[ \n]/);
  assert.match(overview, /maintenanceTaskCandidates=\{maintenanceTaskCandidates\}/);
  assert.match(overview, /standardJobPlans=\{standardJobPlans\}/);
  assert.match(overview, /maintenanceTaskCandidates\?: Asset360MaintenanceTaskCandidate\[\]/);
  assert.match(overview, /standardJobPlans\?: Asset360StandardJobPlan\[\]/);
  assert.doesNotMatch(overview, /Señales de intervención/);
  assert.doesNotMatch(overview, /Planes estándar disponibles/);
});

test('asset 360 format helpers live in the shared format module', () => {
  assert.match(format, /export const number = \(value: unknown, digits = 0\)/);
  assert.match(format, /export const money = \(value: unknown\)/);
  assert.match(format, /'Sin base'/);
  assert.match(format, /export const show = \(value: unknown\)/);
  assert.match(format, /'No informado'/);
  assert.match(format, /export const date = \(value: unknown\)/);
  assert.match(format, /es-CL', \{ dateStyle: 'medium' \}/);
  assert.match(format, /export const cleanEvidenceText = \(value: unknown\)/);
  assert.match(format, /'#ERROR!', 'NO REGISTRADO', 'N\/A', 'SIN ASIGNAR', 'NO ASIGNADO', 'DESCONOCIDO', '-'/);
});

test('asset 360 presentation primitives live in the shared primitives module', () => {
  assert.match(primitives, /export function IdentityItem\(/);
  assert.match(primitives, /icon: LucideIcon/);
  assert.match(primitives, /value: unknown/);
  assert.match(primitives, /export function SectionSummary\(/);
  assert.match(primitives, /title: string/);
  assert.match(primitives, /hint\?: string \| null/);
  assert.match(primitives, /Ver detalle/);
  assert.match(primitives, /group-open:rotate-180/);
});

test('asset 360 purchase section owns the purchase and supply chain types', () => {
  assert.match(purchaseSection, /export type Asset360SupplyChainRow = \{/);
  assert.match(purchaseSection, /work_order_id: string;/);
  assert.match(purchaseSection, /supply_chain_status\?: string \| null;/);
  assert.match(purchaseSection, /export type Asset360PurchaseHistorySummary = \{/);
  assert.match(purchaseSection, /matchBasis\?: 'cost_center' \| 'name_model' \| string \| null;/);
  assert.match(purchaseSection, /export type Asset360CostCenterPurchaseLine = \{/);
  assert.match(purchaseSection, /export type Asset360ProcurementOrder = \{/);
  assert.match(purchaseSection, /supplierScore\?: \{/);
});

test('asset 360 purchase section renders the purchase and supply evidence', () => {
  assert.match(purchaseSection, /export function Asset360PurchaseSection\(/);
  assert.match(purchaseSection, /if \(!hasPurchaseEvidence && supplyChain\.length === 0\) return null;/);
  assert.match(purchaseSection, /title="Compras y abastecimiento"/);
  assert.match(purchaseSection, /Abastecimiento por OT/);
  assert.match(purchaseSection, /Detalle de abastecimiento y compras/);
  assert.match(purchaseSection, /Gasto histórico neto registrado/);
  assert.match(purchaseSection, /Último proveedor/);
  assert.match(purchaseSection, /identificado de forma exacta en el histórico de compras/);
  assert.match(purchaseSection, /Sin compras enlazadas al equipo\./);
});

test('asset 360 overview delegates purchase rendering to the purchase section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/purchase-section'/);
  assert.match(overview, /<Asset360PurchaseSection[ \n]/);
  assert.match(overview, /supplyChain=\{supplyChain\}/);
  assert.match(overview, /purchaseHistorySummary=\{purchaseHistorySummary\}/);
  assert.match(overview, /costCenterCode=\{asset\.cost_center_code\}/);
  assert.match(overview, /supplyChain\?: Asset360SupplyChainRow\[\]/);
  assert.match(overview, /procurementOrders\?: Asset360ProcurementOrder\[\]/);
  assert.doesNotMatch(overview, /Abastecimiento por OT/);
  assert.doesNotMatch(overview, /Detalle de abastecimiento y compras/);
  assert.doesNotMatch(overview, /supplierScore\?: \{/);
});

test('asset 360 overview imports the shared helpers instead of defining them', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/format'/);
  assert.match(overview, /number,/);
  assert.doesNotMatch(overview, /const number = \(value: unknown/);
  assert.doesNotMatch(overview, /const money = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const show = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const date = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const cleanEvidenceText = \(value: unknown\)/);
  assert.doesNotMatch(overview, /function IdentityItem\(/);
  assert.doesNotMatch(overview, /function SectionSummary\(/);
});

test('asset 360 extracted sections own the shared primitives usage', () => {
  assert.match(economicsSection, /from '\.\/primitives'/);
  assert.match(economicsSection, /<IdentityItem[ \n]/);
  assert.match(maintenanceSection, /<SectionSummary[ \n]/);
  assert.match(availabilitySection, /<SectionSummary[ \n]/);
});

test('asset 360 overview still renders through the shared helpers', () => {
  assert.match(overview, /number\(/);
  assert.doesNotMatch(overview, /<IdentityItem[ \n]/);
  assert.doesNotMatch(overview, /<SectionSummary[ \n]/);
});

test('asset 360 overview delegates section summaries to the extracted sections', () => {
  assert.doesNotMatch(overview, /<SectionSummary[ \n]/);
  assert.match(maintenanceSection, /<SectionSummary[ \n]/);
  assert.match(availabilitySection, /<SectionSummary[ \n]/);
});


test('asset 360 identity header owns the header asset and item types', () => {
  assert.match(identityHeader, /export type Asset360IdentityItem = readonly \[string, string, LucideIcon, string \| null\];/);
  assert.match(identityHeader, /export type Asset360DetailItem = readonly \[string, string, LucideIcon, string\?\];/);
  assert.match(identityHeader, /export type Asset360HeaderMetric = readonly \[string, string \| number, LucideIcon\];/);
  assert.match(identityHeader, /export type Asset360HeaderAsset = \{/);
  assert.match(identityHeader, /cost_center_evidence_source\?: string \| null;/);
  assert.match(identityHeader, /license_plate_evidence_source\?: string \| null;/);
  assert.match(identityHeader, /reference_family_evidence_at\?: string \| null;/);
  assert.match(identityHeader, /operational_status_reason\?: string \| null;/);
});

test('asset 360 identity header renders image, identity, metrics and technical details', () => {
  assert.match(identityHeader, /export function Asset360IdentityHeader\(/);
  assert.match(identityHeader, /const \[failedImageSrc, setFailedImageSrc\] = useState<string \| null>\(null\);/);
  assert.match(identityHeader, /getEquipmentImageMeta\(/);
  assert.match(identityHeader, /Referencia de modelo/);
  assert.match(identityHeader, /Imagen no disponible\. La ficha sigue operativa\./);
  assert.match(identityHeader, /Centro de costo/);
  assert.match(identityHeader, /Recuperada desde evidencia operacional/);
  assert.match(identityHeader, /Recuperada desde el nombre del activo/);
  assert.match(identityHeader, /Datos técnicos/);
  assert.match(identityHeader, /Identificación física del equipo/);
  assert.match(identityHeader, /Ver QR/);
  assert.match(identityHeader, /assetDetails\.length\} datos/);
  assert.match(identityHeader, /Ficha técnica/);
  assert.match(identityHeader, /metrics\.map\(\(\[label, value, Icon\]\)/);
});

test('asset 360 overview delegates the identity header to the identity header component', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/identity-header'/);
  assert.match(overview, /<Asset360IdentityHeader[ \n]/);
  assert.match(overview, /assetNoun=\{noun\}/);
  assert.match(overview, /basePath=\{basePath\}/);
  assert.match(overview, /displayStatus=\{displayStatus\}/);
  assert.match(overview, /displayCriticality=\{displayCriticality\}/);
  assert.match(overview, /metrics=\{metrics\}/);
  assert.doesNotMatch(overview, /Referencia de modelo/);
  assert.doesNotMatch(overview, /Datos técnicos/);
  assert.doesNotMatch(overview, /const primaryIdentity = \[/);
  assert.doesNotMatch(overview, /const assetDetails = \[/);
  assert.doesNotMatch(overview, /const technicalIdentity = \[/);
  assert.doesNotMatch(overview, /getEquipmentImageMeta/);
  assert.doesNotMatch(overview, /failedImageSrc/);
});


test('asset 360 attention card owns the attention and actionable work order types', () => {
  assert.match(attentionCard, /export type Asset360Attention = \{/);
  assert.match(attentionCard, /detail: string;/);
  assert.match(attentionCard, /export type Asset360ActionableWorkOrder = \{/);
  assert.match(attentionCard, /standard_plan_steps_pending\?: number \| string \| null;/);
  assert.match(attentionCard, /import type \{ Asset360MaintenancePriority \} from '\.\/planning-section';/);
});

test('asset 360 attention card renders priority alerts and next action', () => {
  assert.match(attentionCard, /export function Asset360AttentionCard\(/);
  assert.match(attentionCard, /const attention: Asset360Attention = criticalOpen > 0/);
  assert.match(attentionCard, /OT crítica abierta/);
  assert.match(attentionCard, /Preventivo vencido/);
  assert.match(attentionCard, /Bloqueo operativo/);
  assert.match(attentionCard, /Trabajo pendiente/);
  assert.match(attentionCard, /Sin alertas operacionales/);
  assert.match(attentionCard, /if \(attention\.title === 'Sin alertas operacionales'\) return null;/);
  assert.match(attentionCard, /Continuar trabajo/);
  assert.match(attentionCard, /Margen: \{number\(maintenancePriority\.remaining_meter, 0\)\}/);
  assert.match(attentionCard, /Proyección: \{date\(maintenancePriority\.projected_due_at\)\}/);
});

test('asset 360 overview delegates attention rendering to the attention card', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/attention-card'/);
  assert.match(overview, /<Asset360AttentionCard[ \n]/);
  assert.match(overview, /criticalOpen=\{summary\.criticalOpen\}/);
  assert.match(overview, /planningPriorityText=\{planningPriorityText\}/);
  assert.match(overview, /actionableWorkOrder=\{actionableWorkOrder\}/);
  assert.match(overview, /maintenancePriority=\{maintenancePriority\}/);
  assert.doesNotMatch(overview, /Sin alertas operacionales/);
  assert.doesNotMatch(overview, /const attention = summary/);
  assert.doesNotMatch(overview, /showAttentionDetail/);
});


test('asset 360 maintenance section owns the preventive and reliability types', () => {
  assert.match(maintenanceSection, /export type Asset360NextPreventive = \{/);
  assert.match(maintenanceSection, /schedule_id: string;/);
  assert.match(maintenanceSection, /alert_due\?: boolean;/);
  assert.match(maintenanceSection, /export type Asset360Reliability = \{/);
  assert.match(maintenanceSection, /audited_closures\?: number;/);
  assert.match(maintenanceSection, /export type Asset360RuntimeReliability = \{/);
  assert.match(maintenanceSection, /valid_mtbf_intervals\?: number;/);
  assert.match(maintenanceSection, /import type \{ Asset360ActionableWorkOrder \} from '\.\/attention-card';/);
});

test('asset 360 maintenance section renders next preventive, execution and reliability', () => {
  assert.match(maintenanceSection, /export function Asset360MaintenanceSection\(/);
  assert.match(maintenanceSection, /const mtbf =/);
  assert.match(maintenanceSection, /const showExecutionCard = Boolean\(/);
  assert.match(maintenanceSection, /open=\{maintenanceNeedsAttention\}/);
  assert.match(maintenanceSection, /Próxima intervención/);
  assert.match(maintenanceSection, /Trabajo en curso/);
  assert.match(maintenanceSection, /Confiabilidad auditada/);
  assert.match(maintenanceSection, /Abrir pauta/);
  assert.match(maintenanceSection, /Ver confiabilidad/);
  assert.match(maintenanceSection, /Sin cierres auditados suficientes para métricas de confiabilidad/);
});

test('asset 360 overview delegates maintenance rendering to the maintenance section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/maintenance-section'/);
  assert.match(overview, /<Asset360MaintenanceSection[ \n]/);
  assert.match(overview, /nextPreventive=\{nextPreventive\}/);
  assert.match(overview, /runtimeResetCount=\{Number\(runtime\?\.reset_count \|\| 0\)\}/);
  assert.match(overview, /runtimeReliability=\{data\.runtimeReliability\}/);
  assert.match(overview, /nextPreventive\?: Asset360NextPreventive;/);
  assert.match(overview, /reliability\?: Asset360Reliability;/);
  assert.match(overview, /runtimeReliability\?: Asset360RuntimeReliability;/);
  assert.doesNotMatch(overview, /Confiabilidad auditada/);
  assert.doesNotMatch(overview, /const showExecutionCard = Boolean\(/);
  assert.doesNotMatch(overview, /const mtbf =/);
  assert.doesNotMatch(overview, /maintenanceNeedsAttention/);
});


test('asset 360 availability section owns the operational state type', () => {
  assert.match(availabilitySection, /export type Asset360OperationalState = \{/);
  assert.match(availabilitySection, /availability_pct\?: number \| string \| null;/);
  assert.match(availabilitySection, /last_availability_date\?: string \| null;/);
  assert.match(availabilitySection, /downtime_minutes_30d\?: number \| string \| null;/);
});

test('asset 360 availability section renders availability, downtime and open work orders', () => {
  assert.match(availabilitySection, /export function Asset360AvailabilitySection\(/);
  assert.match(availabilitySection, /const hasAvailabilityEvidence = Boolean\(/);
  assert.match(availabilitySection, /if \(!hasAvailabilityEvidence\) return null;/);
  assert.match(availabilitySection, /title="Disponibilidad"/);
  assert.match(availabilitySection, /label="Detención registrada"/);
  assert.match(availabilitySection, /label="OT abiertas"/);
  assert.match(availabilitySection, /Período: últimos 30 días/);
  assert.match(availabilitySection, /Acumulado al corte/);
});

test('asset 360 overview delegates availability rendering to the availability section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/availability-section'/);
  assert.match(overview, /<Asset360AvailabilitySection[ \n]/);
  assert.match(overview, /operationalState=\{operationalState\}/);
  assert.match(overview, /generatedAt=\{data\.generatedAt\}/);
  assert.match(overview, /operationalState\?: Asset360OperationalState;/);
  assert.doesNotMatch(overview, /Sin base de disponibilidad/);
  assert.doesNotMatch(overview, /const hasAvailabilityEvidence = Boolean\(/);
});


test('asset 360 economics section owns the economic history row type', () => {
  assert.match(economicsSection, /export type Asset360EconomicHistoryRow = \{/);
  assert.match(economicsSection, /fiscal_year\?: number \| null;/);
  assert.match(economicsSection, /historical_total_cost\?: number \| string \| null;/);
  assert.match(economicsSection, /import type \{ Asset360OperationalState \} from '\.\/availability-section';/);
});

test('asset 360 economics section renders investment summary and yearly detail', () => {
  assert.match(economicsSection, /export function Asset360EconomicsSection\(/);
  assert.match(economicsSection, /const economicLifetime = economicHistory\.reduce\(/);
  assert.match(economicsSection, /Inversión en mantenimiento/);
  assert.match(economicsSection, /Histórico acumulado/);
  assert.match(economicsSection, /Últimos 12 meses/);
  assert.match(economicsSection, /Detalle económico/);
  assert.match(economicsSection, /Sin historial de costos enlazado/);
  assert.match(economicsSection, /años con movimientos/);
  assert.match(economicsSection, /economicHistory\.slice\(0, 6\)\.map\(\(row\)/);
});

test('asset 360 overview delegates economics rendering to the economics section', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/economics-section'/);
  assert.match(overview, /<Asset360EconomicsSection[ \n]/);
  assert.match(overview, /economicHistory=\{economicHistory\}/);
  assert.match(overview, /lastCostEventAt=\{operatingSpine\?\.last_cost_event_at\}/);
  assert.match(overview, /economicHistory\?: Asset360EconomicHistoryRow\[\];/);
  assert.doesNotMatch(overview, /Inversión en mantenimiento/);
  assert.doesNotMatch(overview, /const economicLifetime = economicHistory\.reduce\(/);
});


test('asset 360 module keeps single sources of truth after cohesion cleanup', () => {
  assert.doesNotMatch(overview, /const unavailableSources =/);
  assert.doesNotMatch(overview, /type Metric = \[/);
  assert.match(overview, /const metrics: Asset360HeaderMetric\[\] = \[/);
  assert.match(overview, /closeReadiness\?: Asset360ActionableWorkOrder\[\];/);
  assert.match(overview, /Asset360ActionableWorkOrder,\n  Asset360AttentionCard,\n\} from '@\/components\/maintenance\/asset-360\/attention-card';/);
  assert.doesNotMatch(overview, /type LucideIcon,/);
});
