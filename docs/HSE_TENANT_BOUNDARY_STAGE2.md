# MOTIL — HSE Tenant Boundary Stage 2

Estado: implementación en branch; migration aún no aplicada a producción hasta pasar release gate.

## Hallazgo verificado

Las fuentes legacy `incidents` y `risk_matrix` no tienen `organization_id` nativo.

Estado observado en Supabase `motil` antes de este corte:

- `incidents`: 4 filas;
- `risk_matrix`: 3 filas;
- ambas tablas tienen RLS, pero su esquema legacy no contiene una tenant key canónica;
- `incidents.equipment_id -> equipment.id` no resuelve tenancy porque `equipment` tampoco tiene `organization_id`;
- `reported_by` y `risk_owner` de las filas actuales resuelven a una única organización mediante `user_roles`, pero ese dato se conserva sólo como evidencia candidata: MOTIL no lo convierte silenciosamente en propiedad del registro.

## Solución

Se agrega una frontera explícita de data governance:

`legacy HSE row -> explicit tenant mapping -> canonical HSE view -> tenant-scoped consumer`

Nuevos mappings backend-only:

- `motil_hse_incident_tenant_links`;
- `motil_hse_risk_tenant_links`.

Nuevos read models:

- `canonical_hse_incidents_v1`;
- `canonical_hse_risks_v1`.

Cada mapping exige organización, actor, razón, evidencia y timestamp. No existe auto-backfill, matching por texto, cargo, equipo o usuario.

## Regla operacional

Una fila legacy no mapeada no es evidencia tenant-scoped. Permanece fuera del read model canónico hasta que una decisión humana/data-governance documente su organización.

Los mappings no modifican la fila legacy ni crean un veredicto HSE. Sólo establecen provenance de tenancy.

## Siguiente corte

1. Verificar preview: migrations check, tests, lint, typecheck y build.
2. Aplicar migración a Supabase `motil` sólo después del preview verde.
3. Verificar que los mappings y canonical views parten en cero filas; no inferir las 4 incidencias ni los 3 riesgos.
4. Crear versiones tenant-safe de los agregados legacy que hoy consumen `incidents`, `risk_matrix` y `hse_inspections` directamente.
5. Rewire de consumidores de aplicación a esas versiones canónicas antes de endurecer políticas RLS legacy.

## Brochure-safe después de release

MOTIL puede bloquear evidencia HSE legacy cuya pertenencia a una organización no esté demostrada y sólo incorporarla al contexto canónico mediante provenance tenant explícita y auditable.
