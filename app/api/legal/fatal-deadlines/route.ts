export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

type FatalCategory =
  | 'explosives'
  | 'powder_magazine'
  | 'mining_property'
  | 'permit'
  | 'contract'
  | 'royalty'
  | 'other';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function daysFromToday(value: string | null, today: string) {
  if (!value) return null;
  const target = new Date(`${value.slice(0, 10)}T12:00:00Z`).getTime();
  const base = new Date(`${today}T12:00:00Z`).getTime();
  return Math.round((target - base) / 86_400_000);
}

function classify(text: string): FatalCategory {
  if (/(polvorin|polvorines|deposito de explosivos|almacenamiento de explosivos)/.test(text)) return 'powder_magazine';
  if (/(explosivo|explosivos|control de armas|armas y explosivos)/.test(text)) return 'explosives';
  if (/(propiedad minera|concesion|concesiones|minera|minero)/.test(text)) return 'mining_property';
  if (/(permiso|licencia|autorizacion|resolucion)/.test(text)) return 'permit';
  if (/(regalia|royalty|royalties)/.test(text)) return 'royalty';
  if (/(contrato|contractual|contract)/.test(text)) return 'contract';
  return 'other';
}

function categoryLabel(category: FatalCategory) {
  if (category === 'explosives') return 'Armas y explosivos';
  if (category === 'powder_magazine') return 'Polvorines';
  if (category === 'mining_property') return 'Propiedad minera';
  if (category === 'permit') return 'Permisos y licencias';
  if (category === 'royalty') return 'Regalías';
  if (category === 'contract') return 'Contratos';
  return 'Otros';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const today = todayKey();

  const { data, error } = await context.supabase
    .from('legal_cases')
    .select('id,source_type,source_module,title,reason,priority,operational_owner,legal_owner,due_at,status,action_required,evidence_status,source_href,metadata,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .neq('status', 'closed')
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || []).map((row) => {
    const dueDate = row.due_at ? String(row.due_at).slice(0, 10) : null;
    const daysUntil = daysFromToday(dueDate, today);
    const text = normalize([
      row.title,
      row.reason,
      row.action_required,
      row.source_type,
      row.source_module,
      JSON.stringify(row.metadata || {}),
    ].join(' '));
    const category = classify(text);
    const overdue = typeof daysUntil === 'number' && daysUntil < 0;
    const critical = row.priority === 'critical' || overdue;

    return {
      id: row.id,
      source_type: row.source_type,
      source_module: row.source_module,
      title: row.title,
      reason: row.reason,
      category,
      category_label: categoryLabel(category),
      priority: row.priority,
      critical,
      due_date: dueDate,
      days_until: daysUntil,
      overdue,
      owner: row.legal_owner || row.operational_owner || null,
      status: row.status,
      action_required: row.action_required,
      evidence_status: row.evidence_status,
      source_href: row.source_href || '/dashboard/legal/casos',
      updated_at: row.updated_at || row.created_at,
    };
  }).sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return String(a.due_date || '').localeCompare(String(b.due_date || ''));
  });

  return NextResponse.json({
    data: items,
    accessLevel: access,
    summary: {
      total: items.length,
      overdue: items.filter((item) => item.overdue).length,
      critical: items.filter((item) => item.critical).length,
      due_next_7_days: items.filter((item) => typeof item.days_until === 'number' && item.days_until >= 0 && item.days_until <= 7).length,
      without_evidence: items.filter((item) => !['complete', 'not_required'].includes(item.evidence_status)).length,
    },
    policy: {
      source: 'legal_cases',
      rule: 'Sólo se muestran plazos presentes en la fuente canónica. La categorización no crea ni interpreta un vencimiento legal.',
      calendar: 'Los mismos casos ya alimentan el calendario operacional por due_at.',
    },
  });
}
