# MOTIL — Brochure Evidence Notes

Purpose: preserve product evidence while MOTIL evolves so future commercial material can be written without overclaiming.

Rule: every capability is marked **Implemented**, **In progress**, or **Planned**. Only **Implemented** items may be stated as current product functionality without qualification.

## Product narrative

MOTIL is an operational intelligence platform for mining that connects operational evidence, role-based access, persistent Decision Cases and human decision workflows. Its Intelligence Core is designed to reduce cognitive load: surface what requires attention, explain why it matters, show uncertainty and route the user back to the authorized operational context.

## Implemented

### Intelligence Core

- One executive conversational layer grounded in authorized MOTIL evidence.
- Read-only conversational policy for executive synthesis: no approvals, purchases, closures, stock adjustments or other operational mutations from the assistant.
- Permission-aware evidence gathering across authorized domains.
- Conversation history is explicitly treated as non-canonical context.

### Decision Cases

- Persistent advisory Decision Cases separated from canonical operational truth.
- Revalidation against current evidence instead of preserving old recommendations as facts.
- Deterministic Operational Attention scoring with P1/P2/P3 levels.
- Executive Home surfaces a maximum of three prioritized Decision Cases.
- Attention logic is explainable and does not use an LLM to invent priority.

### Cross-domain operational reasoning

Current executive evidence coverage includes:

- Production;
- Maintenance;
- Inventory / warehouse;
- Procurement;
- Finance;
- Geology through the broader Intelligence architecture;
- HSE / sustainability through Decision Cases.

MOTIL also has an explicit Maintenance → Inventory → Procurement read model for observable supply-chain dependencies. Status describes the visible chain; it is not automatically interpreted as root cause.

### Human control and governance

- Recommendations are advisory.
- Permissions remain authoritative.
- Missing access or missing data is not converted into an operational zero.
- Alerts and statuses are not automatically promoted to causal conclusions.
- Canonical evidence remains separate from conversation history and Decision Cases.

## In progress

### Governed Memory

Branch: `feat/governed-intelligence-memory`.

Implemented in the current development branch, pending merge:

- allow-listed stable working context: role, responsibilities, terminology, preferences and work scope;
- explicit exclusion of volatile operational facts, metrics, alerts, statuses, priorities and conclusions;
- tenant + user scoped read-only governed-memory context;
- prompt-safe non-canonical representation;
- regression checks that the context endpoint performs no writes.

Do not yet claim that the Executive Assistant automatically consumes Governed Memory until Stage 2 is merged and validated.

### SERNAGEOMIN Regulatory Knowledge Pack v1

Documentation and the first executable regulatory-context layer are implemented in the current development branch, pending merge.

Current branch evidence:

- versioned SERNAGEOMIN source registry in `lib/intelligence/regulatory-sources.ts`;
- read-only endpoint `GET /api/intelligence/regulatory/sources`;
- explicit separation between `regulatory_knowledge` and operational truth;
- source provenance fields including authority, canonical URL, resolution/version, review date and domain tags;
- zero operational writes from the regulatory-source endpoint;
- RES N°0886 taxonomy envelope with `reference_only`, `never_overwrite_company_identifiers` and `human_review_required` boundaries;
- dedicated installation-taxonomy contract in `lib/intelligence/regulatory-installation-context.ts`;
- read-only endpoint `GET /api/intelligence/regulatory/installations`;
- approved RES N°0886 node list intentionally remains empty until exact official extraction + source anchors + human review;
- regression coverage protecting the no-compliance-claim, no-operational-mutation and no-partial-taxonomy-promotion boundaries.

Current registered context includes RES N°0886, DS 132, SIMIN / safety forms, DS 248 + E-700, closure guides and Declaración Minera 2025.

Product rule: regulatory knowledge describes expectations, structures and evidence requirements. It never proves operational compliance by itself.

Do not yet claim automated regulatory compliance, legal certification, automatic reportability or completed RES N°0886 taxonomy mapping.

## Planned

### Governed Memory Stage 2

The Intelligence Core will consume eligible stable user context in a prompt section physically and semantically separated from canonical evidence, conversation history and Decision Cases.

### Controlled memory capture

Stable working preferences/context will be captured with provenance and user control. MOTIL will not automatically memorize operational claims.

### Invisible specialists

Target experience: one MOTIL Intelligence Core for the user, with permission-scoped domain specialists operating behind it. The user should not need to choose among multiple AI chats.

### RES N°0886 exact taxonomy extraction

Next regulatory step:

- extract exact installation codes/labels from the official resolution;
- retain source anchor/version metadata;
- require human review before approving taxonomy records;
- map reference taxonomy to MOTIL entities without replacing canonical company identifiers.

### Regulatory Evidence Linking

Planned architecture:

`Installation / process → regulatory requirement → expected evidence → canonical evidence reference → human validation`

This layer should surface `evidence observed`, `evidence missing`, `not applicable` or `requires review`. It must not autonomously declare legal compliance.

### Regulatory-aware Intelligence Core

Planned prompt separation:

`Canonical Operational Evidence ≠ Regulatory Context ≠ Governed Memory ≠ Conversation History ≠ Decision Cases`

For regulatory questions the target answer pattern is:

`Observed in MOTIL → Regulatory expectation → Evidence gap → Human validation`

Target architecture:

`User → Intelligence Core → Governed Memory → Decision Case → Specialist → Canonical Evidence → Regulatory Context → Recommendation → Human Decision → Traceability`

## Commercial language candidates

Use after verifying status at brochure-production time:

**Operational Intelligence, not another dashboard.** MOTIL connects current evidence across the operation and turns it into a short list of explainable decisions and validations.

**AI with operational guardrails.** MOTIL separates canonical evidence from conversational context, respects user permissions and keeps final operational authority with people.

**From fragmented signals to a decision trail.** Persistent Decision Cases preserve the reasoning context while revalidating recommendations against current operational evidence.

**Less noise for management.** The executive experience is designed around a maximum of three evidence-backed priorities rather than another wall of alerts.

Candidate once the current branch is merged and validated:

**Mining context without pretending compliance.** MOTIL connects operational evidence with structured SERNAGEOMIN context while keeping regulatory expectations separate from proof of compliance.

## Evidence register

- PR #199: Consolidate Operational Attention into executive home.
- Merge commit: `852beafc29315eae986faca2bec2023333b1858b`.
- Prioritized endpoint: `app/api/intelligence/decision-cases/prioritized/route.ts`.
- Executive priority UI: `components/dashboard/home-decision-priorities.tsx`.
- Executive assistant: `app/api/intelligence/executive-assistant/route.ts`.
- Existing memory bridge: `app/api/intelligence/memory/route.ts`.
- Governed memory contract: `lib/intelligence/governed-memory.ts`.
- Governed memory read model: `app/api/intelligence/memory/context/route.ts`.
- Governed memory architecture: `docs/INTELLIGENCE_GOVERNED_MEMORY.md`.
- SERNAGEOMIN regulatory architecture/source register: `docs/SERNAGEOMIN_KNOWLEDGE_PACK_V1.md`.
- Regulatory source registry: `lib/intelligence/regulatory-sources.ts`.
- Regulatory source endpoint: `app/api/intelligence/regulatory/sources/route.ts`.
- Regulatory installation contract: `lib/intelligence/regulatory-installation-context.ts`.
- Regulatory installation endpoint: `app/api/intelligence/regulatory/installations/route.ts`.
- Regulatory boundary tests: `tests/regulatory-source-registry.test.mjs` and `tests/regulatory-installation-context.test.mjs`.

Update this register whenever a roadmap capability moves from Planned → In progress → Implemented.
