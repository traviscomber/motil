export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { listSernageominObligations } from '@/lib/intelligence/sernageomin-obligations';
import { buildEngineeringRegulatoryDossier, engineeringReviewSourceId } from '@/lib/production/engineering-regulatory-dossier.mjs';

const headers = { 'Cache-Control': 'private, no-store' };
const CASE_TYPE = 'engineering_regulatory_document_request';
const SOURCE_MODULE = 'ingenieria';
const TECHNICAL_MODULES = ['ingenieria','ingeniería','topografia','topografía','produccion','producción'];
const TECHNICAL_SOURCE_KINDS = ['plan','drilling','mine_report'];
const RECORD_LIMIT = 80;

async function authorize(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return { ok: false as const, response: context.response };
  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.PROD_TOPOGRAFIA);
  if (access !== 'ED' && access !== 'LEC') return {
    ok: false as const, response: NextResponse.json(
      { error:'Sin acceso al expediente técnico de Ingeniería.' }, { status:403, headers },
    ),
  };
  return { ok:true as const, context, canSubmit:access === 'ED' };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  const orgId = auth.context.organizationId;
  const obligationCatalog = listSernageominObligations('engineering');
  const sourceIds = obligationCatalog.map(item => engineeringReviewSourceId(orgId,item.id));

  // All three sources are tenant-scoped. In particular, never read documents
  // belonging to Legal, HSE or other modules through Topography permissions.
  const [docs, sources, cases] = await Promise.all([
    auth.context.supabase.from('module_documents')
      .select('id,document_name,module,category,version,status,provenance_status,valid_until',{count:'exact'})
      .eq('organization_id',orgId).in('module',TECHNICAL_MODULES)
      .is('deleted_at',null).order('created_at',{ascending:false}).limit(RECORD_LIMIT),
    auth.context.supabase.from('production_source_documents')
      .select('id,source_file,source_kind,canonical_role,period_start,period_end',{count:'exact'})
      .eq('organization_id',orgId).in('source_kind',TECHNICAL_SOURCE_KINDS)
      .order('created_at',{ascending:false}).limit(RECORD_LIMIT),
    auth.context.supabase.from('legal_cases')
      .select('id,source_id,status,evidence_status')
      .eq('organization_id',orgId).eq('source_type',CASE_TYPE)
      .eq('source_module',SOURCE_MODULE)
      .in('source_id',sourceIds).limit(40),
  ]);
  if (docs.error || sources.error || cases.error) return NextResponse.json(
    { error:'No se pudo verificar el expediente técnico completo. No se presume ausencia de documentos.' },
    { status:503, headers },
  );
  return NextResponse.json({
    ...buildEngineeringRegulatoryDossier(
      obligationCatalog, orgId, docs.data || [], docs.count,
      sources.data || [], sources.count, cases.data || [],
    ),
    canSubmitLegalReview: auth.canSubmit,
    operationalMutationExecuted:false,
    persistence:'engineering_regulatory_dossier_v1',
  }, { headers });
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  if (!auth.canSubmit) return NextResponse.json(
    {error:'Tu cargo permite consultar pero no solicitar revisiones.'},
    {status:403,headers},
  );
  // A cookie-authenticated cross-origin POST may not file Legal cases.
  const origin = request.headers.get('origin');
  if (origin) {
    let parsed: URL;
    try { parsed = new URL(origin); }
    catch { return NextResponse.json({error:'Origen no válido'},{status:403,headers}); }
    if (parsed.origin !== request.nextUrl.origin) {
      return NextResponse.json({error:'Origen no autorizado'},{status:403,headers});
    }
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({error:'Se requiere JSON'},{status:415,headers});
  }
  const body = await request.json().catch(()=>null);
  const id = typeof body?.obligationId === 'string' ? body.obligationId : '';
  const obligation = listSernageominObligations('engineering').find(item => item.id === id);
  if (!obligation) return NextResponse.json({error:'Obligación no válida para Ingeniería.'},{status:400,headers});

  const sourceId = engineeringReviewSourceId(auth.context.organizationId,obligation.id);
  // unique(organization_id,source_type,source_id) makes this handoff idempotent.
  // ignoreDuplicates must never overwrite a Legal review, deadline or closure.
  const saved = await auth.context.supabase.from('legal_cases')
    .upsert({
      organization_id:auth.context.organizationId,
      source_type:CASE_TYPE, source_id:sourceId, source_module:SOURCE_MODULE,
      title:'Revisión documental · '+obligation.title,
      reason:'Solicitud técnica a Legal para determinar aplicabilidad y revisar respaldos; no se afirma incumplimiento.',
      priority:obligation.priority,
      operational_owner:'Ingeniería / Planificación (área solicitante; responsable formal por confirmar)',
      legal_owner:null,due_at:null,source_href:null,
      action_required:obligation.nextAction,status:'new',evidence_status:'pending',
      created_by:auth.context.userId,
      metadata:{
        obligation_id:obligation.id,
        legal_basis:obligation.legalBasis,
        evidence_requested:obligation.expectedEvidence,
        original_source_url:obligation.sourceUrl,
        source_regulatory_catalog:'sernageomin-obligations',
        requested_by:auth.context.userId,
        human_applicability_review_required:true,
        compliance_verdict_calculated:false,
      },
    },{onConflict:'organization_id,source_type,source_id',ignoreDuplicates:true})
    .select('id');
  if(saved.error) return NextResponse.json(
    {error:'No se pudo registrar la solicitud en la bandeja de Legal.'},
    {status:503,headers},
  );
  const rowResult = await auth.context.supabase.from('legal_cases')
    .select('id,status,evidence_status')
    .eq('organization_id',auth.context.organizationId)
    .eq('source_type',CASE_TYPE).eq('source_id',sourceId).maybeSingle();
  if (rowResult.error || !rowResult.data) return NextResponse.json(
    {error:'No se pudo confirmar el registro. Reintenta la consulta antes de enviar otra solicitud.'},
    {status:503,headers},
  );
  return NextResponse.json({
    created:Boolean(saved.data?.length), case:{
      id:rowResult.data.id, status:rowResult.data.status,
      evidenceStatus:rowResult.data.evidence_status,
    }, reviewOwner:'Legal', compliant:null,
  },{ status:saved.data?.length?201:200,headers });
}
