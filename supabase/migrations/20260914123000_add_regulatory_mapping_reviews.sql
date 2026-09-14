create table if not exists public.motil_regulatory_mapping_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_id text not null,
  source_anchor text not null,
  source_anchor_status text not null check (source_anchor_status in ('section_heading_only','stable_page_anchor','other')),
  regulatory_code text,
  regulatory_label text not null,
  motil_entity_type text not null,
  motil_entity_id text not null,
  decision text not null default 'requires_review' check (decision in ('requires_review','accepted','rejected')),
  review_note text,
  reviewed_by_user_id uuid not null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motil_regulatory_mapping_reviews_accept_gate check (
    decision <> 'accepted'
    or (source_anchor_status = 'stable_page_anchor' and regulatory_code is not null and btrim(regulatory_code) <> '')
  ),
  constraint motil_regulatory_mapping_reviews_unique unique (
    organization_id,
    source_id,
    source_anchor,
    regulatory_label,
    motil_entity_type,
    motil_entity_id
  )
);

create index if not exists idx_motil_regulatory_mapping_reviews_org_decision
  on public.motil_regulatory_mapping_reviews (organization_id, decision, reviewed_at desc);

create index if not exists idx_motil_regulatory_mapping_reviews_source
  on public.motil_regulatory_mapping_reviews (organization_id, source_id, regulatory_label);

alter table public.motil_regulatory_mapping_reviews enable row level security;
revoke all on table public.motil_regulatory_mapping_reviews from anon, authenticated;
grant select, insert, update, delete on table public.motil_regulatory_mapping_reviews to service_role;
