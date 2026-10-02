export type MaintenanceSeniorToolMode = 'read' | 'prepare_only'

export type MaintenanceSeniorToolName =
  | 'search_assets'
  | 'search_people'
  | 'get_person_work_context'
  | 'get_maintenance_attention_queue'
  | 'get_maintenance_attention_context'
  | 'get_asset_context'
  | 'get_asset_context_batch'
  | 'get_open_work_orders'
  | 'get_maintenance_plan'
  | 'get_observed_condition_history'
  | 'get_closure_readiness'
  | 'prepare_maintenance_decision_case'

export type MaintenanceSeniorToolDefinition = {
  type: 'function'
  name: MaintenanceSeniorToolName
  description: string
  strict: true
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
    additionalProperties: false
  }
}

export type MaintenanceCanonicalToolContext = {
  assets?: any[]
  people?: any[]
  pending_operational_reviews?: any[]
  observed_conditions_90d?: any[]
  preventive_hour_status?: any[]
  operational_work_orders?: any[]
  audited_non_synthetic_reliability?: any[]
  closure_readiness?: any[]
}

export type MaintenancePreparedDecisionCase = {
  mode: 'prepare_only'
  decision_state: 'awaiting_human_review'
  execution_policy: 'human_only'
  canonical_asset_id: string | null
  title: string
  canonical_fact: string
  professional_interpretation: string
  hypothesis_to_review: string | null
  evidence_for: string[]
  evidence_against: string[]
  missing_evidence: string[]
  next_best_action: string
  human_checkpoint: string
  impact: {
    expected: null
    observed: null
    status: 'not_measured'
  }
}

const toolModes: Record<MaintenanceSeniorToolName, MaintenanceSeniorToolMode> = {
  search_assets: 'read',
  search_people: 'read',
  get_person_work_context: 'read',
  get_maintenance_attention_queue: 'read',
  get_maintenance_attention_context: 'read',
  get_asset_context: 'read',
  get_asset_context_batch: 'read',
  get_open_work_orders: 'read',
  get_maintenance_plan: 'read',
  get_observed_condition_history: 'read',
  get_closure_readiness: 'read',
  prepare_maintenance_decision_case: 'prepare_only',
}

const assetIdSchema = {
  type: 'string',
  description: 'ID canónico del activo dentro de la organización ya autorizada.',
}

export const maintenanceSeniorTools: MaintenanceSeniorToolDefinition[] = [
  {
    type: 'function',
    name: 'search_people',
    description: 'READ. Busca personas canónicas activas por nombre, apellido, correo o cargo dentro de la organización. Tolera tildes y pequeñas variaciones de escritura. No modifica personas ni permisos.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre, apellido, correo o cargo mencionado por el usuario.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_person_work_context',
    description: 'READ. Recupera identidad laboral canónica, jefatura, reportes directos y OT abiertas asignadas a una persona ya resuelta. Úsala para preguntas como "qué tiene Joaquín", "quién depende de Mauricio" o "qué OT tiene esta persona".',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        person_id: { type: 'string', description: 'ID canónico de people obtenido desde search_people o el contexto del usuario.' },
      },
      required: ['person_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'search_assets',
    description: 'READ. Busca activos canónicos por código, nombre, fabricante o modelo dentro del contexto autorizado. No modifica datos.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto de búsqueda entregado por el usuario o derivado de su consulta.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_maintenance_attention_queue',
    description: 'READ. Recupera la cola operacional derivada para identificar activos que requieren revisión humana. Combina observaciones, preventivos, OT y cierre sin convertir frecuencia en probabilidad de falla.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Cantidad máxima de activos o señales a devolver.' },
      },
      required: ['limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_maintenance_attention_context',
    description: 'READ. Devuelve en una sola llamada la cola operacional y el contexto canónico de hasta 8 activos seleccionados por esa cola. PREFIERE esta herramienta para preguntas multi-activo sobre qué requiere atención primero. No modifica datos, no diagnostica y no autoriza prioridad.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 8, description: 'Cantidad máxima de activos con cola + contexto canónico a devolver.' },
      },
      required: ['limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_asset_context',
    description: 'READ. Recupera el activo canónico y la evidencia operacional disponible para un solo activo. Úsala cuando la consulta sea individual. No modifica datos.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_asset_context_batch',
    description: 'READ. Recupera en una sola llamada el contexto canónico y la evidencia operacional de hasta 8 activos. Después de una cola de atención, PREFIERE esta herramienta para comparar varios activos en vez de repetir get_asset_context. No modifica datos.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        canonical_asset_ids: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: assetIdSchema,
          description: 'Lista de 1 a 8 IDs canónicos ya obtenidos desde el contexto autorizado.',
        },
      },
      required: ['canonical_asset_ids'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_open_work_orders',
    description: 'READ. Recupera órdenes de trabajo operacionales del activo. No crea, prioriza, modifica ni cierra OT.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_maintenance_plan',
    description: 'READ. Recupera estado preventivo calculado desde pauta y evidencia de horómetro. No genera trabajo automáticamente.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_observed_condition_history',
    description: 'READ. Recupera frecuencia observada en reportes operacionales. Nunca representa probabilidad de falla.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_closure_readiness',
    description: 'READ. Recupera evidencia de preparación de cierre de OT. No autoriza ni cierra una orden.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'prepare_maintenance_decision_case',
    description: 'PREPARE_ONLY. Estructura un caso derivado para revisión humana. No persiste verdad operacional, no aprueba y no ejecuta.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        canonical_asset_id: { ...assetIdSchema, description: 'ID canónico del activo o cadena vacía si el caso no está asociado a un activo.' },
        title: { type: 'string' },
        canonical_fact: { type: 'string' },
        professional_interpretation: { type: 'string' },
        hypothesis_to_review: { type: 'string' },
        evidence_for: { type: 'array', items: { type: 'string' } },
        evidence_against: { type: 'array', items: { type: 'string' } },
        missing_evidence: { type: 'array', items: { type: 'string' } },
        next_best_action: { type: 'string' },
        human_checkpoint: { type: 'string' },
      },
      required: [
        'canonical_asset_id',
        'title',
        'canonical_fact',
        'professional_interpretation',
        'hypothesis_to_review',
        'evidence_for',
        'evidence_against',
        'missing_evidence',
        'next_best_action',
        'human_checkpoint',
      ],
      additionalProperties: false,
    },
  },
]

export function getMaintenanceSeniorToolMode(name: string): MaintenanceSeniorToolMode | null {
  return Object.prototype.hasOwnProperty.call(toolModes, name)
    ? toolModes[name as MaintenanceSeniorToolName]
    : null
}

function byAsset(rows: any[] | undefined, canonicalAssetId: string) {
  return (rows || []).filter((row) => String(row?.canonical_asset_id || '') === canonicalAssetId)
}

function requireAssetId(args: Record<string, unknown>) {
  const canonicalAssetId = String(args.canonical_asset_id || '').trim()
  if (!canonicalAssetId) throw new Error('canonical_asset_id es obligatorio para esta herramienta')
  return canonicalAssetId
}

function requireAssetIds(args: Record<string, unknown>) {
  if (!Array.isArray(args.canonical_asset_ids)) {
    throw new Error('canonical_asset_ids debe ser una lista para esta herramienta')
  }
  const canonicalAssetIds = Array.from(new Set(args.canonical_asset_ids.map((value) => String(value || '').trim()).filter(Boolean)))
  if (!canonicalAssetIds.length) throw new Error('canonical_asset_ids debe contener al menos un activo')
  if (canonicalAssetIds.length > 8) throw new Error('canonical_asset_ids admite un máximo de 8 activos por llamada')
  return canonicalAssetIds
}

function normalizedText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizedPersonText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string) {
  const left = a || ''
  const right = b || ''
  const dp = Array.from({ length: left.length + 1 }, (_, i) => i)
  for (let j = 1; j <= right.length; j += 1) {
    let previous = dp[0]
    dp[0] = j
    for (let i = 1; i <= left.length; i += 1) {
      const current = dp[i]
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1),
      )
      previous = current
    }
  }
  return dp[left.length]
}

function personMatchScore(person: any, rawQuery: unknown) {
  const query = normalizedPersonText(rawQuery)
  if (!query) return 0
  const queryTokens = query.split(/\s+/).filter(Boolean)
  const fields = [
    person?.full_name,
    person?.email,
    person?.role_title,
    person?.normalized_name,
  ].map(normalizedPersonText).filter(Boolean)
  const joined = fields.join(' ')
  if (joined.includes(query)) return 100

  let score = 0
  const fieldTokens = joined.split(/\s+/).filter(Boolean)
  for (const q of queryTokens) {
    if (fieldTokens.includes(q)) {
      score += 20
      continue
    }
    if (q.length >= 4 && fieldTokens.some((token) => token.startsWith(q) || q.startsWith(token))) {
      score += 12
      continue
    }
    if (q.length >= 4 && fieldTokens.some((token) => Math.abs(token.length - q.length) <= 1 && editDistance(token, q) <= 1)) {
      score += 8
    }
  }
  return score
}

function publicPerson(person: any, context: MaintenanceCanonicalToolContext) {
  const supervisor = (context.people || []).find((row) => String(row?.id || '') === String(person?.supervisor_person_id || ''))
  return {
    person_id: person?.id || null,
    full_name: person?.full_name || null,
    role_title: person?.role_title || null,
    email: person?.email || null,
    employment_status: person?.employment_status || null,
    supervisor_person_id: person?.supervisor_person_id || null,
    supervisor_name: supervisor?.full_name || null,
  }
}

function cappedLimit(value: unknown, fallback = 10) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(20, Math.trunc(parsed)))
}

function assetContext(canonicalAssetId: string, context: MaintenanceCanonicalToolContext) {
  return {
    canonical_asset_id: canonicalAssetId,
    asset: (context.assets || []).find((row) => String(row?.id || '') === canonicalAssetId) || null,
    pending_reviews: byAsset(context.pending_operational_reviews, canonicalAssetId),
    observed_conditions: byAsset(context.observed_conditions_90d, canonicalAssetId),
    preventive_status: byAsset(context.preventive_hour_status, canonicalAssetId),
    work_orders: byAsset(context.operational_work_orders, canonicalAssetId),
    closure_readiness: byAsset(context.closure_readiness, canonicalAssetId),
  }
}

function attentionScore(assetId: string, context: MaintenanceCanonicalToolContext) {
  const observed = byAsset(context.observed_conditions_90d, assetId)[0] || {}
  const reviews = byAsset(context.pending_operational_reviews, assetId)
  const preventive = byAsset(context.preventive_hour_status, assetId)
  const workOrders = byAsset(context.operational_work_orders, assetId)
  const closure = byAsset(context.closure_readiness, assetId)

  const overduePreventive = preventive.filter((row) => ['due', 'overdue', 'vencido', 'vencida'].includes(normalizedText(row?.hour_status))).length
  const openWorkOrders = workOrders.filter((row) =>
    !['closed', 'cerrada', 'cerrado', 'completed', 'completada', 'completado', 'cancelled', 'cancelada', 'cancelado'].includes(normalizedText(row?.status))
  ).length
  const closureBlocked = closure.filter((row) => row?.ready_to_close === false).length
  const outOfService = Number(observed?.out_of_service_reports || 0)
  const withObservations = Number(observed?.operational_with_observations_reports || 0)

  return {
    score: reviews.length * 5 + overduePreventive * 4 + outOfService * 3 + withObservations * 2 + openWorkOrders + closureBlocked,
    pending_reviews: reviews.length,
    overdue_preventive: overduePreventive,
    out_of_service_reports: outOfService,
    operational_with_observations_reports: withObservations,
    open_work_orders: openWorkOrders,
    closure_blockers: closureBlocked,
  }
}

function maintenanceAttentionRows(limit: number, context: MaintenanceCanonicalToolContext) {
  const assetIds = new Set<string>()
  for (const collection of [
    context.pending_operational_reviews,
    context.observed_conditions_90d,
    context.preventive_hour_status,
    context.operational_work_orders,
    context.closure_readiness,
  ]) {
    for (const row of collection || []) {
      const assetId = String(row?.canonical_asset_id || '')
      if (assetId) assetIds.add(assetId)
    }
  }

  const assetById = new Map((context.assets || []).map((row) => [String(row?.id || ''), row]))
  return Array.from(assetIds)
    .map((canonicalAssetId) => {
      const asset = assetById.get(canonicalAssetId)
      const attention = attentionScore(canonicalAssetId, context)
      return {
        canonical_asset_id: canonicalAssetId,
        asset_code: asset?.asset_code || null,
        asset_name: asset?.name || null,
        ...attention,
      }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function executeMaintenanceSeniorTool(
  name: string,
  rawArgs: unknown,
  context: MaintenanceCanonicalToolContext,
) {
  const mode = getMaintenanceSeniorToolMode(name)
  if (!mode) throw new Error(`Herramienta no permitida: ${name}`)

  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? rawArgs as Record<string, unknown>
    : {}

  if (name === 'search_people') {
    const query = String(args.query || '').trim()
    if (!query) throw new Error('query es obligatorio para buscar personas')
    const rows = (context.people || [])
      .filter((person) => String(person?.employment_status || '').toLowerCase() === 'active')
      .map((person) => ({ person, score: personMatchScore(person, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || String(a.person?.full_name || '').localeCompare(String(b.person?.full_name || ''), 'es'))
      .slice(0, 10)
      .map(({ person }) => publicPerson(person, context))
    return {
      mode,
      rows,
      semantics: 'Identidad laboral desde people canónico. Coincidencia tolerante a tildes y pequeñas variaciones; si hay más de una persona plausible, el usuario debe confirmar.',
    }
  }

  if (name === 'get_person_work_context') {
    const personId = String(args.person_id || '').trim()
    if (!personId) throw new Error('person_id es obligatorio para esta herramienta')
    const person = (context.people || []).find((row) => String(row?.id || '') === personId)
    if (!person) throw new Error('La persona no existe en el directorio canónico autorizado')
    const directReports = (context.people || [])
      .filter((row) => String(row?.supervisor_person_id || '') === personId && String(row?.employment_status || '').toLowerCase() === 'active')
      .map((row) => publicPerson(row, context))
    const assignedOpenWorkOrders = (context.operational_work_orders || [])
      .filter((row) => String(row?.assigned_person_id || '') === personId)
      .filter((row) => !['closed', 'cerrada', 'cerrado', 'completed', 'completada', 'completado', 'cancelled', 'cancelada', 'cancelado'].includes(normalizedText(row?.status)))
    const createdWorkOrders = person?.profile_id
      ? (context.operational_work_orders || []).filter((row) => String(row?.created_by || '') === String(person.profile_id))
      : []
    return {
      mode,
      person: publicPerson(person, context),
      direct_reports: directReports,
      assigned_open_work_orders: assignedOpenWorkOrders,
      created_work_orders: createdWorkOrders.slice(0, 20),
      semantics: 'La identidad y jerarquía provienen de people canónico; las OT reflejan registros operacionales disponibles y no implican responsabilidad causal por una falla.',
    }
  }

  if (name === 'search_assets') {
    const query = normalizedText(args.query)
    if (!query) throw new Error('query es obligatorio para buscar activos')
    const rows = (context.assets || [])
      .filter((row) => [row?.asset_code, row?.name, row?.manufacturer, row?.model]
        .some((value) => normalizedText(value).includes(query)))
      .slice(0, 20)
      .map((row) => ({
        canonical_asset_id: row?.id || null,
        asset_code: row?.asset_code || null,
        asset_name: row?.name || null,
        manufacturer: row?.manufacturer || null,
        model: row?.model || null,
        is_active: row?.is_active ?? null,
        validation_status: row?.validation_status || null,
      }))
    return { mode, rows }
  }

  if (name === 'get_maintenance_attention_queue') {
    const limit = cappedLimit(args.limit)
    return {
      mode,
      rows: maintenanceAttentionRows(limit, context),
      semantics: 'Score operacional determinístico para ordenar revisión humana; NO es probabilidad de falla, criticidad OEM ni diagnóstico.',
    }
  }

  if (name === 'get_maintenance_attention_context') {
    const limit = Math.min(8, cappedLimit(args.limit, 6))
    const rows = maintenanceAttentionRows(limit, context)
    return {
      mode,
      rows: rows.map((attention) => ({
        attention,
        context: assetContext(attention.canonical_asset_id, context),
      })),
      semantics: 'Lectura compuesta y acotada de cola + evidencia canónica. El score sólo ordena revisión humana; NO es probabilidad de falla, diagnóstico, criticidad OEM ni autorización de prioridad.',
    }
  }

  if (name === 'get_asset_context') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      ...assetContext(canonicalAssetId, context),
      semantics: 'La evidencia observada describe hechos/frecuencias registradas; no probabilidad de falla ni causa raíz automática.',
    }
  }

  if (name === 'get_asset_context_batch') {
    const canonicalAssetIds = requireAssetIds(args)
    return {
      mode,
      rows: canonicalAssetIds.map((canonicalAssetId) => assetContext(canonicalAssetId, context)),
      semantics: 'Lectura batch acotada de evidencia por activo. La evidencia observada describe hechos/frecuencias registradas; no probabilidad de falla, diagnóstico ni autorización automática.',
    }
  }

  if (name === 'get_open_work_orders') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.operational_work_orders, canonicalAssetId).filter((row) =>
        !['closed', 'cerrada', 'cerrado', 'completed', 'completada', 'completado', 'cancelled', 'cancelada', 'cancelado'].includes(normalizedText(row?.status))
      ),
      authority: 'La herramienta no crea, modifica, prioriza ni cierra OT.',
    }
  }

  if (name === 'get_maintenance_plan') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.preventive_hour_status, canonicalAssetId),
      semantics: 'Estado derivado desde pauta y evidencia de horómetro; no implica ejecución automática.',
    }
  }

  if (name === 'get_observed_condition_history') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.observed_conditions_90d, canonicalAssetId),
      pending_reviews: byAsset(context.pending_operational_reviews, canonicalAssetId),
      semantics: 'Frecuencia observada en reportes; NO es probabilidad de falla ni diagnóstico confirmado.',
    }
  }

  if (name === 'get_closure_readiness') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.closure_readiness, canonicalAssetId),
      authority: 'La preparación de cierre no autoriza ni ejecuta el cierre; la decisión final es humana.',
    }
  }

  const canonicalAssetId = String(args.canonical_asset_id || '').trim() || null
  const decisionCase: MaintenancePreparedDecisionCase = {
    mode: 'prepare_only',
    decision_state: 'awaiting_human_review',
    execution_policy: 'human_only',
    canonical_asset_id: canonicalAssetId,
    title: String(args.title || '').trim(),
    canonical_fact: String(args.canonical_fact || '').trim(),
    professional_interpretation: String(args.professional_interpretation || '').trim(),
    hypothesis_to_review: String(args.hypothesis_to_review || '').trim() || null,
    evidence_for: Array.isArray(args.evidence_for) ? args.evidence_for.map(String) : [],
    evidence_against: Array.isArray(args.evidence_against) ? args.evidence_against.map(String) : [],
    missing_evidence: Array.isArray(args.missing_evidence) ? args.missing_evidence.map(String) : [],
    next_best_action: String(args.next_best_action || '').trim(),
    human_checkpoint: String(args.human_checkpoint || '').trim(),
    impact: { expected: null, observed: null, status: 'not_measured' },
  }

  if (!decisionCase.title || !decisionCase.canonical_fact || !decisionCase.professional_interpretation || !decisionCase.next_best_action || !decisionCase.human_checkpoint) {
    throw new Error('El caso preparado requiere hecho canónico, interpretación, próxima acción y checkpoint humano')
  }

  return decisionCase
}
