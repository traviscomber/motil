# MOTIL — RES N°0886 extraction log

Status: **In progress / candidates only**

Purpose: preserve the exact SERNAGEOMIN installation labels already observed from the official RES N°0886 document while preventing partial extraction from being promoted into approved regulatory taxonomy.

Canonical source:
- SERNAGEOMIN Minería: https://www.sernageomin.cl/mineria/
- Official RES N°0886 PDF: https://www.sernageomin.cl/wp-content/uploads/2025/05/RES-0886-APRUEBA-MODIFICACIO%CC%81N-Estructura-de-Quiebre-2025.pdf

## Extraction rule

A value may move through:

`official text observed → extraction candidate → stable source/page anchor → human review → approved reference taxonomy → optional MOTIL mapping`

It must never jump directly from a search excerpt or inferred mining vocabulary into approved taxonomy.

The current official PDF is discoverable and indexed by SERNAGEOMIN, but the extraction session did not provide stable page anchors for the observed excerpts. Therefore every value below remains `pending_human_review` with `sourceAnchorStatus=section_heading_only`.

No regulatory code is invented when the source excerpt does not expose one.

## Verified candidates observed in official RES N°0886 text

### CLASIFICACIÓN MINA SUBTERRANEA

Principal installation:
- `MINA SUBTERRANEA` — geometry `POLÍGONO`

Observed auxiliary installations — geometry `PUNTO`:
- `POLVORIN MINA SUBTERRANEA`
- `CHANCADO MINA SUBTERRANEA`
- `TALLER MINA SUBTERRANEA`
- `LUBRICANTERA MINA SUBTERRANEA`
- `SURTIDOR DE COMBUSTIBLE MINA SUBTERRANEA`
- `OFICINA Y ADMINISTRACIÓN MINA SUBTERRANEA`

### CLASIFICACIÓN BOTADEROS

- `BOTADERO DE ESCORIA` — geometry `POLÍGONO` — `SIN INSTALACIÓN AUXILIAR`
- `BOTADERO DE ESTERIL` — geometry `POLÍGONO` — `SIN INSTALACIÓN AUXILIAR`

### CLASIFICACIÓN RIPIOS

- `RIPIOS DE LIXIVIACIÓN` — geometry `POLÍGONO` — `SIN INSTALACIÓN AUXILIAR`

### CLASIFICACIÓN ACOPIOS

- `ACOPIO DE MINERAL` — geometry `PUNTO` — `SIN INSTALACIÓN AUXILIAR`
- `ACOPIO DE CONCENTRADO` — geometry `PUNTO` — `SIN INSTALACIÓN AUXILIAR`
- `ACOPIO DE SALES` — geometry `PUNTO` — `SIN INSTALACIÓN AUXILIAR`

### CLASIFICACIÓN DE OBRAS LINEALES

Observed principal installations — geometry `LÍNEA`, without auxiliary installation:
- `CAMINOS`
- `ACUEDUCTO`
- `CONCENTRADUCTO/MINERODUCTO`
- `GASODUCTO`
- `LINEA FERREA`
- `OLEODUCTO`
- `RELAVEDUCTO`
- `TENDIDO ELECTRICO`
- `SALMUERODUCTO`

## Additional official sections already observed but not yet staged

The indexed official document also exposed text for:
- `CLASIFICACIÓN PUERTO EMBARQUE MINERO`;
- `CLASIFICACIÓN DE INSTALACIONES ASOCIADAS A LA FAENA`;
- `CLASIFICACIÓN DE PATIOS`;
- Prospección-related auxiliary installations.

These are intentionally not promoted to code until the complete rows and parent relationships are captured with sufficient source anchoring.

## Code evidence

- Candidate contract: `lib/intelligence/regulatory-installation-context.ts`
- Read-only endpoint: `app/api/intelligence/regulatory/installations/route.ts`
- Guardrail tests: `tests/regulatory-installation-context.test.mjs`

## Approval gates

Before any candidate becomes `approved_reference`:

1. confirm spelling exactly against the official PDF;
2. capture stable page/table anchor;
3. confirm hierarchy level and parent;
4. confirm geometry;
5. determine whether an explicit regulatory code exists — otherwise keep code null until the model is redesigned or the source provides one;
6. human reviewer records approval;
7. only then expose the node as an approved reference;
8. mapping to a MOTIL asset remains separate and must never overwrite the company's canonical identifier.

## Brochure-safe status

Safe now:

> MOTIL is building a governed SERNAGEOMIN installation-taxonomy layer with official RES N°0886 labels staged under source and human-review controls.

Not safe yet:
- “MOTIL has the complete RES N°0886 taxonomy.”
- “MOTIL automatically classifies every site according to SERNAGEOMIN.”
- “MOTIL proves regulatory compliance from the taxonomy.”
