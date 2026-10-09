export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { loadRegulatoryIntelligenceContext } from '@/lib/intelligence/regulatory-intelligence-context';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const DOMAIN_MODULES: Record<string, string[]> = {
  hse: ['hse_incidente', 'hse_investigaciones', 'hse_documentacion'],
  incidents: ['hse_incidente', 'hse_investigaciones'],
  inspections: ['hse_investigaciones', 'hse_documentacion'],
  maintenance: ['mant_operaciones', 'mant_documentos'],
  assets: ['mant_operaciones', 'bodega_inventario'],
  operations: ['prod_operaciones', 'mant_operaciones'],
  production: ['prod_operaciones'],
  engineering: ['prod_topografia'],
  contractors: ['legal_eecc', 'legal_contratos'],
  finance: ['fin_compras'],
  documents: ['legal_modulo', 'hse_documentacion'],
  closure: ['legal_modulo', 'prod_operaciones'],
  legal: ['legal_modulo'],
};

function moduleKeysForDomains(domains: string[]) {
  return Array.from(new Set(domains.flatMap((domain) => DOMAIN_MODULES[domain] || [])));
}

async function loadModulePeople(
  supabase: ReturnType<typeof import('@/lib/supabase-server').getSupabaseServerClient>,
  moduleKeys: string[],
  organizationId: string,
) {
  if (!moduleKeys.length) return [];
  const { data: matrix } = await supabase
    .from('role_matrix')
    .select('cargo_id,module_key,access_level')
    .in('module_key', moduleKeys)
    .in('access_level', ['ED', 'LEC']);

  const cargoIds = Array.from(new Set((matrix || []).map((row) => row.cargo_id).filter(Boolean)));
  if (!cargoIds.length) return [];

  const [{ data: cargos }, { data: profiles }] = await Promise.all([
    supabase.from('cargos').select('id,name').in('id', cargoIds),
    supabase.from('profiles').select('id,cargo_id,full_name,email').in('cargo_id', cargoIds).eq('organization_id', organizationId),
  ]);

  const cargoById = new Map((cargos || []).map((cargo) => [cargo.id, cargo.name]));
  const profilesByCargo = new Map<string, Array<{ full_name: string | null; email: string | null }>>();
  for (const profile of profiles || []) {
    const list = profilesByCargo.get(profile.cargo_id) || [];
    list.push({ full_name: profile.full_name, email: profile.email });
    profilesByCargo.set(profile.cargo_id, list);
  }

  return (matrix || []).map((row) => ({
    moduleKey: row.module_key,
    accessLevel: row.access_level,
    cargo: cargoById.get(row.cargo_id) || 'Cargo sin nombre',
    people: profilesByCargo.get(row.cargo_id) || [],
  }));
}

function evidenceText(item: { label: string; provenance?: Record<string, unknown> }) {
  return normalize([item.label, ...Object.values(item.provenance || {})].join(' '));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const regulatory = await loadRegulatoryIntelligenceContext(context, 100);
  if (!regulatory.available || !regulatory.canonicalEvidence) {
    return NextResponse.json({
      available: false,
      authority: 'SERNAGEOMIN',
      obligations: [],
      evidence: [],
      complianceVerdictCalculated: false,
      errorCode: regulatory.errorCode || 'regulatory_context_unavailable',
    });
  }

  const evidence = regulatory.canonicalEvidence.items;
  const allModuleKeys = Array.from(new Set(regulatory.obligations.flatMap((item) => moduleKeysForDomains(item.motilDomains))));
  const modulePeople = await loadModulePeople(context.supabase, allModuleKeys, context.organizationId);
  const legalPeople = modulePeople.filter((item) => item.moduleKey === 'legal_modulo');

  const obligations = regulatory.obligations.map((obligation) => {
    const allowedScopes = new Set<string>();
    if (obligation.motilDomains.includes('documents')) allowedScopes.add('documents');
    if (obligation.motilDomains.includes('assets')) allowedScopes.add('assets');
    if (obligation.motilDomains.includes('hse')) allowedScopes.add('hse');
    if (obligation.motilDomains.includes('inspections')) allowedScopes.add('inspections');

    const relevantEvidence = evidence.filter((item) => {
      if (!allowedScopes.has(item.scope)) return false;
      const text = evidenceText(item);
      return obligation.evidenceKeywords.some((keyword) => text.includes(normalize(keyword)));
    });

    const hasEvidence = relevantEvidence.length > 0;
    const sourceModules = moduleKeysForDomains(obligation.motilDomains);
    const operationalContacts = modulePeople
      .filter((item) => sourceModules.includes(item.moduleKey) && item.moduleKey !== 'legal_modulo')
      .map((item) => ({
        moduleKey: item.moduleKey,
        accessLevel: item.accessLevel,
        cargo: item.cargo,
        people: item.people,
      }));
    const legalContacts = legalPeople.map((item) => ({
      accessLevel: item.accessLevel,
      cargo: item.cargo,
      people: item.people,
    }));
    const actionState = hasEvidence ? 'review_evidence' : 'validate_and_collect';
    const nextAction = hasEvidence
      ? `Revisar la evidencia candidata vinculada y confirmar si cubre la obligación. Luego: ${obligation.nextAction}`
      : obligation.nextAction;

    return {
      ...obligation,
      sourceModules,
      operationalContacts,
      legalContacts,
      evidenceCount: relevantEvidence.length,
      evidenceRefs: relevantEvidence.slice(0, 8).map((item) => ({
        canonicalRef: item.canonicalRef,
        label: item.label,
        scope: item.scope,
        freshnessAt: item.freshnessAt,
      })),
      actionState,
      nextAction,
      reviewState: hasEvidence ? 'evidence_observed_requires_review' : 'evidence_not_observed_requires_review',
      applicabilityState: 'requires_human_validation',
      responsibleState: 'business_owner_defined_legal_accountability_visible',
      deadlineState: obligation.timingRule.includes('validar') || obligation.timingRule.includes('depende')
        ? 'requires_human_validation'
        : 'rule_available_requires_case_validation',
    };
  }).sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 } as const;
    return rank[a.priority] - rank[b.priority];
  });

  return NextResponse.json({
    available: true,
    authority: 'SERNAGEOMIN',
    obligations,
    evidence,
    summary: {
      obligations: obligations.length,
      critical: obligations.filter((item) => item.priority === 'critical').length,
      withMatchedEvidence: obligations.filter((item) => item.evidenceCount > 0).length,
      withoutMatchedEvidence: obligations.filter((item) => item.evidenceCount === 0).length,
      requiringApplicabilityReview: obligations.length,
      complianceVerdictCalculated: false,
    },
    teamContext: {
      legalRoles: legalPeople.map((item) => ({
        cargo: item.cargo,
        accessLevel: item.accessLevel,
        people: item.people,
      })),
      note: 'Los nombres provienen de perfiles canónicos asociados a cargos. Si un cargo no tiene persona asignada, MOTIL lo muestra sin inventar un responsable nominal.',
    },
    operatingModel: {
      legal: 'Valida aplicabilidad, interpreta la obligación, controla plazo y custodia trazabilidad.',
      businessOwner: 'Ejecuta la acción técnica u operacional y produce la evidencia.',
      closeRule: 'Legal no cierra una obligación sin evidencia suficiente y revisión humana.',
    },
    policy: regulatory.obligationPolicy,
    sourcePolicy: regulatory.policy,
    complianceVerdictCalculated: false,
    operationalMutationExecuted: false,
    persistence: 'mining_legal_obligation_inbox_v2',
  });
}
