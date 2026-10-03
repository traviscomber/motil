type SupabaseLike = {
  from: (table: string) => any;
};

type ScopedTask = {
  task_key: string;
  title: string;
  evidence_summary: string | null;
  status: string;
  severity: string;
  responsibility: 'owner' | 'support' | 'escalation';
  role_action: string | null;
  due_at: string | null;
  urgency_state: string | null;
  priority_score: number;
};

const TASK_COLUMNS = [
  'task_key',
  'title',
  'evidence_summary',
  'status',
  'severity',
  'responsibility',
  'role_action',
  'due_at',
  'urgency_state',
  'priority_score',
].join(',');

function urgencyLabel(task: ScopedTask) {
  if (task.responsibility === 'escalation') return 'Revisar escalación';
  if (task.responsibility === 'support') return 'Apoyar';
  if (task.urgency_state === 'escalated') return 'Resolver ahora';
  if (task.urgency_state === 'overdue') return 'Vencida';
  if (task.urgency_state === 'due_soon') return 'Próxima a vencer';
  return 'Pendiente';
}

function responsibilityLabel(responsibility: ScopedTask['responsibility']) {
  if (responsibility === 'owner') return 'Mi tarea';
  if (responsibility === 'support') return 'Apoyo';
  return 'Escalación';
}

export async function getVisibleScopedRoleTask({
  supabase,
  organizationId,
  cargoId,
  userId,
  taskKey,
}: {
  supabase: SupabaseLike;
  organizationId: string;
  cargoId: string;
  userId: string;
  taskKey: string;
}) {
  const actionable = await supabase
    .from('role_tasks_actionable_v1')
    .select(TASK_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('cargo_id', cargoId)
    .eq('task_key', taskKey)
    .order('priority_score', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (actionable.error) return { task: null, error: actionable.error };

  let task = actionable.data as ScopedTask | null;
  if (!task) {
    const escalation = await supabase
      .from('role_task_escalations_v1')
      .select(TASK_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('cargo_id', cargoId)
      .eq('task_key', taskKey)
      .order('priority_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (escalation.error) return { task: null, error: escalation.error };
    task = escalation.data as ScopedTask | null;
  }

  if (!task) return { task: null, error: null };

  const state = await supabase
    .from('user_action_states')
    .select('status,snoozed_until')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('source_key', taskKey)
    .maybeSingle();

  if (state.error) return { task: null, error: state.error };

  const snoozedUntil = state.data?.snoozed_until ? new Date(state.data.snoozed_until).getTime() : null;
  const hiddenBySnooze = state.data?.status === 'snoozed' && snoozedUntil !== null && snoozedUntil > Date.now();
  if (hiddenBySnooze) return { task: null, error: null };

  return {
    task: {
      ...task,
      visible_now: true,
      urgency_label: urgencyLabel(task),
      responsibility_label: responsibilityLabel(task.responsibility),
    },
    error: null,
  };
}
