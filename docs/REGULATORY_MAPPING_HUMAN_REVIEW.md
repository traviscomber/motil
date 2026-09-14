# MOTIL — Regulatory Mapping Human Review

Status: **In progress** on `feat/regulatory-human-review`.

## Purpose

Persist explicit human decisions over proposed regulatory mappings without turning regulatory context into operational truth or legal compliance.

Target chain:

`Regulatory candidate → canonical MOTIL entity → human review → accepted / rejected / requires_review → traceable audit record`

## Persistence

Table: `motil_regulatory_mapping_reviews`.

Every review is scoped by `organization_id` and records:

- regulatory source;
- source anchor and anchor quality;
- regulatory code/label;
- MOTIL entity type/id;
- decision;
- reviewer user id;
- review note;
- review timestamp.

The table is backend-only with RLS enabled and service-role access.

## Acceptance gate

A mapping cannot be accepted unless both are true:

1. `source_anchor_status = stable_page_anchor`;
2. an exact non-empty regulatory code exists.

The gate exists both in application validation and as a database check constraint.

Current RES N°0886 extraction candidates are still `section_heading_only` and have no exact regulatory code in the observed excerpts, so they **cannot be accepted yet**. They may only remain `requires_review` or be explicitly rejected.

## Authorization

Read access follows existing HSE / Legal / Maintenance-managerial permissions.

Write decisions require edit-level access in HSE Documentation, HSE Risks or Legal. No regulatory endpoint creates a new permission bypass.

## Canonical boundary

A mapping review never:

- overwrites `canonical_assets_current` IDs;
- overwrites `hse_facilities` IDs;
- changes operational state;
- proves compliance or non-compliance;
- makes an unscoped inspection tenant-safe.

Target entities are checked against the current organization before persistence.

## API

`GET /api/intelligence/regulatory/mapping-reviews`

Returns tenant-scoped review history and whether the current user can edit.

`POST /api/intelligence/regulatory/mapping-reviews`

Records a human decision against a current RES N°0886 extraction candidate. The server resolves candidate provenance; it does not trust the client to supply regulatory codes or anchor quality.

## Remaining gate

Before this capability may be marked implemented in production:

- migration applied to Supabase `motil`;
- tests/lint/typecheck/build green;
- exact preview SHA READY;
- merge to `main`;
- exact production merge SHA READY;
- authenticated endpoint behavior verified where safe.

Inspection linkage remains a separate problem: `hse_inspections` still lacks a proven tenant key and stays excluded.
