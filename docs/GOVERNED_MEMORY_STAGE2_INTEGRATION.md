# MOTIL — Governed Memory Stage 2 Integration

Status: **Implemented in PR #200; pending production release verification until merge deployment is READY.**

## Goal

Allow the Executive Intelligence Core to use stable user working context without converting memory into operational truth or widening permissions.

## Implemented

`lib/intelligence/executive-governed-memory.ts` provides a dedicated fail-open loader for executive reasoning and `app/api/intelligence/executive-assistant/route.ts` consumes it directly.

Contract:

- always scopes reads by `organization_id` and `user_id`;
- reads only active memory;
- `executive` memory is always eligible;
- domain memory is eligible only when that domain is already authorized for the current executive user;
- the governed-memory allow-list removes volatile operational categories;
- prompt output is explicitly `non_canonical`;
- memory read failure returns an empty governed-memory context instead of blocking canonical operational reasoning;
- response metadata exposes availability, count, domains, authority and error state for auditability.

## Fail-open rule

Governed Memory is useful context, not a dependency of operational truth.

If memory cannot be read:

`Canonical evidence + permissions + Decision Cases continue normally.`

MOTIL must never fail an executive operational query solely because user memory is unavailable.

## Prompt boundary

The Executive Assistant keeps these sections physically separate:

1. `AUTHORIZED DOMAINS`
2. `GOVERNED MEMORY — NON CANONICAL`
3. `CONVERSATION HISTORY — NON CANONICAL`
4. `DECISION CASE / ADVISORY CONTEXT — NON CANONICAL`
5. `CANONICAL MOTIL EVIDENCE`
6. `CURRENT QUESTION`

Canonical evidence remains authoritative.

## Brochure evidence candidate after release verification

> MOTIL can preserve stable working context for each authorized user while re-reading operational facts from current canonical sources at decision time.

Do not claim autonomous memory of operational facts, autonomous compliance, or decision authority.
