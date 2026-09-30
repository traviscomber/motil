export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { requireModuleAccess, MODULE_KEYS } from '@/lib/api/module-access';

function text(value: unknown) {
  const result = String(value ?? '').trim();
  return result || null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_TABLERO, false);
  if (!access.authorized) return access.response;

  const [documents, commitments, internalInspections, externalInspections, events, facilities, roles] = await Promise.all([
    context.supabase
      .from('module_documents')
      .select('id,document_name,document_type_category,status,provenance_status,uploaded_at,valid_until,expires_at')
      .eq('organization_id', context.organizationId)
      .eq('module', 'prevención')
      .eq('category', 'documentos-hse')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false }),
    context.supabase
      .from('hse_commitments')
      .select('id,commitment_id,description,requirement,responsible,due_date,status,source_file,source_payload')
      .eq('organization_id', context.organizationId)
      .order('source_row', { ascending: true }),
    context.supabase
      .from('inspecciones_internas')
      .select('id,numero_inspeccion,fecha_planificada,fecha_realizada,faena,inspector,hallazgos_count,estado')
      .eq('organization_id', context.organizationId)
      .order('fecha_planificada', { ascending: true }),
    context.supabase
      .from('inspecciones_externas')
      .select('id,numero_inspeccion,fecha_planificada,fecha_realizada,faena,inspector,hallazgos_count,estado,empresa_externa')
      .eq('organization_id', context.organizationId)
      .order('fecha_planificada', { ascending: true }),
    context.supabase
      .from('compliance_events')
      .select('id,title,event_type,due_date,status,priority,responsible_person_name,location')
      .eq('org_id', context.organizationId)
      .order('due_date', { ascending: true }),
    context.supabase
      .from('hse_facilities')
      .select('id,code,name,location,type,risk_level')
      .eq('organization_id', context.organizationId)
      .order('name', { ascending: true }),
    context.supabase
      .from('hse_roles')
      .select('id,name,description,is_active')
      .eq('organization_id', context.organizationId)
      .order('name', { ascending: true }),
  ]);

  const warnings: string[] = [];
  for (const [label, result] of [
    ['documentos', documents],
    ['compromisos', commitments],
    ['inspecciones internas', internalInspections],
    ['inspecciones externas', externalInspections],
    ['calendario', events],
    ['instalaciones', facilities],
    ['roles HSE', roles],
  ] as const) {
    if (result.error) warnings.push(`No se pudo cargar ${label}.`);
  }

  const mappedCommitments = (commitments.data || []).map((row) => {
    const payload = (row.source_payload || {}) as Record<string, unknown>;
    return {
      id: row.id,
      commitmentId: row.commitment_id,
      description: text(row.description) || text(payload['COMPROMISOS AMBIENTALES']),
      requirement: text(row.requirement) || text(payload['Área, Sección, Título, Párrafo identificado']),
      responsible: text(row.responsible) || text(payload['RESPONSABLE']),
      component: text(payload['COMPONENTE']),
      projectStage: text(payload['ETAPA DEL PROYECTO']),
      evidence: text(payload['REGISTRO DE CUMPLIMIENTO']),
      tracking: text(payload['SEGUIMIENTO']),
      compliant: text(payload['CUMPLE']),
      nonCompliant: text(payload['NO CUMPLE']),
      dueDate: row.due_date,
      status: row.status,
      sourceFile: row.source_file,
      requiresOwner: !(text(row.responsible) || text(payload['RESPONSABLE'])),
      actionRequired: !(text(row.responsible) || text(payload['RESPONSABLE']))
        ? 'Asignar responsable HSE con evidencia organizacional; no inferir desde columnas ambiguas.'
        : null,
      calendarState: row.due_date ? 'dated' : 'no_source_date',
    };
  });

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const commitmentActions = mappedCommitments
    .filter((item) => item.requiresOwner)
    .map((item) => ({
      id: item.id,
      commitmentId: item.commitmentId,
      description: item.description,
      component: item.component,
      projectStage: item.projectStage,
      actionRequired: item.actionRequired,
      sourceFile: item.sourceFile,
    }));

  const upcoming = (events.data || [])
    .filter((event) => event.due_date && String(event.due_date) >= today)
    .slice(0, 8);

  return NextResponse.json({
    summary: {
      canonicalDocuments: (documents.data || []).filter((row) => row.provenance_status === 'canonical').length,
      commitments: mappedCommitments.length,
      commitmentsUnassigned: commitmentActions.length,
      commitmentsWithoutSourceDate: mappedCommitments.filter((item) => item.calendarState === 'no_source_date').length,
      internalInspections: internalInspections.data?.length || 0,
      externalInspections: externalInspections.data?.length || 0,
      calendarEvents: events.data?.length || 0,
      facilities: facilities.data?.length || 0,
      roles: roles.data?.length || 0,
    },
    commitments: mappedCommitments,
    commitmentActions,
    inspections: {
      internal: internalInspections.data || [],
      external: externalInspections.data || [],
    },
    upcoming,
    warnings,
  });
}
