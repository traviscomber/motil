# MOTIL — progreso hacia Gate 9.9 · 2026-09-14

Estado: **Gate 9.9 en cierre progresivo**.

Este documento registra sólo capacidades implementadas/verificadas y los gaps reales restantes. Los nombres de roadmap no sustituyen evidencia operacional.

## Capacidades ya cerradas

### Temporal Intelligence
- lifecycle de Decision Cases: `appeared`, `acknowledged`, `revalidated`, `resolved`, `changed`;
- Temporal Intelligence v2 persistente: `appeared`, `improved`, `worsened`, `unchanged`, `recurred`, `resolved`, `changed`;
- ledger `motil_ai_decision_case_events` append-only;
- endpoints read-only de cambios y tendencias;
- Inicio separa `Cambió desde ayer` de `Qué requiere atención`.

Roadmap cubierto: C3 + E.

### Recurrence / Reliability
- recurrencia sólo desde causa raíz auditada repetida para el mismo activo;
- MTBF/MTTR sólo con evidencia válida de cierres/horómetro;
- ausencia de datos de confiabilidad se presenta como `sin evidencia`, nunca cero ni predicción.

Roadmap cubierto: F v1.

### Decision History
- timeline persistente/derivado: detectado, revisado, revalidado, resuelto;
- separación entre advisory y decisión humana;
- actor/comentario no se inventan cuando el schema no los preserva.

Roadmap cubierto: O v1.

### Source confidence / freshness
- salud determinística de fuentes para Producción, Mantención, Inventario, Compras y Finanzas;
- `fresh / aging / stale / unknown`;
- `high / medium / low / unknown` como etiqueta de evidencia, no probabilidad.

Roadmap cubierto: M v1.

### Equipment Intelligence
- contexto canónico por activo con resolución conservadora por código, serial, patente o nombre inequívoco;
- OT abiertas, preventiva, runtime/horómetro, confiabilidad cuando existe, repuestos observados y Decision Cases;
- integrado al Executive Intelligence Core sin crear otro chat ni módulo;
- `work_order_parts != stock`, `horómetro != MTBF`, recurrencia observada != predicción.

Roadmap cubierto: G conversacional v1.

### Regulatory Intelligence / SERNAGEOMIN
- Regulatory Context separado de Operational Truth;
- RES 0886 con candidatos pendientes de anchors oficiales/human review;
- knowledge packs oficiales 2025 para LIX–SX–EW, relaves, Trolley Assist, descarbonización y cierre;
- Regulatory Evidence Linking tenant-scoped;
- mappings regulatorios con revisión humana persistente;
- compliance verdict automático prohibido.

### Intelligence Core observability — Stage 1
- ledger backend-only `motil_ai_core_runs`;
- captura automática de organización, usuario, conversación, especialista observado, fuentes, tools, latencia, modelo y tamaño de respuesta;
- endpoint read-only `/api/intelligence/evaluation/recent`;
- escenarios permanentes de evaluación del Core;
- telemetría estructural no se confunde con precisión semántica.

Roadmap cubierto: T v1.

### Runtime hardening
- corregido `/api/alertas`: eliminada relación PostgREST obsoleta `maintenance_work_orders -> maintenance_assets`;
- resolución de activos de OT ahora usa `canonical_asset_id` + `maintenance_canonical_assets_v1` tenant-scoped;
- no se inventa alerta cuando no existen OT abiertas/en progreso.

## Gaps reales restantes hacia 9.9+

1. **Core Evaluation Stage 2** — grounded evaluation de respuesta contra la evidencia exacta usada en cada run; no sólo telemetría estructural.
2. **Error observability** — persistir fallos del Core con ruta/contexto permitido sin duplicar secretos ni conversación.
3. **Permission regression suite** — roles críticos contra rutas, endpoints, datos, mutaciones, Core y Decision Cases.
4. **Human Decision History v2** — actor/comentario/acción más ricos cuando el schema los preserve.
5. **Specialist observability** — hacer explícito qué especialista invisible fue realmente invocado, sin convertirlo en UI de agentes.
6. **QA visual desktop + móvil** — nuevas superficies de Inicio, Assistant, Equipment Intelligence y flows operativos.
7. **RES 0886 exact anchors** — completar extracción oficial estable antes de aprobar taxonomy/mappings.
8. **Tenant-safe HSE inspections** — `hse_inspections` sigue excluida mientras no tenga aislamiento tenant demostrable.

## Orden de ataque actual

1. Core Evaluation Stage 2.
2. Permission regression suite.
3. Error observability + runtime hardening.
4. QA desktop/móvil.
5. RES 0886 anchors + HSE inspection tenancy.

Gate 9.9 no se declara completo hasta verificar deployment productivo, runtime limpio y QA de roles/superficies críticas.
