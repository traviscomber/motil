import type { OrganizationSuccessContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

export type MineAssistantRole = 'mine_manager' | 'workshop_lead';
export type MineAssistantSite = 'Don Jaime' | 'Peumo';

export type MineAssistantPersona = {
  profileId: string;
  cargoId: string;
  fullName: string;
  cargoName: string;
  mine: MineAssistantSite;
  kind: MineAssistantRole;
  focus: string;
  starters: string[];
};

const VERIFIED_PERSONAS: Record<string, Omit<MineAssistantPersona, 'profileId' | 'cargoId'>> = {
  'Jaime Manques': {
    fullName: 'Jaime Manques', cargoName: 'JEFE MINA PEUMO', mine: 'Peumo', kind: 'mine_manager',
    focus: 'Producción, plan versus evidencias, continuidad operacional, activos, seguridad y coordinación de mantenimiento.',
    starters: [
      '¿Qué está pasando en la mina Peumo y qué requiere mi atención?',
      'Genera el informe semanal de Peumo con fuentes y pendientes.',
      '¿Cuál es el plan minero disponible y qué datos faltan para evaluar el avance?',
    ],
  },
  'Cristian Rubio': {
    fullName: 'Cristian Rubio', cargoName: 'JEFE MINA DON JAIME', mine: 'Don Jaime', kind: 'mine_manager',
    focus: 'Producción minera, restricciones operacionales, seguridad, disponibilidad, coordinación con Joaquín y prioridades de Don Jaime.',
    starters: [
      '¿Qué debo priorizar hoy en Don Jaime?',
      'Dame el estado de las OT y los equipos de Don Jaime.',
      'Genera un reporte semanal de producción y mantenimiento de mi mina.',
    ],
  },
  'Joaquín Martínez': {
    fullName: 'Joaquín Martínez', cargoName: 'Jefe de Taller Mina Don Jaime', mine: 'Don Jaime', kind: 'workshop_lead',
    focus: 'Órdenes de trabajo, inicio/pausa/cierre, disponibilidad, evidencia, ejecución del taller y pendientes de abastecimiento sin conciliación automática.',
    starters: [
      '¿Qué OT tengo pendientes de ejecutar o cerrar?',
      '¿Qué pasó con el Scoop Atlas Copco ST-1030 y su mantención?',
      'Genera un reporte semanal de taller, fotos y pendientes de aprobación.',
    ],
  },
};

export async function resolveMineAssistantPersona(context: OrganizationSuccessContext): Promise<MineAssistantPersona | null> {
  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('id,full_name,cargo_id,status')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.status !== 'active' || !profile.cargo_id) return null;

  const expected = VERIFIED_PERSONAS[String(profile.full_name || '').trim()];
  if (!expected) return null;
  const { data: cargo, error: cargoError } = await context.supabase
    .from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle();
  if (cargoError) throw cargoError;
  if (cargo?.name !== expected.cargoName) return null;
  const level = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  if (level !== 'ED' && level !== 'LEC') return null;
  if (expected.kind === 'workshop_lead') {
    const { data: person, error } = await context.supabase.from('people')
      .select('id').eq('profile_id', context.userId)
      .eq('organization_id', context.organizationId)
      .eq('employment_status', 'active').maybeSingle();
    if (error) throw error;
    if (!person) return null;
  }
  return { ...expected, profileId: profile.id, cargoId: profile.cargo_id };
}

type EvidenceRow = Record<string, unknown>;
type EvidenceSet = {
  source: string;
  rows: EvidenceRow[];
  completeness: string;
  error?: string;
  truncated?: boolean;
};
export type MineEvidence = {
  user: { name: string; cargo: string; mine: MineAssistantSite; focus: string; role: MineAssistantRole };
  retrievedAt: string;
  periodStart: string;
  periodEnd: string;
  requestedDays: number;
  data: {
    workOrders: EvidenceSet;
    closureReadiness: EvidenceSet;
    assets: EvidenceSet;
    drilling: EvidenceSet;
    planLines: EvidenceSet;
    plans: EvidenceSet;
    incidents: EvidenceSet;
    requests: EvidenceSet;
  };
  verifiedSources: string[];
  unavailableSources: string[];
};

function isoDay(date: Date) { return date.toISOString().slice(0, 10); }
function safeRows(rows: unknown): EvidenceRow[] {
  return Array.isArray(rows) ? rows as EvidenceRow[] : [];
}

export async function loadMineEvidence(
  context: OrganizationSuccessContext,
  persona: MineAssistantPersona,
  requestedDays = 30,
): Promise<MineEvidence> {
  const days = requestedDays === 7 ? 7 : 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const org = context.organizationId;
  const mine = persona.mine;
  const db = context.supabase;
  const data = {} as MineEvidence['data'];
  const sources: string[] = [];
  const unavailable: string[] = [];

  async function checked(
    key: keyof MineEvidence['data'],
    source: string,
    producer: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
    completeness: string,
    maxRows: number,
  ) {
    try {
      const result = await producer();
      if (result.error) throw new Error(result.error.message || 'Error de consulta');
      const rows = safeRows(result.data);
      data[key] = { source, rows, completeness, truncated: rows.length >= maxRows };
      sources.push(source);
      return rows;
    } catch (error) {
      data[key] = { source, rows: [], completeness: 'No disponible; NO equivale a cero registros.', error: error instanceof Error ? error.message : 'Error de lectura' };
      unavailable.push(source);
      return [];
    }
  }

  const orders = await checked('workOrders','maintenance_work_orders',
    () => db.from('maintenance_work_orders')
      .select('id,work_order_number,title,work_type,status,priority,assigned_person_id,assigned_to_name,canonical_asset_id,scheduled_date,actual_duration_hours,root_cause,preventive_actions,created_at,completion_date,workshop_site')
      .eq('organization_id',org).eq('workshop_site',mine)
      .order('created_at',{ascending:false}).limit(80),
    'OT operativas marcadas explícitamente para esta mina; las OT históricas sin faena no se atribuyen.',80);
  const orderIds = orders.map(row => String(row.id)).filter(Boolean);

  await checked('closureReadiness','work_order_close_readiness_v2',
    () => orderIds.length ? db.from('work_order_close_readiness_v2')
      .select('work_order_id,work_order_number,ready_to_close,next_action,pending_parts,unmet_material_requirements,open_procurement_orders,pending_external_services,open_labor_entries,standard_plan_steps_pending')
      .eq('organization_id',org).in('work_order_id',orderIds).limit(80)
      : Promise.resolve({ data: [],error:null }),
    'Requisitos efectivos de cierre de OT visible. Material instalado y retiro de bodega son conceptos distintos.',80);

  await checked('assets','canonical.assets',
    () => db.schema('canonical').from('assets')
      .select('id,asset_code,name,asset_type,location,operational_status,criticality,is_active,updated_at')
      .eq('organization_id',org).in('location',[mine,'Mina '+mine])
      .order('updated_at',{ascending:false}).limit(65),
    'Sólo activos con ubicación de faena identificada; activos sin ubicación quedan excluidos.',65);

  if (persona.kind === 'mine_manager') {
    const { data: mineSource, error: mineError } = await db.from('production_mine_sources')
      .select('id,name,status').eq('organization_id',org).eq('name','Mina '+mine)
      .maybeSingle();
    if (mineError) throw new Error('No fue posible verificar la mina en producción');
    const mineId = mineSource?.id || null;

    const drillRows = await checked('drilling','production_drilling_source_reports',
      () => mineId ? db.from('production_drilling_source_reports')
        .select('id,operation_date,canonical_mine_source_id,mine_raw,site_raw,sector_raw,shift_code_raw,rig_name_raw,drilled_meters,equipment_status_raw,machine_observations,drilling_observations,row_hash,reconciliation_status,source_file')
        .eq('organization_id',org).eq('canonical_mine_source_id',mineId)
        .order('operation_date',{ascending:false}).limit(100)
        : Promise.resolve({data:[],error:null}),
      'Últimos 100 registros CANÓNICAMENTE atribuidos a la mina (muestra, NO total histórico). Verificar antigüedad, errores de origen y reconciliación.',100);
    // This count is NOT a live production KPI. Freshness always accompanies the rows.
    void drillRows;

    const planLines = await checked('planLines','production_monthly_plan_lines',
      () => mineId ? db.from('production_monthly_plan_lines')
        .select('id,plan_id,line_type,mine_source_id,mine_name_raw,sector_raw,level_raw,planned_tons,planned_grade_pct,planned_advance_m,planned_drilling_m,planned_shots,source_reference')
        .eq('organization_id',org).eq('mine_source_id',mineId)
        .order('created_at',{ascending:false}).limit(60)
        : Promise.resolve({data:[],error:null}),
      'Sólo líneas asociadas al identificador canónico de mina; no sumar como plan vigente sin comprobar su periodo.',60);
    const planIds = [...new Set(planLines.map(row => String(row.plan_id)).filter(Boolean))];
    await checked('plans','production_monthly_plans',
      () => planIds.length ? db.from('production_monthly_plans')
        .select('id,plan_code,period_start,period_end,status,source_document_id,prepared_by,approved_by')
        .eq('organization_id',org).in('id',planIds).order('period_start',{ascending:false}).limit(20)
        : Promise.resolve({data:[],error:null}),
      'Vigencia explícita: si la fecha actual queda fuera del periodo, es plan histórico.',20);
    await checked('incidents','canonical_hse_incidents_v1',
      () => db.from('canonical_hse_incidents_v1')
        .select('id,incident_number,date_occurred,location,incident_type,severity,status,investigation_status')
        .eq('organization_id',org).ilike('location','%'+mine+'%')
        .order('date_occurred',{ascending:false}).limit(45),
      'Sólo incidentes explícitamente ubicados en la mina; ubicaciones sin normalizar no se atribuyen ni cuentan como ausencia de incidentes.',45);
  } else {
    for (const key of ['drilling','planLines','plans','incidents'] as const) {
      data[key] = { source:'not_authorized', rows:[], completeness:'No incluido en el asistente de Taller; sin acceso de producción ni HSE por este endpoint.' };
    }
  }

  await checked('requests','mine_assistant_requests',
    () => db.from('mine_assistant_requests').select('id,title,status,created_at')
      .eq('organization_id',org).eq('user_id',persona.profileId).eq('mine_name',mine)
      .order('created_at',{ascending:false}).limit(15),
    'Solicitudes confirmadas por esta persona desde su asistente; no representan una OT ni su ejecución.',15);

  return {
    user: { name:persona.fullName,cargo:persona.cargoName,mine,focus:persona.focus,role:persona.kind },
    retrievedAt:now.toISOString(), periodStart:isoDay(start),periodEnd:isoDay(now),requestedDays:days,
    data,verifiedSources:sources,unavailableSources:unavailable,
  };
}

function value(row: EvidenceRow, key: string) { return String(row[key] ?? '—'); }

export function renderMineReport(evidence: MineEvidence): string {
  const { user, data, periodStart, periodEnd, retrievedAt } = evidence;
  const lines = [
    '# Informe operacional · Mina '+user.mine,
    'Responsable: '+user.name+' · '+user.cargo,
    'Fecha de consulta: '+retrievedAt+' | Ventana solicitada: '+periodStart+' a '+periodEnd,
    '',
    '## Alcance y calidad',
    'El informe usa evidencia de fuentes autorizadas y señala períodos de vigencia; una fuente ausente o atrasada no equivale a cero eventos.',
    ...Object.values(data).filter(v => v.source !== 'not_authorized').map(v => '- '+v.source+': '+(v.error ? 'NO DISPONIBLE: '+v.error : v.rows.length+' filas consultadas'+(v.truncated?' (límite de muestra)':'')+'. '+v.completeness)),
    '',
    '## Órdenes de trabajo de la faena',
    ...data.workOrders.rows.slice(0,20).map(row => '- '+value(row,'work_order_number')+': '+value(row,'title')+' · '+value(row,'status')+' · '+value(row,'assigned_to_name')+' · '+value(row,'created_at')),
    ...(data.workOrders.rows.length===0 ? ['No hay OT etiquetadas para esta faena en la fuente consultada.'] : []),
    '',
    '## Restricciones de cierre',
    ...data.closureReadiness.rows.filter(r => r.ready_to_close !== true).slice(0,18).map(r => '- '+value(r,'work_order_number')+': '+value(r,'next_action')+'; materiales pendientes '+value(r,'unmet_material_requirements')+' (no conciliados)'),
    '',
    '## Equipos identificados en la mina',
    ...data.assets.rows.slice(0,18).map(r => '- '+value(r,'asset_code')+': '+value(r,'name')+' · '+value(r,'operational_status')+' · '+value(r,'location')),
  ];
  if (user.role === 'mine_manager') {
    lines.push('','## Perforación — registros disponibles, no producción en tiempo real',
      ...data.drilling.rows.slice(0,15).map(r => '- '+value(r,'operation_date')+' · '+value(r,'rig_name_raw')+' · metros '+value(r,'drilled_meters')+' · estado '+value(r,'equipment_status_raw')+' · origen '+value(r,'source_file')),
      ...(data.drilling.rows.length===0 ? ['Sin registros canónicos de perforación atribuibles a esta mina.'] : []),
      '','## Planificación minera',
      ...data.plans.rows.map(r => '- '+value(r,'plan_code')+' · '+value(r,'period_start')+' a '+value(r,'period_end')+' · '+value(r,'status')),
      ...data.planLines.rows.slice(0,16).map(r => '- Línea: '+value(r,'mine_name_raw')+' / '+value(r,'sector_raw')+' · toneladas previstas '+value(r,'planned_tons')+' · avance '+value(r,'planned_advance_m')+' m'),
      '','## Seguridad — evidencia con ubicación identificable',
      ...data.incidents.rows.slice(0,12).map(r => '- '+value(r,'incident_number')+' · '+value(r,'date_occurred')+' · '+value(r,'severity')+' · '+value(r,'status')));
  }
  lines.push('','## Solicitudes de seguimiento',
    ...data.requests.rows.map(r => '- '+value(r,'title')+' · '+value(r,'status')+' · '+value(r,'created_at')),
    '','## Observaciones',
    '- Sin conciliación automática de materiales, aprobación de trabajo, cambios de inventario ni modificaciones operacionales.',
    '- Las métricas sólo describen la cobertura de registros consultados; no certifican cumplimiento ni avance del mes si faltan fuentes.',
    '','Fuentes: '+evidence.verifiedSources.join(', ')+'.');
  return lines.join('\n');
}
