# MOTIL Intelligence Core — Governed Memory

Status: implementation in progress on `feat/governed-intelligence-memory`.

## Purpose

Governed Memory gives the MOTIL Intelligence Core stable user working context without turning conversational memory into operational truth.

The contract is deliberately narrow: MOTIL may retain stable context that helps adapt language, focus and presentation, while every operational statement must continue to be resolved from current canonical evidence at decision time.

## Allowed memory

- role / cargo context;
- stable responsibilities;
- terminology used by the user or operation;
- presentation and working preferences;
- stable work scope.

## Explicitly forbidden as governed user memory

- operational facts or current states;
- KPIs, measurements and balances;
- alerts, incidents and events;
- stock levels, production values or financial amounts;
- work-order or purchase-order state;
- inferred risks, root causes, conclusions or priorities;
- permissions or authorization claims.

These items belong to canonical operational sources and must be re-read when MOTIL reasons about a decision.

## Isolation and authority

All memory reads are scoped by `organization_id` and `user_id`. Only active records are eligible. Governed Memory is non-canonical and cannot grant permissions, authorize an action, prove a fact, preserve a previous priority or replace current evidence.

The first read-only contract is exposed through:

`GET /api/intelligence/memory/context?domain=executive&limit=12`

It filters `motil_ai_user_memory` through an allow-list before any item can be presented as prompt context. The endpoint performs no operational mutation.

## Relationship with Decision Cases

Governed Memory and Decision Cases solve different problems:

- Governed Memory: stable context about how the user works.
- Decision Case: persistent, auditable context about a decision that must be revalidated against current evidence.
- Canonical operational sources: the authoritative current facts.

Target reasoning chain:

`User → Intelligence Core → Governed Memory → Decision Case → Specialist → Canonical Evidence → Recommendation → Human Decision → Traceability`

The order is conceptual, not an authority hierarchy. Canonical evidence always wins over conversation history, memory and advisory context.

## Implementation stages

### Stage 1 — contract and safe read model

Implemented in this branch:

- governed-memory allow-list and sanitizer;
- explicit rejection of volatile/operational memory categories;
- tenant + user scoped read-only endpoint;
- prompt-safe representation with non-canonical policy;
- regression tests for isolation and no-write behavior.

### Stage 2 — Intelligence Core consumption

Next:

- load eligible governed context inside the Executive Assistant before model reasoning;
- keep it in a separate prompt section from canonical evidence and conversation history;
- expose memory usage in response metadata for auditability;
- fail closed: inability to read memory must not block canonical operational reasoning.

### Stage 3 — controlled capture

Planned:

- explicit or strongly governed capture of stable preferences/context;
- provenance and timestamps;
- user visibility and activation/deactivation;
- no automatic persistence of operational claims.

### Stage 4 — invisible specialists

Planned:

A single MOTIL Intelligence Core will route authorized questions to domain specialists while keeping one user-facing assistant. Specialist routing must not widen permissions.

## Non-negotiable guardrails

1. Memory is non-canonical.
2. Memory never grants permission.
3. Operational truth is resolved from canonical sources at decision time.
4. Previous recommendations do not preserve priority automatically.
5. No autonomous mutation of operational truth.
6. Domain specialists remain permission-scoped.
7. Product claims must distinguish implemented functionality from roadmap items.
