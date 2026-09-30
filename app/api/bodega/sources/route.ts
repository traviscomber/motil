export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type SourceRow = {
  source_file: string | null;
  imported_at: string | null;
};

type SourceKind = 'canonical_file' | 'operational_baseline' | 'test';

function classifySource(sourceFile: string): SourceKind {
  const normalized = sourceFile.trim().toLowerCase();
  if (normalized.includes('uat') || normalized.includes('test')) return 'test';
  if (normalized.endsWith('.xlsx') || normalized.endsWith('.xls') || normalized.endsWith('.csv')) return 'canonical_file';
  return 'operational_baseline';
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const sourceRows: SourceRow[] = [];
  const pageSize = 1000;
  let start = 0;

  while (true) {
    const { data, error } = await context.supabase
      .from('canonical_products_v1')
      .select('source_file,imported_at')
      .eq('organization_id', context.organizationId)
      .order('source_file')
      .range(start, start + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const batch = (data || []) as SourceRow[];
    sourceRows.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }

  const bySource = new Map<string, { rows: number; firstImportedAt: string | null; lastImportedAt: string | null }>();
  for (const row of sourceRows) {
    const sourceFile = String(row.source_file || '').trim();
    if (!sourceFile) continue;
    const existing = bySource.get(sourceFile) || { rows: 0, firstImportedAt: null, lastImportedAt: null };
    existing.rows += 1;
    if (row.imported_at) {
      if (!existing.firstImportedAt || row.imported_at < existing.firstImportedAt) existing.firstImportedAt = row.imported_at;
      if (!existing.lastImportedAt || row.imported_at > existing.lastImportedAt) existing.lastImportedAt = row.imported_at;
    }
    bySource.set(sourceFile, existing);
  }

  const sources = Array.from(bySource.entries())
    .map(([sourceFile, value]) => ({
      sourceFile,
      kind: classifySource(sourceFile),
      rows: value.rows,
      firstImportedAt: value.firstImportedAt,
      lastImportedAt: value.lastImportedAt,
      canonical: classifySource(sourceFile) === 'canonical_file',
    }))
    .sort((a, b) => b.rows - a.rows || a.sourceFile.localeCompare(b.sourceFile, 'es'));

  const { count: inventoryRows, error: inventoryError } = await context.supabase
    .from('canonical_inventory_current')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId);

  if (inventoryError) {
    return NextResponse.json({ error: inventoryError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: sources,
    summary: {
      sources: sources.length,
      canonicalFiles: sources.filter((item) => item.kind === 'canonical_file').length,
      operationalBaselines: sources.filter((item) => item.kind === 'operational_baseline').length,
      excludedTests: sources.filter((item) => item.kind === 'test').length,
      productRows: sourceRows.length,
      inventoryRows: inventoryRows ?? 0,
    },
    policy: {
      canonical_file: 'Archivo entregado e incorporado al modelo canónico de productos.',
      operational_baseline: 'Fuente operacional preservada como baseline; no se presenta como archivo entregado.',
      test: 'Registro UAT o de prueba; no cuenta como fuente productiva canónica.',
    },
  });
}
