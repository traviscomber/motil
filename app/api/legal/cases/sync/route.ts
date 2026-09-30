export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

type Candidate = {
  source_type: string;
  source_id: string;
  source_module: string;
  title: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  operational_owner: string | null;
  due_at: string | null;
  action_required: string;
  source_href: string;
  metadata: Record<string, unknown>;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86_400_000);
}

function normalizePriority(value: unknown): Candidate['priority'] {
  const text = String(value ?? '').trim().toLowerCase();
  if (['critical', 'critica', 'crítica', 'urgente'].includes(text)) return 'critical';
  if (['high', 'alta'].includes(text)) return 'high';
  if (['low', 'baja'].includes(text)) return 'low';
  return 'medium';
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const today = dateKey(new Date());
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const horizonKey = dateKey(horizon);

  const [eventsResult, contractsResult, existingResult] = await Promise.all([
    context.supabase
      .from('compliance_events')
      .select('id,title,description,due_date,status,priority,responsible_person_name,location,event_type')
      .eq('org_id', context.organizationId)
      .eq('event_type', 'legal')
      .limit(500),
    context.supabase
      .from('contracts')
      .select('id,contract_number,title,status,responsible_area,responsible_person,end_date,review_due_date,contractor_name,compliance_status')
      .eq('organization_id', context.organizationId)
      .limit(500),
    context.supabase
      .from('legal_cases')
      .select('id,source_type,source_id,status,legal_owner,evidence_status')
      .eq('organization_id', context.organizationId)
      .limit(2000),
  ]);

  if (eventsResult.error || contractsResult.error || existingResult.error) {
    return NextResponse.json({
      error: 'No se pudieron sincronizar todas las fuentes legales',
      details: {
        events: eventsResult.error?.message || null,
        contracts: contractsResult.error?.message || null,
        existing: existingResult.error?.message || null,
      },
    }, { status: 500 });
  }

  const candidates: Candidate[] = [];

  for (const row of eventsResult.data || []) {
    candidates.push({
      source_type: 'compliance_event',
      source_id: row.id,
      source_module: 'sostenibilidad',
      title: row.title,
      reason: 'Evento de cumplimiento tipado como Legal',
      priority: normalizePriority(row.priority),
      operational_owner: row.responsible_person_name || null,
      due_at: row.due_date || null,
      action_required: 'Evaluar aplicabilidad, responsable, plazo y evidencia requerida.',
      source_href: '/dashboard/tareas',
      metadata: {
        event_type: row.event_type,
        location: row.location,
        source_status: row.status,
        description: row.description,
      },
    });
  }

  const terminalContractStatuses = new Set(['closed', 'cerrado', 'cancelled', 'cancelado', 'terminated', 'terminado', 'expired', 'vencido']);
  for (const row of contractsResult.data || []) {
    if (terminalContractStatuses.has(String(row.status || '').trim().toLowerCase())) continue;

    const triggerDate = row.review_due_date || row.end_date;
    if (!triggerDate || triggerDate > horizonKey) continue;

    const days = daysBetween(triggerDate, today);
    const isReview = Boolean(row.review_due_date);
    candidates.push({
      source_type: isReview ? 'contract_review' : 'contract_expiry',
      source_id: row.id,
      source_module: 'contratos',
      title: row.title || row.contract_number || 'Contrato',
      reason: isReview ? 'Fecha de revisión contractual alcanzada o próxima' : 'Vencimiento contractual alcanzado o próximo',
      priority: days < 0 ? 'critical' : days <= 30 ? 'high' : 'medium',
      operational_owner: row.responsible_person || row.responsible_area || null,
      due_at: triggerDate,
      action_required: isReview
        ? 'Revisar continuidad, condiciones vigentes y evidencia contractual.'
        : 'Revisar vencimiento, continuidad y acciones necesarias antes del término.',
      source_href: '/dashboard/documentos-gestion/contratos',
      metadata: {
        contract_number: row.contract_number,
        contractor_name: row.contractor_name,
        source_status: row.status,
        compliance_status: row.compliance_status,
      },
    });
  }

  const existingByKey = new Map(
    (existingResult.data || []).map((row) => [`${row.source_type}:${row.source_id}`, row]),
  );

  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const key = `${candidate.source_type}:${candidate.source_id}`;
    const existing = existingByKey.get(key);

    if (!existing) {
      const { error } = await context.supabase.from('legal_cases').insert({
        organization_id: context.organizationId,
        ...candidate,
        status: 'new',
        evidence_status: 'pending',
        created_by: context.userId,
      });
      if (!error) inserted += 1;
      continue;
    }

    const { error } = await context.supabase
      .from('legal_cases')
      .update({
        source_module: candidate.source_module,
        title: candidate.title,
        reason: candidate.reason,
        priority: candidate.priority,
        operational_owner: candidate.operational_owner,
        due_at: candidate.due_at,
        action_required: candidate.action_required,
        source_href: candidate.source_href,
        metadata: candidate.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('organization_id', context.organizationId);

    if (!error) updated += 1;
  }

  return NextResponse.json({
    success: true,
    candidates: candidates.length,
    inserted,
    updated,
    sources: {
      legal_events: (eventsResult.data || []).length,
      contracts: candidates.filter((item) => item.source_type.startsWith('contract_')).length,
    },
  });
}
