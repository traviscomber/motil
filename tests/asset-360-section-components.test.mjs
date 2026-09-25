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
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/primitives'/);
  assert.match(overview, /date,/);
  assert.match(overview, /IdentityItem, SectionSummary/);
  assert.doesNotMatch(overview, /const number = \(value: unknown/);
  assert.doesNotMatch(overview, /const money = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const show = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const date = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const cleanEvidenceText = \(value: unknown\)/);
  assert.doesNotMatch(overview, /function IdentityItem\(/);
  assert.doesNotMatch(overview, /function SectionSummary\(/);
});

test('asset 360 overview still renders through the shared primitives', () => {
  assert.match(overview, /<IdentityItem[ \n]/);
  assert.match(overview, /<SectionSummary[ \n]/);
  assert.match(overview, /number\(/);
  assert.match(overview, /money\(/);
  assert.match(overview, /date\(/);
});
