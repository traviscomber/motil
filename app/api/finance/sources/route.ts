export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const SOURCE_DEFINITIONS = [
  {
    sourceTable: 'canonical.asset_costs',
    recognitionStatus: 'recognized',
    label: 'Costos de activos',
    meaning: 'Costo reconocido',
  },
  {
    sourceTable: 'canonical.purchase_order_lines',
    recognitionStatus: 'committed',
    label: 'Líneas de órdenes de compra',
    meaning: 'Compra comprometida',
  },
] as const;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const sources = await Promise.all(SOURCE_DEFINITIONS.map(async (definition) => {
    const base = () => context.supabase
      .from('canonical_finance_source_audit')
      .select('event_id,event_at,amount,currency', { count: 'exact' })
      .eq('organization_id', context.organizationId)
      .eq('source_table', definition.sourceTable)
      .eq('recognition_status', definition.recognitionStatus);

    const [countResult, firstResult, lastResult] = await Promise.all([
      context.supabase
        .from('canonical_finance_source_audit')
        .select('event_id', { count: 'exact', head: true })
        .eq('organization_id', context.organizationId)
        .eq('source_table', definition.sourceTable)
        .eq('recognition_status', definition.recognitionStatus),
      base().order('event_at', { ascending: true }).limit(1).maybeSingle(),
      base().order('event_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const error = countResult.error || firstResult.error || lastResult.error;
    if (error) throw error;

    return {
      ...definition,
      records: countResult.count ?? 0,
      firstEventAt: firstResult.data?.event_at ?? null,
      lastEventAt: lastResult.data?.event_at ?? null,
      currency: lastResult.data?.currency ?? firstResult.data?.currency ?? 'CLP',
      provenanceKind: 'canonical_table' as const,
    };
  }));

  const { count: financeDocuments, error: documentsError } = await context.supabase
    .from('module_documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId)
    .eq('module', 'finanzas')
    .is('deleted_at', null);

  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 500 });

  return NextResponse.json({
    data: sources,
    summary: {
      sources: sources.length,
      auditEvents: sources.reduce((sum, source) => sum + source.records, 0),
      recognizedEvents: sources.filter((source) => source.recognitionStatus === 'recognized').reduce((sum, source) => sum + source.records, 0),
      committedEvents: sources.filter((source) => source.recognitionStatus === 'committed').reduce((sum, source) => sum + source.records, 0),
      documentCoreRecords: financeDocuments ?? 0,
    },
    policy: {
      canonical_table: 'Tabla canónica certificada que conserva la fila o evento fuente. No se presenta como archivo Excel original.',
      document_core: 'Archivos nuevos de Finanzas viven en module_documents y no sustituyen la trazabilidad canónica histórica.',
    },
  });
}
