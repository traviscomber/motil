# MOTIL — Regulatory Evidence Linking Stage 2

Status: implemented in PR #200 branch, pending CI/deployment validation and merge.

## Goal

Connect regulatory context to real MOTIL canonical evidence without converting the presence or absence of a record into a legal-compliance verdict.

Target chain:

`Regulatory requirement → expected evidence → authorized canonical MOTIL reference → human validation`

## Implemented canonical sources

The Stage 2 loader reads only organization-scoped canonical sources and only when the current user has an authorized module that can legitimately expose that evidence class.

### Assets

Source: `canonical_assets_current`

Tenant boundary: `organization_id`.

Canonical reference format:

`canonical_assets_current:<uuid>`

Preserved provenance includes source file/sheet/row and validation status when available.

### Documents

Source: `documents`

Tenant boundary: `organization_id`.

Canonical reference format:

`documents:<uuid>`

Preserved provenance includes module, category, document type, version and current document status.

### HSE

Sources:

- `hse_commitments`
- `hse_facilities`

Both expose `organization_id` and are queried under the authenticated organization.

Canonical references:

- `hse_commitments:<uuid>`
- `hse_facilities:<uuid>`

The loader preserves source file/row/hash metadata where available.

## Inspection boundary discovered

`hse_inspections` currently does not expose `organization_id` or another proven tenant key in the observed production schema.

Therefore Stage 2 explicitly does **not** query this table.

Coverage status is returned as:

`blocked_unscoped_source`

This is intentional. MOTIL must prefer an honest evidence gap over exposing inspection records across tenant boundaries.

Inspection evidence can only be enabled after one of these conditions is proven:

1. the table receives a canonical tenant key;
2. a tenant-scoped canonical view is introduced;
3. a deterministic join to an organization-scoped parent is proven and tested.

## Permission boundary

The endpoint derives readable evidence scopes from the current MOTIL module matrix.

Examples:

- asset evidence requires an authorized maintenance or production operations scope;
- document evidence requires an authorized document/legal/sustainability scope;
- HSE evidence requires an authorized HSE scope.

Admin roles continue to use the existing module-access bypass rules. No new bypass was introduced.

## API

`GET /api/intelligence/regulatory/evidence-linking?limit=25`

The response contains:

- deterministic regulatory evidence status contract;
- `canonicalEvidence.items` with real canonical references;
- coverage per evidence scope;
- explicit blocked inspection source metadata;
- `operationalMutationExecuted: false`;
- `complianceVerdictCalculated: false`;
- authority `advisory_reference_only`.

## Critical interpretation rule

A canonical reference proves only that MOTIL can currently observe that record for the authorized organization.

It does not prove:

- that the regulatory requirement applies;
- that the evidence is legally sufficient;
- that the evidence is current enough for a filing;
- that an inspector would accept it;
- that the operation is compliant or non-compliant.

Those conclusions remain human/legal validation steps.

## Brochure-safe claim after release validation

> MOTIL can connect mining regulatory context to tenant-scoped operational evidence across assets, documents and HSE while preserving provenance and keeping legal validation with people.

Do not yet claim complete inspection coverage, automated compliance, certification or automatic reportability.

## Files

- `lib/intelligence/regulatory-evidence-link.ts`
- `lib/intelligence/regulatory-canonical-evidence.ts`
- `app/api/intelligence/regulatory/evidence-linking/route.ts`
- `tests/regulatory-evidence-linking.test.mjs`

## Next stage

1. Add a tenant-safe inspection source.
2. Connect approved regulatory anchors/requirements to canonical evidence references.
3. Add human review metadata for accepted/rejected evidence links.
4. Surface regulatory context to the Intelligence Core in a physically separate advisory section.
