export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveDataHealthAccess } from '@/lib/intelligence/data-health-access';

type HealthStatus = 'healthy' | 'watch' | 'critical' | 'unknown';

type QueryResult = { data: any; error: any; count?: number | null };
const emptyRows = (): Promise<QueryResult> => Promise.resolve({ data: [], error: null, count: 0 });
const emptyOne = (): Promise<QueryResult> => Promise.resolve({ data: null, error: null });

function daysOld(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const ms = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function freshnessStatus(days: number | null): HealthStatus {
  if (days === null) return 'unknown';
  if (days > 14) return 'critical';
  if (days > 7) return 'watch';
  return 'healthy';
}

export async function GET(request: NextRequest) {
  const access = await resolveDataHealthAccess(request);
  if (!access.ok) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const org = context.organizationId;
    const productionAllowed = access.canRead('production');
    const maintenanceAllowed = access.canRead('maintenance');
    const inventoryAllowed = access.canRead('inventory');
    const procurementAllowed = access.canRead('procurement');

    const [
      productionChecks,
      transportLatest,
      metallurgyLatest,
      drillingLatest,
      drillingQueue,
      inventoryOverview,
      inventorySnapshot,
      workOrders,
      poQuality,
      procurementExceptions,
      exceptionCenter,
      activeMaintenanceAssets,
      deterministicReconciliation,
      reviewRequiredReconciliation,
      rawMeterRows,
      meterObservations,
    ] = await Promise.all([
      productionAllowed ? context.supabase.from('production_canonical_package_quality_v1').select('status').eq('organization_id', org) : emptyRows(),
      productionAllowed ? context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', org).order('movement_date', { ascending: false }).limit(1) : emptyRows(),
      productionAllowed ? context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1) : emptyRows(),
      productionAllowed ? context.supabase.from('production_drilling_source_reports').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1) : emptyRows(),
      productionAllowed ? context.supabase.from('production_drill_hole_location_review_queue_v5').select('drill_hole_id', { count: 'exact', head: true }).eq('organization_id', org) : emptyRows(),
      inventoryAllowed ? context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', org).maybeSingle() : emptyOne(),
      inventoryAllowed ? context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', org).order('snapshot_date', { ascending: false }).limit(1) : emptyRows(),
      maintenanceAllowed ? context.supabase.from('maintenance_work_orders').select('status, canonical_asset_id').eq('organization_id', org) : emptyRows(),
      procurementAllowed ? context.supabase.from('purchase_order_quality').select('quality_status').eq('organization_id', org) : emptyRows(),
      procurementAllowed ? context.supabase.from('procurement_match_exceptions').select('status').eq('organization_id', org) : emptyRows(),
      maintenanceAllowed ? context.supabase.from('operational_exception_center_summary_v1').select('*').eq('organization_id', org).maybeSingle() : emptyOne(),
      maintenanceAllowed ? context.supabase.from('canonical_assets_current').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('is_active', true) : emptyRows(),
      maintenanceAllowed ? context.supabase.from('maintenance_asset_reconciliation_v1').select('canonical_asset_id', { count: 'exact', head: true }).eq('organization_id', org).eq('reconciliation_status', 'deterministic_candidate') : emptyRows(),
      maintenanceAllowed ? context.supabase.from('maintenance_asset_reconciliation_v1').select('canonical_asset_id', { count: 'exact', head: true }).eq('organization_id', org).eq('reconciliation_status', 'review_required') : emptyRows(),
      maintenanceAllowed ? context.supabase.from('planning_asset_meter_readings').select('id', { count: 'exact', head: true }).eq('organization_id', org) : emptyRows(),
      maintenanceAllowed ? context.supabase.from('planning_asset_meter_observations_v1').select('id', { count: 'exact', head: true }).eq('organization_id', org) : emptyRows(),
    ] as Promise<QueryResult>[]);

    const failures = [productionChecks, transportLatest, metallurgyLatest, drillingLatest, drillingQueue, inventoryOverview, inventorySnapshot, workOrders, poQuality, procurementExceptions, exceptionCenter, activeMaintenanceAssets, deterministicReconciliation, reviewRequiredReconciliation, rawMeterRows, meterObservations]
      .map((result: QueryResult) => result.error)
      .filter(Boolean);
    if (failures.length) throw failures[0];

    const domains: any[] = [];

    if (productionAllowed) {
      const transportDate = transportLatest.data?.[0]?.movement_date || null;
      const metallurgyDate = metallurgyLatest.data?.[0]?.operation_date || null;
      const drillingDate = drillingLatest.data?.[0]?.operation_date || null;
      const prodChecks = productionChecks.data || [];
      const productionFailed = prodChecks.filter((row: any) => !['PASS', 'pass'].includes(String(row.status))).length;
      const productionFreshness = [transportDate, metallurgyDate, drillingDate].map(daysOld);
      const productionAges = productionFreshness.filter((value): value is number => value !== null);
      const productionWorstAge = productionAges.length ? Math.max(...productionAges) : null;
      const productionMissingFreshness = productionFreshness.some((value) => value === null);
      const productionHasEvidence = prodChecks.length > 0 && !productionMissingFreshness;
      const productionStatus: HealthStatus = productionFailed > 0
        ? 'critical'
        : !productionHasEvidence
          ? 'unknown'
          : freshnessStatus(productionWorstAge);

      domains.push({
        key: 'production',
        label: 'Producción',
        status: productionStatus,
        headline: productionFailed > 0
          ? `${productionFailed} check(s) canónicos fuera de PASS`
          : prodChecks.length === 0
            ? 'Sin checks canónicos evaluables'
            : productionMissingFreshness
              ? 'Cobertura temporal incompleta en fuentes de Producción'
              : `${prodChecks.length}/${prodChecks.length} checks canónicos PASS`,
        metrics: [
          { label: 'Transporte · último dato', value: transportDate, ageDays: daysOld(transportDate) },
          { label: 'Planta · último dato', value: metallurgyDate, ageDays: daysOld(metallurgyDate) },
          { label: 'Sondaje · último dato', value: drillingDate, ageDays: daysOld(drillingDate) },
          { label: 'Ubicaciones Sondaje pendientes', value: drillingQueue.count ?? 0 },
        ],
        action: productionFailed > 0
          ? 'Revisar checks canónicos antes de usar indicadores.'
          : !productionHasEvidence
            ? 'Recuperar la evidencia faltante antes de declarar la fuente confiable.'
            : productionWorstAge !== null && productionWorstAge > 7
              ? 'Actualizar las fuentes operacionales atrasadas.'
              : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/produccion/inteligencia',
      });
    }

    if (maintenanceAllowed) {
      const closedStatuses = new Set(['completed', 'closed', 'cancelled', 'canceled']);
      const allWorkOrders = workOrders.data || [];
      const openWorkOrders = allWorkOrders.filter((row: any) => !closedStatuses.has(String(row.status || '').toLowerCase()));
      const openMissingAsset = openWorkOrders.filter((row: any) => !row.canonical_asset_id).length;
      const historicalMissingAsset = allWorkOrders.filter((row: any) => !row.canonical_asset_id).length;
      const activeAssetCount = activeMaintenanceAssets.count ?? null;
      const deterministicCandidateCount = deterministicReconciliation.count ?? null;
      const reviewRequiredCount = reviewRequiredReconciliation.count ?? null;
      const rawMeterCount = rawMeterRows.count ?? null;
      const observationCount = meterObservations.count ?? null;
      const absorbedDuplicateRows =
        rawMeterCount !== null && observationCount !== null
          ? Math.max(0, rawMeterCount - observationCount)
          : null;
      const maintenanceStatus: HealthStatus =
        openMissingAsset > 0
          ? 'critical'
          : allWorkOrders.length === 0
            ? 'unknown'
            : reviewRequiredCount !== null && reviewRequiredCount > 0
              ? 'watch'
              : activeAssetCount === null || activeAssetCount === 0
                ? 'unknown'
                : 'healthy';

      domains.push({
        key: 'maintenance',
        label: 'Mantención',
        status: maintenanceStatus,
        headline: openMissingAsset > 0
          ? `${openMissingAsset} OT activa(s) sin activo canónico`
          : reviewRequiredCount !== null && reviewRequiredCount > 0
            ? `${reviewRequiredCount} activo(s) requieren revisión humana de datos`
            : activeAssetCount === null || activeAssetCount === 0
              ? 'Sin activos canónicos evaluables'
              : 'Identidad y evidencia de Mantención bajo control',
        metrics: [
          { label: 'Activos canónicos activos', value: activeAssetCount },
          { label: 'OT abiertas', value: allWorkOrders.length === 0 ? null : openWorkOrders.length },
          { label: 'OT activas sin equipo', value: allWorkOrders.length === 0 ? null : openMissingAsset },
          { label: 'Conciliaciones determinísticas pendientes', value: deterministicCandidateCount },
          { label: 'Casos que requieren revisión humana', value: reviewRequiredCount },
          { label: 'Filas duplicadas de medidor absorbidas', value: absorbedDuplicateRows },
          { label: 'Excepciones operacionales Mantención', value: exceptionCenter.data ? Number((exceptionCenter.data as any).maintenance_items || 0) : null },
        ],
        action: openMissingAsset > 0
          ? 'Resolver identidad del equipo en las OT activas.'
          : reviewRequiredCount !== null && reviewRequiredCount > 0
            ? 'Revisar sólo los casos contradictorios; no inferir el maestro.'
            : deterministicCandidateCount !== null && deterministicCandidateCount > 0
              ? 'Validar las conciliaciones determinísticas antes de materializarlas.'
              : 'Mantener conciliación y evidencia canónica en nuevas OT y lecturas.',
        href: '/dashboard/mantenimiento/inteligencia',
      });
    }

    if (inventoryAllowed) {
      const inventoryDate = inventorySnapshot.data?.[0]?.snapshot_date || null;
      const inventory = inventoryOverview.data as any;
      const inventoryHasOverview = Boolean(inventory);
      const negativeStock = inventoryHasOverview ? Number(inventory?.negative_stock_products || 0) : 0;
      const inventoryAge = daysOld(inventoryDate);
      const inventoryStatus: HealthStatus = negativeStock > 0 ? 'critical' : !inventoryHasOverview || inventoryAge === null ? 'unknown' : freshnessStatus(inventoryAge);

      domains.push({
        key: 'inventory',
        label: 'Inventario',
        status: inventoryStatus,
        headline: negativeStock > 0
          ? `${negativeStock} producto(s) con stock negativo`
          : !inventoryHasOverview || inventoryAge === null
            ? 'Sin evidencia suficiente para acreditar la salud del inventario'
            : 'Sin stock negativo detectado',
        metrics: [
          { label: 'Snapshot más reciente', value: inventoryDate, ageDays: inventoryAge },
          { label: 'Productos con stock', value: inventoryHasOverview ? Number(inventory?.products_with_stock || 0) : null },
          { label: 'Sin stock', value: inventoryHasOverview ? Number(inventory?.out_of_stock_products || 0) : null },
          { label: 'Bajo punto de reposición', value: inventoryHasOverview ? Number(inventory?.reorder_products || 0) : null },
        ],
        action: negativeStock > 0
          ? 'Conciliar movimientos y saldos negativos antes de decisiones de abastecimiento.'
          : !inventoryHasOverview || inventoryAge === null
            ? 'Recuperar overview y snapshot antes de declarar el inventario confiable.'
            : inventoryAge > 7
              ? 'Actualizar snapshot de inventario.'
              : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/bodega',
      });
    }

    if (procurementAllowed) {
      const poRows = poQuality.data || [];
      const poWarnings = poRows.filter((row: any) => String(row.quality_status).toLowerCase() !== 'valid').length;
      const openProcurementExceptions = (procurementExceptions.data || []).filter((row: any) => !['resolved', 'closed', 'ignored'].includes(String(row.status || '').toLowerCase())).length;
      const procurementStatus: HealthStatus = openProcurementExceptions > 0 ? 'critical' : poWarnings > 0 ? 'watch' : poRows.length === 0 ? 'unknown' : 'healthy';

      domains.push({
        key: 'procurement',
        label: 'Compras',
        status: procurementStatus,
        headline: openProcurementExceptions > 0
          ? `${openProcurementExceptions} excepción(es) de matching abiertas`
          : poWarnings > 0
            ? `${poWarnings} OC con warning de calidad`
            : poRows.length === 0
              ? 'Sin OC evaluables para acreditar calidad de Compras'
              : 'OC evaluadas sin warnings de calidad abiertos',
        metrics: [
          { label: 'OC evaluadas', value: poRows.length === 0 ? null : poRows.length },
          { label: 'OC válidas', value: poRows.length === 0 ? null : poRows.length - poWarnings },
          { label: 'OC con warning', value: poRows.length === 0 ? null : poWarnings },
          { label: 'Excepciones de matching abiertas', value: openProcurementExceptions },
        ],
        action: openProcurementExceptions > 0
          ? 'Resolver excepciones de matching antes del cierre de compra.'
          : poWarnings > 0
            ? 'Revisar las OC con warning; no implican bloqueo automático.'
            : poRows.length === 0
              ? 'Recuperar evidencia de OC antes de declarar Compras confiable.'
              : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/compras',
      });
    }

    const rank: Record<HealthStatus, number> = { critical: 3, watch: 2, unknown: 1, healthy: 0 };
    const overall = domains.reduce<HealthStatus>((worst, domain) => rank[domain.status as HealthStatus] > rank[worst] ? domain.status as HealthStatus : worst, 'healthy');

    return NextResponse.json({
      overall,
      domains,
      authorizedDomains: access.domains,
      generatedAt: new Date().toISOString(),
      policy: {
        freshnessWatchDays: 7,
        freshnessCriticalDays: 14,
        authorization: 'Sólo se consultan y exponen dominios que el usuario puede leer según role_matrix.',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo calcular la salud de datos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
