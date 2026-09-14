create table if not exists public.motil_ai_decision_human_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  decision_case_id uuid not null,
  actor_user_id uuid not null,
  action_kind text not null check (action_kind in ('acknowledged','archived')),
  from_status text not null,
  to_status text not null,
  comment text check (comment is null or char_length(comment) <= 2000),
  recommendation_snapshot text,
  evidence_refs_snapshot jsonb not null default '[]'::jsonb,
  missing_evidence_snapshot jsonb not null default '[]'::jsonb,
  contradictions_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_motil_ai_decision_human_actions_case
  on public.motil_ai_decision_human_actions (organization_id, decision_case_id, created_at asc);
create index if not exists idx_motil_ai_decision_human_actions_actor
  on public.motil_ai_decision_human_actions (organization_id, actor_user_id, created_at desc);

alter table public.motil_ai_decision_human_actions enable row level security;
revoke all on table public.motil_ai_decision_human_actions from anon, authenticated;
grant select, insert, update, delete on table public.motil_ai_decision_human_actions to service_role;

create or replace function public.apply_motil_decision_human_action(
  p_organization_id uuid,
  p_user_id uuid,
  p_case_id uuid,
  p_action text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.motil_ai_decision_cases%rowtype;
  v_now timestamptz := now();
  v_action_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if p_action not in ('acknowledge', 'archive') then
    raise exception 'unsupported_decision_action' using errcode = '22023';
  end if;
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'decision_comment_too_long' using errcode = '22001';
  end if;

  select * into v_case
  from public.motil_ai_decision_cases
  where id = p_case_id
    and organization_id = p_organization_id
    and created_by_user_id = p_user_id
  for update;

  if not found then
    raise exception 'decision_case_not_found' using errcode = 'P0002';
  end if;

  if p_action = 'acknowledge' then
    if v_case.status = 'acknowledged' then
      return jsonb_build_object(
        'case', jsonb_build_object('id', v_case.id, 'status', v_case.status, 'acknowledged_at', v_case.acknowledged_at, 'updated_at', v_case.updated_at),
        'actionLogged', false,
        'duplicate', true
      );
    end if;
    if v_case.status <> 'open' then
      raise exception 'invalid_decision_transition' using errcode = '23514';
    end if;

    update public.motil_ai_decision_cases
    set status = 'acknowledged',
        acknowledged_by_user_id = p_user_id,
        acknowledged_at = v_now,
        updated_at = v_now
    where id = v_case.id;

    insert into public.motil_ai_decision_human_actions (
      organization_id, decision_case_id, actor_user_id, action_kind, from_status, to_status,
      comment, recommendation_snapshot, evidence_refs_snapshot, missing_evidence_snapshot,
      contradictions_snapshot, created_at
    ) values (
      p_organization_id, v_case.id, p_user_id, 'acknowledged', v_case.status, 'acknowledged',
      v_comment, v_case.recommended_human_action, coalesce(v_case.evidence_refs, '[]'::jsonb),
      coalesce(v_case.missing_evidence, '[]'::jsonb), coalesce(v_case.contradictions, '[]'::jsonb), v_now
    ) returning id into v_action_id;

    return jsonb_build_object(
      'case', jsonb_build_object('id', v_case.id, 'status', 'acknowledged', 'acknowledged_at', v_now, 'updated_at', v_now),
      'actionId', v_action_id,
      'actionLogged', true,
      'duplicate', false
    );
  end if;

  if v_case.status = 'archived' then
    return jsonb_build_object(
      'case', jsonb_build_object('id', v_case.id, 'status', v_case.status, 'acknowledged_at', v_case.acknowledged_at, 'updated_at', v_case.updated_at),
      'actionLogged', false,
      'duplicate', true
    );
  end if;

  update public.motil_ai_decision_cases
  set status = 'archived',
      updated_at = v_now
  where id = v_case.id;

  insert into public.motil_ai_decision_human_actions (
    organization_id, decision_case_id, actor_user_id, action_kind, from_status, to_status,
    comment, recommendation_snapshot, evidence_refs_snapshot, missing_evidence_snapshot,
    contradictions_snapshot, created_at
  ) values (
    p_organization_id, v_case.id, p_user_id, 'archived', v_case.status, 'archived',
    v_comment, v_case.recommended_human_action, coalesce(v_case.evidence_refs, '[]'::jsonb),
    coalesce(v_case.missing_evidence, '[]'::jsonb), coalesce(v_case.contradictions, '[]'::jsonb), v_now
  ) returning id into v_action_id;

  return jsonb_build_object(
    'case', jsonb_build_object('id', v_case.id, 'status', 'archived', 'acknowledged_at', v_case.acknowledged_at, 'updated_at', v_now),
    'actionId', v_action_id,
    'actionLogged', true,
    'duplicate', false
  );
end;
$$;

revoke all on function public.apply_motil_decision_human_action(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_motil_decision_human_action(uuid, uuid, uuid, text, text) to service_role;
