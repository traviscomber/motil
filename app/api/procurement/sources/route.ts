export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type ProvenanceRow = {
  source_file: string | null;
  imported_at: string | null;
};

type SourceKind = 'canonical_file' | 'operational_baseline' | 'system_generated' | 'test';

function classifySource(sourceFile: string): SourceKind {
  const normalized = sourceFile.trim().toLowerCase();
  if (normalized.includes('uat') || normalized.includes('test')) return 'test';
  if (normalized === 'system') return 'system_generated';
  if (normalized.startsWith('public.') || normalized.startsWith('canonical.')) return 'operational_baseline';
  if (/\.(xlsx|xls|csv|pdf)$/i.test(normalized)) return 'canonical_file';
  return 'operational_baseline';
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const rows: Array<ProvenanceRow & { domain: 'purchase_orders' | 'suppliers' }> = [];
  const pageSize = 1000;

  for (const source of [
    { table: 'canonical_purchase_orders_v1', domain: 'purchase_orders' as const },
    { table: 'canonical_suppliers_v1', domain: 'suppliers' as const },
  ]) {
    let start = 0;
    while (true) {
      const { data, error } = await context.supabase
        .from(source.table)
        .select('source_file,imported_at')
        .eq('organization_id', context.organizationId)
        .order('source_file')
        .range(start, start + pageSize - 1);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const batch = (data || []) as ProvenanceRow[];
      rows.push(...batch.map((row) => ({ ...row, domain: source.domain })));
      if (batch.length < pageSize) break;
      start += pageSize;
    }
  }

  const bySource = new Map<string, {
    rows: number;
    domains: Set<string>;
    firstImportedAt: string | null;
    lastImportedAt: string | null;
  }>();

  for (const row of rows) {
    const sourceFile = String(row.source_file || '').trim();
    if (!sourceFile) continue;
    const existing = bySource.get(sourceFile) || {
      rows: 0,
      domains: new Set<string>(),
      firstImportedAt: null,
      lastImportedAt: null,
    };
    existing.rows += 1;
    existing.domains.add(row.domain);
    if (row.imported_at) {
      if (!existing.firstImportedAt || row.imported_at < existing.firstImportedAt) existing.firstImportedAt = row.imported_at;
      if (!existing.lastImportedAt || row.imported_at > existing.lastImportedAt) existing.lastImportedAt = row.imported_at;
    }
    bySource.set(sourceFile, existing);
  }

  const [purchaseOrdersCount, suppliersCount, documentsCount] = await Promise.all([
    context.supabase
      .from('canonical_purchase_orders_current')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('canonical_suppliers_v1')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('module_documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('module', 'compras')
      .is('deleted_at', null),
  ]);

  const countError = purchaseOrdersCount.error || suppliersCount.error || documentsCount.error;
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const sources = Array.from(bySource.entries())
    .map(([sourceFile, value]) => ({
      sourceFile,
      kind: classifySource(sourceFile),
      rows: value.rows,
      domains: Array.from(value.domains).sort(),
      firstImportedAt: value.firstImportedAt,
      lastImportedAt: value.lastImportedAt,
      canonical: classifySource(sourceFile) === 'canonical_file',
    }))
    .sort((a, b) => b.rows - a.rows || a.sourceFile.localeCompare(b.sourceFile, 'es'));

  return NextResponse.json({
    data: sources,
    summary: {
      sources: sources.length,
      canonicalFiles: sources.filter((item) => item.kind === 'canonical_file').length,
      operationalBaselines: sources.filter((item) => item.kind === 'operational_baseline').length,
      systemGenerated: sources.filter((item) => item.kind === 'system_generated').length,
      excludedTests: sources.filter((item) => item.kind === 'test').length,
      canonicalPurchaseOrders: purchaseOrdersCount.count ?? 0,
      canonicalSuppliers: suppliersCount.count ?? 0,
      documentCoreRecords: documentsCount.count ?? 0,
    },
    policy: {
      canonical_file: 'Archivo entregado e incorporado directamente al modelo canónico.',
      operational_baseline: 'Tabla o baseline operacional preservado como origen. No se presenta como archivo entregado.',
      system_generated: 'Registro creado por el sistema y separado de fuentes históricas.',
      test: 'Fuente de prueba; no cuenta como baseline productivo.',
    },
  });
}
