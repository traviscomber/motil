# Equipment Intelligence — Core Integration

Status: implemented in PR branch; pending release gate and merge.

## What changed

The Executive Assistant can now resolve an explicit, unambiguous equipment mention and load the canonical Equipment Intelligence context already exposed by MOTIL.

Flow:

`user question → executive permissions → explicit equipment resolution → canonical equipment context → executive synthesis`

The equipment context remains part of canonical operational evidence. It does not become Governed Memory, Regulatory Context, conversation history, or an advisory Decision Case.

## Evidence boundaries

- Runtime/hour meter is not MTBF.
- `work_order_parts` does not prove warehouse stock availability.
- Empty reliability views mean evidence unavailable, not zero reliability.
- Observed recurrence is not a failure prediction.
- Equipment Decision Cases remain advisory and must be revalidated against current evidence.
- If equipment resolution is ambiguous, no equipment is selected automatically.

## Current production-data limitation

The current MOTIL dataset has active canonical assets and runtime evidence, but the audited reliability views have no rows because audited closure evidence has not yet accumulated. The Core must therefore state missing reliability evidence rather than fabricate MTBF, MTTR, recurrence, or audited cost.

## Brochure-safe claim after merge/release

“MOTIL can answer equipment-specific operational questions from connected canonical evidence across work orders, preventive maintenance, runtime, parts, reliability evidence and Decision Cases, while explicitly distinguishing missing evidence from zero and preserving human decision authority.”
