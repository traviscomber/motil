# Human Decision History v2

Status: branch implementation, pending release gate and database migration.

## Objective

Preserve an auditable distinction between an advisory MOTIL recommendation and a human lifecycle decision on a Decision Case.

Target trace:

`recommendation → evidence snapshot → human actor → acknowledge/archive decision → optional comment → timestamp`

This history does not claim that the recommended operational action was executed.

## Canonical v2 action path

`POST /api/intelligence/decision-cases/human-action`

Supported actions:

- `acknowledge`
- `archive`

The endpoint verifies organization, case owner and current domain permissions, then delegates to the atomic database RPC `apply_motil_decision_human_action`.

## Atomic persistence

A successful v2 human action changes the advisory Decision Case lifecycle and writes `motil_ai_decision_human_actions` in the same database transaction. The action log stores:

- organization and Decision Case;
- actor user;
- action kind;
- previous and resulting case status;
- optional human comment;
- recommendation snapshot visible at decision time;
- evidence refs snapshot;
- missing evidence snapshot;
- contradiction snapshot;
- timestamp.

Client input cannot replace those evidence/recommendation snapshots: they are copied from the locked Decision Case row inside the RPC.

## Timeline

`GET /api/intelligence/decision-cases/timeline?caseId=...` now composes lifecycle events with explicit v2 human actions. Explicit action-log events carry actor, comment, evidence and recommendation snapshot.

Legacy lifecycle events remain visible. When an older event has no v2 action record, the timeline labels the actor/comment/snapshot gap instead of inventing one.

## Authority boundary

- Decision Case recommendation and revalidation remain `advisory_only`.
- Acknowledge/archive is a `human_action` on the Decision Case lifecycle.
- Acknowledge/archive does not close an OT, move stock, approve procurement, change production or execute any recommended workflow.

## Current data state

At implementation time the production `motil_ai_decision_cases` table had no rows. No synthetic cases or action history are created to demonstrate the feature and no historical actor/comment backfill is invented.

## Compatibility

The existing generic Decision Cases endpoint remains available for legacy clients. New clients that require complete v2 actor/comment/evidence audit should use the dedicated `/human-action` path.

A later cleanup can migrate any remaining legacy acknowledgement/archive caller to the v2 endpoint once an authenticated UI caller is identified.
