# MOTIL — Regulatory Context in Executive Assistant

Status: **In progress** on `feat/regulatory-intelligence-context` pending release gate.

## What changed

The Executive Assistant now consumes `loadRegulatoryIntelligenceContext` as a physically separate advisory prompt section.

Prompt authority order remains explicit:

1. authorized domains / permissions;
2. governed memory — non-canonical;
3. regulatory context — advisory reference only;
4. conversation history — non-canonical;
5. Decision Case advisory handoffs — non-canonical;
6. canonical MOTIL operational evidence;
7. current question.

Regulatory context is **not** inserted into the canonical `evidence` object.

## Response audit metadata

The Executive Assistant exposes a separate `regulatoryContext` metadata object containing:

- `available`;
- `authority`;
- `allowedScopes`;
- `sourceCount`;
- `evidenceCount`;
- evidence `coverage`;
- `complianceVerdictCalculated`;
- `errorCode`.

This metadata is for traceability and does not change operational authority.

## Regulatory answer pattern

For regulatory questions the assistant is instructed to structure reasoning as:

`OBSERVADO EN MOTIL → REFERENCIA REGULATORIA → BRECHA/INCERTIDUMBRE → VALIDACIÓN HUMANA`

It must not infer legal applicability, compliance, non-compliance, causality or authorization from a regulatory source alone.

## Fail-open behavior

`loadRegulatoryIntelligenceContext` remains fail-open. If regulatory context cannot load, canonical operational reasoning continues and the assistant must say the regulatory context was unavailable.

## Boundaries still active

- RES N°0886 approved taxonomy remains empty pending stable official source/page anchors and human review.
- `hse_inspections` remains blocked because tenant isolation is not proven in the current schema.
- no operational mutation is introduced.
- no compliance score or legal verdict is calculated.

## Brochure evidence candidate after production verification

> MOTIL can place current operational evidence beside structured mining-regulatory context while preserving permissions, provenance and human validation, without converting regulatory references into automatic compliance claims.

Use only after the merged SHA passes the production release gate.
