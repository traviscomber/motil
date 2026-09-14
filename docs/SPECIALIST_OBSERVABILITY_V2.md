# Specialist Observability v2

Status: branch implementation, pending release gate.

## Objective

Make invisible Intelligence Core specialist participation auditable without turning specialists into a user-facing agent selector and without inferring routing from prompts.

## Source of truth

Attribution is derived only from persisted `source_refs` tool traces in `motil_ai_core_runs`.

Observed mappings currently include:

- Executive Core + Production from `read_executive_production`;
- Executive Core + Maintenance from `read_executive_maintenance`;
- Executive Core + Inventory from `read_executive_inventory`;
- Executive Core + Procurement from `read_executive_procurement`;
- Executive Core + Finance from `read_executive_finance`;
- Executive Core + Equipment from `read_equipment_intelligence`;
- multi-domain Maintenance + Inventory + Procurement from the observed supply-chain read tool;
- narrower Maintenance + Inventory or Maintenance + Procurement mappings from their corresponding observed dependency tools.

Unknown tool traces remain visible as unknown tools instead of being guessed into a specialist.

## Evaluation surface

`GET /api/intelligence/evaluation/recent` now returns:

- per-run `observedSpecialists` derived from exact persisted tool refs;
- aggregate observed specialist counts;
- traced run count;
- attributed run count;
- specialist attribution coverage.

The legacy single `specialist` field remains available for compatibility. The new observed trace is the more explicit audit surface for multi-domain runs.

## Boundaries

- no prompt inference;
- no LLM classification;
- no user-facing agent selector;
- no permission expansion;
- no operational mutation;
- attribution says which specialist source path was actually read, not that the specialist's conclusion was correct.

This closes the roadmap gap for explicit invisible-specialist observability while preserving the single Intelligence Core UX.
