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

Current executive evidence coverage includes Production, Maintenance, Inventory / warehouse, Procurement and Finance, with Geology and HSE integrated through the broader Intelligence architecture and Decision Cases.

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

Implemented in the current development branch, pending merge/release verification:

- allow-listed stable working context: role, responsibilities, terminology, preferences and work scope;
- explicit exclusion of volatile operational facts, metrics, alerts, statuses, priorities and conclusions;
- tenant + user scoped read-only governed-memory context;
- Executive Assistant consumes the governed-memory loader in a physically separate prompt section;
- fail-open behavior: memory failure does not block canonical evidence reasoning;
- response metadata exposes availability, count, domains, authority and error state for auditability.

Do not claim this as production functionality until the merged SHA passes the production release gate.

### SERNAGEOMIN Regulatory Knowledge Pack v1

Documentation and the first executable regulatory-context layer are implemented in the current development branch, pending merge/release verification.

Current branch evidence:

- versioned SERNAGEOMIN source registry in `lib/intelligence/regulatory-sources.ts`;
- read-only endpoint `GET /api/intelligence/regulatory/sources`;
- explicit separation between `regulatory_knowledge` and operational truth;
- source provenance fields including authority, canonical URL, resolution/version, review date and domain tags;
- RES N°0886 installation-taxonomy contract and read-only endpoint;
- approved RES N°0886 node list remains empty until exact official extraction + stable source/page anchors + human review;
- partial candidates are kept outside the approved reference set;
- `docs/RES0886_EXTRACTION_LOG.md` records extraction evidence and promotion gates.

Current registered context includes RES N°0886, DS 132, SIMIN / safety forms, DS 248 + E-700, closure guides and Declaración Minera 2025.

Product rule: regulatory knowledge describes expectations, structures and evidence requirements. It never proves operational compliance by itself.

### Regulatory Evidence Linking — Stages 1 + 2

The deterministic contract and canonical evidence inventory are implemented in the development branch, pending merge/release verification.

Architecture:

`Installation / process → regulatory requirement → expected evidence → canonical evidence reference → human validation`

Current behavior:

- statuses are deterministic: `observed`, `missing`, `not_applicable`, `requires_review`;
- `observed` means a canonical evidence reference is visible, not that compliance is proven;
- `missing` means a validation/evidence gap, not proof of non-compliance;
- `not_applicable` requires human validation;
- `requires_review` cannot become a legal conclusion automatically;
- canonical operational sources remain authoritative;
- no LLM is used to assign evidence status;
- endpoint `GET /api/intelligence/regulatory/evidence-linking` is read-only and returns policy, coverage and tenant-scoped canonical evidence inventory;
- tenant-scoped evidence currently comes from `canonical_assets_current`, `documents`, `hse_commitments` and `hse_facilities`;
- provenance is preserved from source metadata where available;
- `hse_inspections` is intentionally blocked because its current schema exposes no `organization_id` or equivalent tenant key;
- `complianceVerdictCalculated` remains `false`.

Do not yet claim automated regulatory compliance, automatic reportability, legal certification, complete RES N°0886 mapping or tenant-safe inspection linkage.

## Planned

### Controlled memory capture

Stable working preferences/context will be captured with provenance and user control. MOTIL will not automatically memorize operational claims.

### Invisible specialists

Target experience: one MOTIL Intelligence Core for the user, with permission-scoped domain specialists operating behind it. The user should not need to choose among multiple AI chats.

### RES N°0886 exact taxonomy completion

Next regulatory step:

- complete extraction of installation codes/labels from the official resolution;
- retain stable source/page anchors and version metadata;
- require human review before promotion to approved reference;
- map reference taxonomy to MOTIL entities without replacing canonical company identifiers.

### Regulatory Evidence Linking — Stage 3

Next implementation step:

- create a tenant-safe inspection source or deterministic proven join;
- connect approved regulatory anchors to canonical evidence references;
- add explicit human accept/reject/review traceability;
- preserve source freshness and provenance;
- keep `observed`, `missing`, `not_applicable` and `requires_review` separate from any legal verdict.

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

**Evidence before compliance claims.** MOTIL can distinguish evidence observed, evidence missing and cases requiring human review without automatically issuing legal conclusions.

## Evidence register

- PR #199: Consolidate Operational Attention into executive home.
- Merge commit: `852beafc29315eae986faca2bec2023333b1858b`.
- Prioritized endpoint: `app/api/intelligence/decision-cases/prioritized/route.ts`.
- Executive priority UI: `components/dashboard/home-decision-priorities.tsx`.
- Executive assistant: `app/api/intelligence/executive-assistant/route.ts`.
- Governed memory contract: `lib/intelligence/governed-memory.ts`.
- Executive governed-memory loader: `lib/intelligence/executive-governed-memory.ts`.
- Governed memory architecture: `docs/INTELLIGENCE_GOVERNED_MEMORY.md`.
- SERNAGEOMIN regulatory architecture/source register: `docs/SERNAGEOMIN_KNOWLEDGE_PACK_V1.md`.
- RES 0886 extraction evidence: `docs/RES0886_EXTRACTION_LOG.md`.
- Regulatory source registry: `lib/intelligence/regulatory-sources.ts`.
- Regulatory installation contract: `lib/intelligence/regulatory-installation-context.ts`.
- Regulatory evidence linking contract: `lib/intelligence/regulatory-evidence-link.ts`.
- Regulatory canonical evidence loader: `lib/intelligence/regulatory-canonical-evidence.ts`.
- Regulatory evidence linking endpoint: `app/api/intelligence/regulatory/evidence-linking/route.ts`.
- Regulatory Stage 2 documentation: `docs/REGULATORY_EVIDENCE_LINKING_STAGE2.md`.
- Regulatory boundary tests: `tests/regulatory-source-registry.test.mjs`, `tests/regulatory-installation-context.test.mjs`, `tests/regulatory-evidence-linking.test.mjs`.

Update this register whenever a roadmap capability moves from Planned → In progress → Implemented.
