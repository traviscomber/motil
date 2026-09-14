# HSE Inspection Tenancy v1

Status: branch implementation, pending release gate and migration.

## Problem

`hse_inspections` is a legacy table without `organization_id` and without a foreign key that can deterministically resolve tenant ownership. Existing rows therefore cannot be exposed to the Intelligence Core as tenant-safe canonical evidence.

Several legacy aggregate views currently encapsulate this data for N3uralia by hardcoded organizational context. That is compatibility behavior, not proof that each source row has canonical tenant ownership, and it is not reused by Regulatory Evidence Linking.

## Safe boundary

This change introduces an explicit mapping layer:

`hse_inspections → motil_hse_inspection_tenant_links → canonical_hse_inspections_v1`

A legacy inspection appears in `canonical_hse_inspections_v1` only when a durable mapping row explicitly records:

- `inspection_id`;
- `organization_id`;
- `mapped_by_user_id`;
- mapping reason;
- mapping evidence;
- mapping timestamp.

No existing inspection is auto-mapped and there is no heuristic mapping by inspection number, scope, location, cargo or text.

## Security

- mapping table has RLS enabled;
- no anon/authenticated table privileges;
- canonical view is `security_invoker` and service-role read only;
- Regulatory Evidence Linking still filters the canonical view by current `organization_id`;
- existing HSE module permissions control whether the `inspections` evidence scope is loaded;
- unmapped legacy rows remain invisible to the Intelligence Core.

## Regulatory semantics

Inspection evidence remains operational evidence only. Its presence does not prove SERNAGEOMIN compliance, applicability, closure of findings or legal sufficiency.

## Current production data

Before this change, four legacy `hse_inspections` rows were observed and none had a tenant key or FK. Their common creation timestamp and legacy N3uralia wrappers are not sufficient provenance for automatic tenant assignment. Therefore this migration intentionally performs no backfill.

## Follow-up

Tenant mappings should be created only after explicit data-governance review of row provenance. Once mapped, the existing Regulatory Context can expose the inspection as a canonical ref without reading the unscoped base table directly.
