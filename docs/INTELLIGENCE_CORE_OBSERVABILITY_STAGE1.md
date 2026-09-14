# Intelligence Core Observability — Stage 1

Status: branch implementation, pending release gate.

## Objective

Implement the first half of ROADMAP Phase T without introducing a second AI runtime or pretending telemetry proves answer correctness.

## What is captured automatically

Every persisted assistant message creates one backend-only `motil_ai_core_runs` record with:

- organization and user boundary;
- conversation and response message reference;
- domain and observed specialist;
- source/tool references;
- source/tool counts;
- end-to-end latency measured from the latest user message in the same conversation;
- model;
- response length;
- evaluation state.

The ledger does not duplicate prompt or response text. Full conversation content remains in the existing governed conversation store.

## Specialist attribution

Stage 1 derives only what is directly observable from tool traces. `read_equipment_intelligence` marks an Equipment Intelligence run; executive read tools mark Executive Core. It does not infer invisible specialists that were not actually invoked.

## Permanent evaluation seed set

Canonical scenarios now include:

1. What work orders are blocked?
2. What requires attention today?
3. Do we have the parts for these work orders?
4. What is happening with equipment X?
5. Which drill holes require review?

Automated Stage 1 checks only structural observability: response present, source trace, tool trace, latency and expected specialist where applicable.

Semantic accuracy, hallucination assessment and usefulness remain `requires_grounded_review`; telemetry is never treated as proof that an answer is correct.

## Read endpoint

`GET /api/intelligence/evaluation/recent?hours=24`

Returns only tenant/user-scoped telemetry and structural summary for the authenticated executive user. It is read-only and never mutates operational truth.

## Data boundary

`motil_ai_core_runs` has RLS enabled, no client policies, and is service-role only. The trigger is append-only from persisted assistant messages.

## Next stage

- grounded answer evaluation against the exact source snapshot used by each run;
- permission regression scenarios by role;
- explicit runtime error capture for failed Core requests;
- human usefulness feedback and outcome linkage;
- aggregate evaluation trend without exposing conversation content.
