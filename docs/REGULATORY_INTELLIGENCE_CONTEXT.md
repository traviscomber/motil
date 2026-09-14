# MOTIL — Regulatory Intelligence Context

Status: **In progress** on `feat/regulatory-intelligence-context`.

## Goal

Expose SERNAGEOMIN context to the MOTIL Intelligence Core without mixing it with operational truth, governed memory, conversation history or Decision Cases.

Target separation:

`Operational Truth ≠ Regulatory Context ≠ Governed Memory ≠ Conversation History ≠ Decision Cases`

## Implemented in this branch

- `lib/intelligence/regulatory-intelligence-context.ts` composes:
  - the SERNAGEOMIN source registry;
  - the governed RES N°0886 installation context;
  - tenant-scoped canonical evidence already available from assets, documents and HSE;
  - permission-derived coverage.
- `GET /api/intelligence/regulatory/context` exposes the composed context read-only for QA and future assistant integration.
- context is fail-open: if the regulatory layer fails, MOTIL must continue reasoning from authorized canonical operational evidence.
- no legal-compliance verdict is calculated.
- no regulatory reference may override canonical company identifiers or operational state.

## Prompt rule

The regulatory context uses this answer pattern:

`OBSERVADO EN MOTIL → REFERENCIA REGULATORIA → BRECHA / INCERTIDUMBRE → VALIDACIÓN HUMANA`

Regulatory context may describe what a source expects or structures. It may not assert that the site complied, failed to comply, is reportable, is certified, or that a requirement is legally applicable without explicit authoritative evidence and human validation.

## Current limitations

- RES N°0886 approved taxonomy remains empty until stable official anchors + human review.
- `hse_inspections` remains excluded from tenant-scoped evidence because its current schema does not expose a proven tenant key.
- the Executive Assistant does not yet consume this new regulatory context helper in this branch.

## Next integration

Wire `loadRegulatoryIntelligenceContext` into the Executive Assistant as a physically separate advisory prompt section. Response metadata must expose availability/coverage without treating regulatory context as canonical evidence.

## Brochure evidence candidate after merge + production validation

> MOTIL can combine authorized operational evidence with governed SERNAGEOMIN reference context while keeping regulatory expectations separate from proof of compliance.

Do not use this as an unqualified production claim until the branch is merged and the exact production SHA passes the release gate.
