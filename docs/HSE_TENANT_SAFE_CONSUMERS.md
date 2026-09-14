# HSE tenant-safe consumers

## Estado

Este corte elimina dependencia HSE legacy directa en tres read models versionados sin retirar todavía sus equivalentes históricos.

## Nuevos read models

- `executive_operational_scorecard_v2`: mantiene producción, mina y mantención; HSE se agrega exclusivamente desde `canonical_hse_incidents_v1`, `canonical_hse_inspections_v1` y `canonical_hse_risks_v1`, unido por `organization_id`.
- `operational_task_inbox_by_user_v2`: consume `operational_tasks_by_cargo_v4` y preserva el cruce `organization_id + cargo_id`.
- `operational_tasks_by_cargo_summary_v4`: agrega únicamente `operational_tasks_by_cargo_v4`.

## Frontera

Los nuevos read models son backend-only (`service_role`). No se heredan los grants directos de los views legacy. Antes de retirar o revocar `operational_task_inbox_by_user_v1`, `operational_tasks_by_cargo_v3`, `hse_role_kpi_snapshot_v1` o `executive_operational_scorecard_v1`, se debe identificar y migrar cada consumidor real.

No hay auto-mapping de incidentes o riesgos legacy. Una fila HSE sin provenance tenant explícita continúa excluida de la capa canónica. Tampoco se calcula cumplimiento legal o regulatorio.

## Evidencia para brochure

Una vez liberado y verificado: MOTIL mantiene KPI ejecutivos y bandejas operacionales HSE separados por organización y alimentados por evidencia HSE canónica con provenance tenant explícita; los registros legacy no mapeados quedan fuera en vez de atribuirse por inferencia.
