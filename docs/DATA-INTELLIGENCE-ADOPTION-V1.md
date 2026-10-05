# MOTIL — N3uralia Data Intelligence Adoption v1

MOTIL adopts the N3uralia Data Intelligence Contract v1 incrementally.

## Canonical ownership

Canonical operational state remains in MOTIL domain tables and workflows. The readiness layer must never become a second source of truth.

Primary domains to map first:
- assets / equipment;
- maintenance work orders;
- people and responsibility;
- inventory / materials;
- production;
- legal / SERNAGEOMIN documents and deadlines.

Existing audit/event trails remain evidence of change, not a replacement for current canonical state.

## First enforcement targets

1. AI/assistant surfaces that summarize operational state.
2. Data-quality and cross-module recommendations.
3. Maintenance recommendations before creating or changing an OT.
4. Legal/SERNAGEOMIN assistant before consequential conclusions.
5. Any future automated action that writes canonical state.

## MOTIL readiness policy

Before consequential AI output:
- resolve canonical entity ID;
- verify actor authorization;
- identify freshness of horometer/production/maintenance/document evidence;
- distinguish source observation, normalized value, derived KPI and AI interpretation;
- block temporal leakage;
- surface contradictions instead of silently choosing one;
- never treat a missing field as zero;
- keep agent memory non-canonical.

## Observe-mode rollout

Phase 1 is additive only. Instrument representative decision surfaces and return READY / LIMITED / BLOCKED telemetry without changing workflow behavior.

Only after observed blocker quality is reviewed should enforcement prevent an action.

## High-risk examples

A maintenance recommendation must not be authoritative if current horometer or maintenance history is stale.
A legal conclusion must not be authoritative if the underlying document/version is missing or superseded.
An AI-generated finding must never silently rewrite asset, OT, inventory, production or legal canonical state.
