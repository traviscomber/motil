export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { loadEquipmentIntelligenceContext, resolveEquipmentMention } from '@/lib/intelligence/equipment-intelligence-context';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedId = request.nextUrl.searchParams.get('id')?.trim() || '';
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';

  let assetId = requestedId;
  let resolvedAsset: Record<string, unknown> | null = null;
  if (!assetId && query) {
    try {
      resolvedAsset = await resolveEquipmentMention(context, query);
      assetId = typeof resolvedAsset?.id === 'string' ? resolvedAsset.id : '';
    } catch {
      return NextResponse.json({ error: 'No fue posible resolver el equipo solicitado.' }, { status: 500 });
    }
  }

  if (!assetId) {
    return NextResponse.json({
      error: query ? 'No se pudo identificar un equipo de forma inequívoca.' : 'Debes indicar id o q.',
      ambiguityProtected: Boolean(query),
    }, { status: 400 });
  }

  const equipment = await loadEquipmentIntelligenceContext(context, assetId);
  if (!equipment.available && equipment.errorCode === 'asset_not_found') {
    return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
  }
  if (!equipment.available) {
    return NextResponse.json({ error: 'No fue posible construir el contexto operacional del equipo.' }, { status: 500 });
  }

  return NextResponse.json({
    equipment: {
      asset: equipment.asset,
      operational: equipment.operational,
      decisionCases: equipment.decisionCases,
      sources: equipment.sources,
      authority: equipment.authority,
    },
    resolvedBy: requestedId ? 'canonical_id' : 'explicit_asset_mention',
    resolvedAsset,
    semantics: {
      recurrence: 'Recurrencia observada en cierres auditados; no predice una falla futura.',
      runtime: 'Horómetro/runtime y MTBF son conceptos separados.',
      parts: 'work_order_parts muestra consumo/requerimiento observado; no equivale a stock disponible.',
      decisionCases: 'Advisory; deben revalidarse contra evidencia actual.',
    },
    operationalMutationExecuted: false,
  });
}
