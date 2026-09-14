# Intelligence Core Error Observability

Status: branch implementation, pending release gate and database migration.

## Objective

Persist failed Executive Intelligence Core requests as safe diagnostic telemetry without copying prompts, answers, raw exception messages, secrets or operational records into the observability layer.

## Runtime flow

`Executive Core request → controlled failure → safe classifier → motil_ai_core_errors`

The first stage records failures from the main Executive Assistant POST request path. It does not yet cover every continuity/archive/read path.

## Stored metadata

- organization and user boundary;
- optional conversation reference when available;
- domain;
- route intent and execution mode;
- bounded capability names;
- failure phase;
- safe error code;
- HTTP status;
- timestamp.

Safe error classes currently include configuration missing, model unavailable, AI upstream failure, canonical source contract failure, Core persistence failure and generic Core request failure.

## Data boundary

The ledger explicitly does not store:

- prompt or user message text;
- model response text;
- raw exception/error message;
- tokens, credentials or secrets;
- copied canonical operational payloads.

`motil_ai_core_errors` has RLS enabled and no client access. The application writes it through the existing server-side service boundary.

## Read endpoint

`GET /api/intelligence/evaluation/errors?hours=24`

The endpoint is executive-authorized, tenant/user-scoped and read-only. It exposes recent safe error metadata and aggregates by error code and failure phase.

## Failure behavior

Observability is fail-open: if telemetry persistence itself fails, the original controlled Core error response still returns. Error observability never mutates operational truth.

## Current coverage limitation

This stage instruments the main Executive Assistant POST request catch. GET continuity failures and archive-specific failures remain in application logs and are not yet persisted to this ledger.

## Next stage

- validate real runtime error capture without inducing destructive operational failures;
- expand safe coverage to other Core runtimes/specialists where useful;
- correlate error rate with grounded-evaluation coverage without copying conversation content;
- retain visual and role QA as separate gates.
