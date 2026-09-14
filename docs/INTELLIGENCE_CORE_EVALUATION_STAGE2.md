# Intelligence Core Evaluation — Stage 2

Status: branch implementation, pending release gate.

## Objective

Evaluate each Executive Intelligence Core answer against the exact canonical evidence object and source/tool refs used for that answer, without treating automated checks as proof of full semantic correctness.

## Runtime flow

`canonical evidence → model answer → persisted assistant message → deterministic grounded evaluator → motil_ai_core_runs evaluation metadata`

For normal Executive Core model responses, the runtime now evaluates:

- response presence and source/tool trace;
- numeric claims not present in the exact evidence object;
- MTBF/MTTR claims when reliability coverage is unavailable;
- stock availability claims without Inventory evidence;
- prohibited automatic compliance verdicts;
- authorization boundary preservation.

The result is persisted to the run created for the exact `response_message_id`:

- `evaluation_state`;
- `evaluation_detail`;
- `evaluator_version`;
- `evaluated_at`.

Persistence is scoped by organization, user and response message. Evaluation writes only to the Intelligence observability ledger and never to operational truth.

## Authority boundary

A `passed` result means only that deterministic grounding guards passed. It does not prove complete semantic accuracy, usefulness, legal interpretation or causal correctness.

`needs_review` means at least one deterministic boundary requires inspection. It is not itself an operational incident or compliance finding.

## Observability

`GET /api/intelligence/evaluation/recent` now exposes evaluation metadata and aggregate grounded-evaluation coverage for the authenticated executive user.

## Exclusions

- Synthetic read-only action denials are not semantically graded as normal model answers.
- No operational table is mutated by evaluation.
- No hidden domain is added to the evidence set.
- No LLM judge is used for deterministic boundaries in this stage.

## Next stage

1. Persist Core runtime failures separately from successful answer runs.
2. Add grounded scenario execution against canonical evaluation prompts.
3. Connect human usefulness feedback/outcome where an authorized workflow preserves it.
4. Keep visual/role QA separate from semantic evaluation.
