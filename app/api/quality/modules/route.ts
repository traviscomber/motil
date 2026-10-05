export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { countGate, freshnessGate, scoreModuleQuality } from '@/lib/quality/module-quality';

type Probe = {
  key: string;
  label: string;
  href: string;
  canonical: { table: string; orgColumn?: string };
  operation: { table: string; orgColumn?: string; freshnessField?: string };
  integration: { table: string; orgColumn?: string; optional?: boolean };
  audit: { table: string; orgColumn?: string; optional?: boolean };
};

const MODULES: Probe[] = [
  { key: 'production', label: 'Producción', href: '/dashboard/produccion', canonical: { table: 'production_source_documents', orgColumn: 'organization_id' }, operation: { table: 'production_operator_activity', orgColumn: 'organization_id', freshnessField: 'operation_date' }, integration: { table: 'operational_maintenance_reviews', orgColumn: 'organization_id' }, audit: { table: 'production_source_documents', orgColumn: 'organization_id' } },
  { key: 'geology', label: 'Geología', href: '/dashboard/produccion/geologia', canonical: { table: 'production_drill_holes', orgColumn: 'organization_id' }, operation: { table: 'production_drill_hole_location_evidence', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'drilling_maintenance_review_queue_v1', orgColumn: 'organization_id', optional: true }, audit: { table: 'production_source_documents', orgColumn: 'organization_id' } },
  { key: 'maintenance', label: 'Mantenimiento', href: '/dashboard/mantenimiento', canonical: { table: 'maintenance_assets', orgColumn: 'organization_id' }, operation: { table: 'maintenance_work_orders', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'work_order_supply_chain_v1', orgColumn: 'organization_id', optional: true }, audit: { table: 'work_order_events', orgColumn: 'organization_id' } },
  { key: 'warehouse', label: 'Bodega', href: '/dashboard/bodega', canonical: { table: 'canonical_products_v1', orgColumn: 'organization_id' }, operation: { table: 'canonical_inventory_current', orgColumn: 'organization_id' }, integration: { table: 'work_order_supply_chain_v1', orgColumn: 'organization_id', optional: true }, audit: { table: 'product_media', orgColumn: 'organization_id', optional: true } },
  { key: 'procurement', label: 'Compras', href: '/dashboard/compras', canonical: { table: 'procurement_intake_requests', orgColumn: 'organization_id' }, operation: { table: 'procurement_operational_orders', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'procurement_supplier_invoices', orgColumn: 'organization_id' }, audit: { table: 'procurement_documents', orgColumn: 'organization_id', optional: true } },
  { key: 'finance', label: 'Finanzas', href: '/dashboard/finanzas', canonical: { table: 'canonical_finance_assets', orgColumn: 'organization_id' }, operation: { table: 'procurement_accounts_payable', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'work_order_final_cost_v1', orgColumn: 'organization_id', optional: true }, audit: { table: 'procurement_supplier_invoices', orgColumn: 'organization_id' } },
  { key: 'rrhh', label: 'RRHH', href: '/dashboard/rrhh', canonical: { table: 'people', orgColumn: 'organization_id' }, operation: { table: 'people_employment_assignments', orgColumn: 'organization_id', freshnessField: 'updated_at' }, integration: { table: 'eecc', orgColumn: 'organization_id' }, audit: { table: 'people_case_events', orgColumn: 'organization_id', optional: true } },
  { key: 'hse', label: 'HSE / Sostenibilidad', href: '/dashboard/sostenibilidad', canonical: { table: 'hse_master_documents', orgColumn: 'organization_id' }, operation: { table: 'compliance_events', orgColumn: 'org_id', freshnessField: 'created_at' }, integration: { table: 'inspecciones_externas', orgColumn: 'organization_id', optional: true }, audit: { table: 'document_audit_log', orgColumn: 'organization_id', optional: true } },
  { key: 'legal', label: 'Legal', href: '/dashboard/legal', canonical: { table: 'module_documents', orgColumn: 'organization_id' }, operation: { table: 'legal_cases', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'procurement_supplier_invoices', orgColumn: 'organization_id', optional: true }, audit: { table: 'document_audit_log', orgColumn: 'organization_id', optional: true } },
  { key: 'documents', label: 'Documentos', href: '/dashboard/documentos', canonical: { table: 'module_documents', orgColumn: 'organization_id' }, operation: { table: 'documents', orgColumn: 'organization_id', freshnessField: 'created_at' }, integration: { table: 'document_approvals_v1', orgColumn: 'organization_id', optional: true }, audit: { table: 'document_audit_log', orgColumn: 'organization_id' } },
];

async function countRows(supabase: any, organizationId: string, source: { table: string; orgColumn?: string }) {
  let query = supabase.from(source.table).select('*', { count: 'exact', head: true });
  if (source.orgColumn) query = query.eq(source.orgColumn, organizationId);
  const result = await query;
  if (result.error) return null;
  return result.count ?? 0;
}

async function latestValue(supabase: any, organizationId: string, source: Probe['operation']) {
  if (!source.freshnessField) return null;
  let query = supabase.from(source.table).select(source.freshnessField).not(source.freshnessField, 'is', null);
  if (source.orgColumn) query = query.eq(source.orgColumn, organizationId);
  const result = await query.order(source.freshnessField, { ascending: false }).limit(1).maybeSingle();
  if (result.error || !result.data) return null;
  return String(result.data[source.freshnessField] || '');
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const role = String(context.role || '').trim().toLowerCase();
  if (!['superadmin', 'admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: quality governance access required' }, { status: 403 });
  }

  const modules = [];
  for (const module of MODULES) {
    const [canonical, operation, integration, audit, freshness] = await Promise.all([
      countRows(context.supabase, context.organizationId, module.canonical),
      countRows(context.supabase, context.organizationId, module.operation),
      countRows(context.supabase, context.organizationId, module.integration),
      countRows(context.supabase, context.organizationId, module.audit),
      latestValue(context.supabase, context.organizationId, module.operation),
    ]);

    modules.push(scoreModuleQuality({
      key: module.key,
      label: module.label,
      href: module.href,
      gates: [
        countGate('canonical', 'Fuente canónica', 25, canonical),
        countGate('operation', 'Operación real', 25, operation),
        countGate('integration', 'Integración transversal', 20, integration, !module.integration.optional),
        countGate('audit', 'Trazabilidad / auditoría', 15, audit, !module.audit.optional),
        freshnessGate(freshness),
      ],
    }));
  }

  const certified = modules.filter((module) => module.certified).length;
  return NextResponse.json({
    target: 9.7,
    certified,
    total: modules.length,
    modules,
    generated_at: new Date().toISOString(),
    statement: '9,7 exige PASS en todos los gates. No se compensa una falla operacional con UI o volumen de código.',
  });
}
