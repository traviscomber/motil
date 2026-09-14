# MOTIL — progreso hacia Gate 9.9 · 2026-09-14

Estado: **In progress — PR #203, pendiente release gate**.

Este documento registra el avance ejecutable de los cinco bloques atacados en paralelo sin convertir nombres de roadmap en verdad operacional.

## 1. Temporal Intelligence + Inicio

Implementado en PR #203:
- lifecycle determinístico de Decision Cases: `appeared`, `acknowledged`, `revalidated`, `resolved`, `changed`;
- endpoint read-only `/api/intelligence/decision-cases/changes`;
- ventana hasta 30 días, con aislamiento por organización, usuario y permisos;
- Inicio muestra `Cambió desde ayer` separado de `Qué requiere atención`;
- ambos límites son máximos 3 elementos;
- cambio temporal no eleva prioridad ni implica impacto o causalidad.

Roadmap cubierto: Fase E v1 + C3.

## 2. Recurrence / Reliability por activo

Implementado en PR #203 sobre read models ya auditados:
- `maintenance_reliability_by_root_cause_v1`;
- `maintenance_runtime_reliability_by_asset_v1`;
- recurrencia sólo cuando la fuente canónica ya marca la misma causa raíz auditada como recurrente para el mismo activo;
- MTBF/MTTR sólo se exponen según los gates de evidencia existentes;
- salida `advisory_only`; no se calcula probabilidad futura ni causa raíz definitiva.

Roadmap cubierto: Fase F v1, reutilizando la base de F/G/H ya existente.

## 3. Decision History

Implementado en PR #203:
- timeline derivado exclusivamente de campos persistidos del Decision Case;
- eventos: detectado, revisado, revalidado, resuelto y actualización;
- separación de autoridad advisory vs acción humana;
- actor no disponible no se inventa;
- endpoint read-only `/api/intelligence/decision-cases/timeline?caseId=...`.

Roadmap cubierto: Fase O v1.

## 4. Source confidence / freshness

Implementado en PR #203:
- salud de fuente determinística para Producción, Mantención, Inventario, Compras y Finanzas;
- estados de frescura: `fresh`, `aging`, `stale`, `unknown`;
- confianza: `high`, `medium`, `low`, `unknown`;
- `unknown` cuando falta fuente o timestamp; nunca se convierte a cero ni alta confianza;
- HOLD explícito o fuente stale degrada confianza;
- confidence es etiqueta de presentación basada en evidencia, **no probabilidad de exactitud**;
- endpoint permission-aware `/api/intelligence/source-health`.

Roadmap cubierto: Fase M v1.

## 5. SERNAGEOMIN technical knowledge packs

Agregados al registry regulatorio, manteniendo `Regulatory Context != Operational Truth`:
- Guía 2025 de plantas hidrometalúrgicas LIX–SX–EW;
- Guía 2025 de proyectos de depósitos de relaves;
- Guía 2025 Trolley Assist;
- Guía 2025 de tecnologías para descarbonización minera;
- Guías técnicas de Planes de Cierre: riesgo, estabilidad física/química, vida útil y garantías.

Todos son `reference_only`: describen criterios, antecedentes o evidencia esperada, pero no prueban aprobación, condición operacional ni compliance de una faena.

## Qué sigue después del release gate

Los gaps principales hacia 9.9 quedan en:
- temporal reasoning v2: `mejoró / empeoró / sigue igual / volvió a ocurrir` comparando estados explícitos;
- Equipment Intelligence conversacional por activo;
- historia humana más rica cuando el schema preserve comentario/actor por cada transición;
- evaluación automática permanente del Intelligence Core;
- especialistas invisibles más explícitos en observabilidad;
- QA visual desktop + móvil de las nuevas superficies.
