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

### Human Decision History v2
- timeline persistente: detectado, revisado, revalidado, resuelto/archivado;
- action log backend-only `motil_ai_decision_human_actions`;
- `acknowledge` y `archive` preservan actor, comentario, recomendación y snapshots de evidencia;
- transición + action log se ejecutan atómicamente mediante RPC;
- registros legacy sin action log se etiquetan como incompletos en vez de inventar actor/comentario;
- las acciones humanas cambian sólo el lifecycle advisory del Decision Case: no ejecutan OT, stock, compras ni producción.

Roadmap cubierto: O v2.

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

### Intelligence Core observability + evaluation
- ledger backend-only `motil_ai_core_runs`;
- captura automática de organización, usuario, conversación, especialista primario observado, fuentes, tools, latencia, modelo y tamaño de respuesta;
- endpoint read-only `/api/intelligence/evaluation/recent`;
- escenarios permanentes de evaluación del Core;
- grounded evaluation Stage 2 compara cada respuesta normal del Executive Core contra la evidencia exacta usada en ese run;
- persiste `evaluation_state`, `evaluation_detail`, `evaluator_version` y `evaluated_at`;
- guards determinísticos para números sin soporte, MTBF/MTTR sin coverage, stock sin Inventario, veredictos automáticos de compliance y quiebres de autorización;
- PASS no equivale a corrección semántica completa.

Roadmap cubierto: T v2.

### Permission regression
- invariantes `ED = lectura/escritura`, `LEC = sólo lectura`, `SR = sin acceso`;
- probes para Producción, Mantención, Equipment Intelligence, Inventario, Compras y Finanzas;
- auditoría contra permisos efectivos del usuario autenticado, sin congelar matrices por cargo ni inspeccionar otros usuarios.

### Runtime error observability
- ledger backend-only `motil_ai_core_errors`;
- errores del POST principal del Executive Core se clasifican sin copiar prompt, respuesta, raw error, secretos ni payload operacional;
- endpoint read-only de errores recientes;
- observabilidad fail-open: un fallo al registrar telemetría no reemplaza el error original.

### Runtime hardening
- corregido `/api/alertas`: eliminada relación PostgREST obsoleta `maintenance_work_orders -> maintenance_assets`;
- resolución de activos de OT usa `canonical_asset_id` + `maintenance_canonical_assets_v1` tenant-scoped;
- no se inventa alerta cuando no existen OT abiertas/en progreso.

## En gate actual

### Specialist observability v2
- attribution derivada exclusivamente desde `source_refs`/tool traces persistidos;
- soporte multi-dominio para supply chain;
- tools desconocidos quedan visibles sin ser asignados por inferencia;
- no existe selector de agentes ni clasificación por prompt;
- `/api/intelligence/evaluation/recent` expone specialist trace por run y cobertura agregada.

El bloque permanece pendiente de preview/release gate hasta que su SHA exacto esté READY.

## Gaps reales restantes hacia 9.9+

1. **QA visual desktop + móvil** — Inicio, Assistant, Equipment Intelligence y flows operativos críticos.
2. **RES 0886 exact anchors** — completar extracción oficial estable antes de aprobar taxonomy/mappings.
3. **Tenant-safe HSE inspections** — `hse_inspections` sigue excluida mientras no tenga aislamiento tenant demostrable.
4. **Runtime/usefulness evaluation** — acumular runs reales y feedback suficiente para medir calidad sostenida; no fabricar muestras.

## Orden de ataque actual

1. cerrar Specialist Observability v2.
2. QA desktop/móvil por roles críticos.
3. RES 0886 anchors.
4. HSE inspection tenancy.
5. runtime/usefulness evaluation sobre tráfico real.

Gate 9.9 no se declara completo hasta verificar deployment productivo, runtime limpio y QA de roles/superficies críticas.
