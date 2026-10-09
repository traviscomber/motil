-- Idempotency for locally captured maintenance notes. This is additive and does not modify OT timer state.
create unique index if not exists work_order_events_offline_note_unique
on public.work_order_events (organization_id, source_record_id)
where source_table = 'motil_offline_note' and source_record_id is not null;
