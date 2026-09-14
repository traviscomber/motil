# MOTIL — Governed Memory Stage 2 Integration

Status: **In progress** on `feat/governed-intelligence-memory`.

## Goal

Allow the Executive Intelligence Core to use stable user working context without converting memory into operational truth or widening permissions.

## Implemented in this branch

`lib/intelligence/executive-governed-memory.ts` provides a dedicated fail-open loader for executive reasoning.

Contract:

- always scopes reads by `organization_id` and `user_id`;
- reads only active memory;
- `executive` memory is always eligible;
- domain memory is eligible only when that domain is already authorized for the current executive user;
- the existing governed-memory allow-list still removes volatile operational categories;
- prompt output is explicitly `non_canonical`;
- memory read failure returns an empty governed-memory context instead of blocking canonical operational reasoning.

## Fail-open rule

Governed Memory is useful context, not a dependency of operational truth.

If memory cannot be read:

`Canonical evidence + permissions + Decision Cases continue normally.`

MOTIL must never fail an executive operational query solely because user memory is unavailable.

## Prompt boundary target

The Executive Assistant integration must keep these sections physically separate:

1. `AUTHORIZED DOMAINS`
2. `GOVERNED MEMORY — NON CANONICAL`
3. `CONVERSATION HISTORY — NON CANONICAL`
4. `DECISION CASE / ADVISORY CONTEXT — NON CANONICAL`
5. `CANONICAL MOTIL EVIDENCE`
6. `CURRENT QUESTION`

Canonical evidence remains authoritative.

## Not yet implemented

The Executive Assistant route does **not yet consume** this loader. The route wiring, response audit metadata and end-to-end verification remain pending.

Do not state in commercial material that the Executive Assistant already remembers stable user context automatically until that wiring is merged and validated.

## Brochure evidence candidate after validation

> MOTIL can preserve stable working context for each authorized user while re-reading operational facts from current canonical sources at decision time.

This wording becomes safe only after Executive Assistant consumption is verified in production.
