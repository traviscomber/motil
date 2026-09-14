# MOTIL — SERNAGEOMIN Knowledge Pack v1

Status: **In progress**

Purpose: define the first regulatory-knowledge layer for MOTIL using official SERNAGEOMIN sources, while keeping regulatory knowledge strictly separated from operational truth.

## Canonical rule

MOTIL must distinguish four evidence classes:

1. **Operational Truth** — canonical company data, source systems, approved documents, sensors and operational records.
2. **Regulatory Knowledge** — laws, regulations, SERNAGEOMIN instructions, guides and forms that describe obligations, expected evidence or reporting structures.
3. **External Reference** — public statistics, public registries, geological information and sector references.
4. **Governed Memory** — stable user context such as role, responsibilities, terminology and preferences.

A regulation may establish what should exist or what must be reported. It never proves that a specific mine complied. Compliance claims require company evidence.

## Source priority

### P0 — installation and asset structure

**RES N°0886 — Instructivo para estandarización de listado o estructura de quiebre de instalaciones mineras**

Official source:
- https://www.sernageomin.cl/mineria/
- https://www.sernageomin.cl/wp-content/uploads/2025/05/RES-0886-APRUEBA-MODIFICACIO%CC%81N-Estructura-de-Quiebre-2025.pdf

Why it matters to MOTIL:
- provides an official classification vocabulary for mining installations;
- can improve the canonical hierarchy `faena → instalación principal → instalación auxiliar → activo/equipo`;
- enables consistent joins between assets, maintenance, HSE, documents, inspections and closure obligations;
- reduces free-text naming drift across modules.

Target capability:
- `Regulatory installation taxonomy` mapped to MOTIL canonical assets without overwriting company source identifiers.

Guardrail:
- the SERNAGEOMIN classification is a reference taxonomy, not proof that a site has been formally registered under that exact structure.

### P0 — mining safety framework

**DS 132 — Reglamento de Seguridad Minera**

Official source:
- https://www.sernageomin.cl/gobiernotransparente/marconormativo/pdf/ReglamentodeSeguridadMinera.pdf
- SERNAGEOMIN Seguridad Minera: https://www.sernageomin.cl/seguridad-minera/

Relevant context:
- establishes the general safety framework for extractive mining activities;
- protects people and mining installations/infrastructure;
- supports obligations around operations, works, safety controls, reporting and inspection.

Target capability:
- regulatory references attached to HSE, assets, maintenance, inspections and operational procedures;
- answer `what evidence should exist?` without answering `is this site compliant?` unless canonical evidence is present.

Note:
- DS 30/2021 replaced Title XV of DS 132 for small mining. Regulatory ingestion must preserve version/provenance and effective-date metadata.

### P0 — regulatory reporting model

**SERNAGEOMIN Safety Forms / SIMIN — E-100, E-200, E-300 and related forms**

Official source:
- https://www.sernageomin.cl/formularios-seguridad-minera/
- https://www.sernageomin.cl/seguridad-minera/

Useful structures:
- accidentability reporting;
- production reporting;
- contractor/subcontractor monthly accident statistics;
- start-of-activities notices for principal companies and contractors;
- inspection requests;
- vehicle authorization for explosives transport;
- SERNAGEOMIN administrative/reporting workflows.

Target capability:
- `Regulatory Evidence Checklist` by company/faena/period;
- contractor and HSE reporting context;
- monthly obligation calendar without asserting submission unless MOTIL has the actual submission evidence.

### P0 — serious incident context

**Formulario de Aviso de Accidente Fatal, Grave y Alto Potencial**

Official source:
- https://www.sernageomin.cl/formularios-seguridad-minera/

Why it matters:
- gives MOTIL an official structure for high-consequence incident records;
- useful fields include company/faena/event/person context and notification traceability;
- can guide a future `Incident Case` model without replacing the canonical incident source.

Target capability:
- incident evidence completeness checks;
- human escalation and evidence checklist;
- regulatory notification context.

Guardrail:
- MOTIL must never infer that an event is legally reportable solely from an LLM classification. Classification should require deterministic rules and/or human confirmation.

### P1 — tailings / critical installation monitoring

**DS 248 — Reglamento para la aprobación de proyectos de diseño, construcción, operación y cierre de depósitos de relaves**

Official SERNAGEOMIN context:
- https://www.sernageomin.cl/autorizacion-construccion-relave/
- https://www.sernageomin.cl/seguridad-minera/

**E-700 — Informes trimestrales de depósitos de relaves**

Official source:
- https://www.sernageomin.cl/formularios-seguridad-minera/

SERNAGEOMIN exposes variants for:
- embalse o tranque de relaves;
- interior mina subterránea;
- interior mina a cielo abierto;
- relaves filtrados;
- relaves espesados de alta densidad o pasta.

The official forms include operational, geotechnical, instrumentation/monitoring and inspection information.

Target capability:
- reusable `Critical Installation Monitoring` pattern;
- evidence timelines, inspection observations, instrumentation readings and missing-evidence alerts;
- application beyond tailings only when semantically appropriate, e.g. monitoring patterns for other critical installations without pretending DS 248 governs them.

### P1 — closure lifecycle

**Ley 20.551 / Planes de Cierre and SERNAGEOMIN presentation guides**

Official source:
- https://www.sernageomin.cl/guias-de-presentacion-de-planes-de-cierre/
- https://www.sernageomin.cl/guias-aspectos-tecnicos-planes-de-cierre/

Published guidance includes:
- exploration and prospection closure;
- plan over 10,000 tpm;
- partial closure;
- temporary closure;
- closure-plan audits;
- risk assessment;
- physical and chemical stability;
- financial guarantees;
- useful life.

Target capability:
- full asset/faena lifecycle context: `operate → maintain → monitor → close → verify`;
- linkage between installations, closure measures, monitoring requirements, documents and cost/guarantee context;
- future closure Decision Cases grounded in company evidence.

### P1 — environmental-sector permits

**PAS 135 / PAS 136 / PAS 137**

SERNAGEOMIN public references confirm:
- PAS 135: construction and operation of tailings deposits;
- PAS 136: waste-rock dump or mineral accumulation;
- PAS 137: mining closure plan approval.

Official SERNAGEOMIN reference:
- https://www.sernageomin.cl/wp-content/uploads/2018/07/NormativasInternacionalesRelaves.pdf
- SERNAGEOMIN annual-report references also describe the Service's evaluation role in SEIA.

Target capability:
- `Installation → Permit → Resolution → Condition → Evidence → Review/Expiry` graph;
- permit completeness and evidence traceability;
- link regulatory conditions to the installation taxonomy and documents module.

Guardrail:
- environmental authorization status must come from the actual company resolution/permit evidence or authoritative registry, not from the generic guide.

### P1 — small-mining master context

**Declaración Minera 2025**

Official source:
- https://www.sernageomin.cl/declaracion-minera/

The procedure consolidates, for eligible operations up to 1,000 t/month, start of operation, exploitation-project approval and closure-plan project into one process.

Why it matters to MOTIL:
- useful as a compact model of `Mining Operation Master Context`;
- reveals the minimum connected context between operation, project, installation and closure.

Guardrail:
- use as modeling reference; do not apply the simplified procedure to operations outside its legal scope.

## External reference layer

### Accidentability statistics

SERNAGEOMIN publishes official mining accidentability statistics and annual reports.

Use in MOTIL:
- taxonomy/benchmark context;
- historical reference by type of event, region or operation type when available;
- supporting context for training and prevention.

Do not use to:
- infer probability of an incident at a specific site without a validated risk model;
- label an individual site as high risk based only on national historical frequency.

### Public mining/geological viewers

Potential later sources include SERNAGEOMIN public mining and geological viewers, tailings cadastre and geological datasets.

Use in MOTIL only as **External Reference**, with explicit source/date/provenance.

## Proposed MOTIL data model

Regulatory knowledge should be represented as structured references, not copied into operational tables.

Suggested entities:

- `regulatory_sources`
  - source_id
  - authority
  - title
  - source_type
  - canonical_url
  - version_or_resolution
  - effective_date
  - retrieved_at
  - source_hash

- `regulatory_requirements`
  - requirement_id
  - source_id
  - domain
  - applicability_scope
  - obligation_type
  - requirement_summary
  - evidence_expected
  - human_validation_required

- `regulatory_taxonomy_mappings`
  - source_id
  - regulatory_code
  - regulatory_label
  - motil_entity_type
  - motil_entity_id
  - mapping_status
  - confidence
  - reviewed_by

- `regulatory_evidence_links`
  - requirement_id
  - canonical_entity_type
  - canonical_entity_id
  - document_or_event_ref
  - evidence_status
  - verified_at

Important: regulatory tables must never become a second source of operational truth.

## Intelligence Core prompt policy

When regulatory context is used, the assistant should separate its answer explicitly:

1. **Operational evidence** — what MOTIL can prove from current authorized data.
2. **Regulatory context** — what the regulation/guide/form expects.
3. **Evidence gap** — what would be required to demonstrate compliance or completion.
4. **Human validation** — the responsible person/process that must confirm or act.

Example pattern:

`Observed in MOTIL → Regulatory expectation → Missing/available evidence → Human validation`

Never:

`Regulation says X → therefore the mine complies/does not comply.`

## Product opportunities enabled by this pack

### 1. Regulatory-aware asset hierarchy

RES 0886 taxonomy mapped to the MOTIL asset master.

Value:
- consistent installation naming;
- better cross-module joins;
- stronger document, maintenance and HSE context.

### 2. Regulatory Evidence Checklist

For a selected installation, faena or process, show expected regulatory evidence and its observed canonical references.

Value:
- turns regulation into operationally useful context;
- does not create a parallel compliance database.

### 3. Incident Case

Connect canonical incident evidence with relevant reporting fields and required human validation.

### 4. Critical Installation Monitoring

Use the E-700 structure as a pattern for evidence timelines, inspection and instrumentation where applicable.

### 5. Closure Lifecycle

Connect installation lifecycle, measures, monitoring, documentation and financial/closure context.

### 6. Regulatory-aware Decision Cases

A Decision Case may cite a regulatory source as context, but priority must remain explainable from current evidence and business/safety rules. Regulatory text alone must not manufacture an operational event.

## Implementation sequence

### Stage 1 — source registry and taxonomy

- ingest source metadata and hashes;
- model RES 0886 installation taxonomy;
- define version/provenance rules;
- no operational writes.

### Stage 2 — requirement extraction

- extract structured requirements from DS 132, forms and closure guides;
- require human review before marking extracted requirements as approved knowledge;
- maintain source anchors and version metadata.

### Stage 3 — canonical evidence linking

- link requirements to existing documents, assets, HSE events and inspections;
- expose `evidence observed / evidence missing / not applicable / requires review`;
- do not infer legal compliance automatically.

### Stage 4 — Intelligence Core integration

Add a physically separated `REGULATORY CONTEXT` section to the prompt, parallel to:

- canonical operational evidence;
- Governed Memory;
- conversation history;
- Decision Cases.

### Stage 5 — UX

Prefer contextual panels inside existing modules rather than a new global top-level module.

Examples:
- asset: `Regulatory context`;
- HSE incident: `Reporting evidence`;
- documents: `Related obligations`;
- executive Decision Case: `Relevant regulatory context`.

## Brochure-safe narrative

Current safe wording once Stage 1 is implemented and verified:

> MOTIL is designed to connect operational evidence with structured mining-regulatory context while keeping regulatory expectations separate from proof of compliance.

Do not claim automated compliance, certification or legal determination unless a future validated feature explicitly supports it.

## Evidence register

Official sources reviewed for v1:

- SERNAGEOMIN Minería — RES N°0886 structure-of-installations instruction.
- SERNAGEOMIN Seguridad Minera — DS 132 / Ley de Cierre / DS 248 context and SIMIN reporting.
- SERNAGEOMIN Formularios Seguridad Minera — contractor reporting, serious/high-potential incident form and E-700 variants.
- SERNAGEOMIN Planes de Cierre — presentation and technical guides.
- SERNAGEOMIN Declaración Minera 2025.
- SERNAGEOMIN public references to PAS 135, 136 and 137.

Last reviewed: 2026-09-13.
