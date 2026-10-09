# MOTIL / Ingeniería — candidato de integración

Estado: LAB / PR draft, sin cambios de producción.

## Cambios incluidos
- PR #377: vigencia del plan de acuerdo con fecha de operación en Chile.
- PR #380: fuente topográfica documental por sondaje, protección de totales canónicos, control de integridad plan vs. fuentes de perforación.
- PR #378: asistente de Ingeniería con cargo y permiso comprobados en el servidor, respuestas condicionadas a evidencia, sin escrituras.
- PR #379: entrada Topografía según permiso efectivo y accesos rápidos del cargo autorizados.

## Hallazgos canónicos verificados 2026-10-09
- El único plan mensual es MINE-2026-08, de 2026-08-01 a 2026-08-31; su etiqueta activa no acredita vigencia.
- Cabecera: 13.000 t mineral a planta, 840 t estéril, 13.840 t movimiento, 254 m avance, 10.287 m perforación.
- Detalle: 12 líneas de distinta granularidad, suma global engañosa de 26.840 t; radial 2.396 m, subconjunto, no total mensual.
- Agosto: 79 registros fuente de perforación, 78 review y 1 matched; ningún registro con mina y sector canónicos simultáneamente resueltos.
- 92 brechas de recuperación documental topográfica y 92 sondajes únicos.

## Controles de publicación
1. Ejecutar suite integral + lint + TypeScript + Next build en el SHA exacto de esta rama.
2. Comprobar UI del jefe de Ingeniería en Inicio y Topografía, con credenciales autorizadas; comprobar que otras áreas no se exponen.
3. Verificar GET de Topografía y de brechas con usuario del cargo; probar 401/403 sin sesión/permiso.
4. Verificar los totales de cabecera contra fuente y que no se muestre 26.840 t ni 2.396 m como totales mensuales.
5. Verificar filtros, paginación, copia de solicitud, estados vacíos/error, desktop y Android Chrome.
6. Confirmar que no se mutó la base y que el release sigue con una sola ruta de Topografía.

## Limitación
Hasta recibir plan del mes vigente y levantamientos originales (fecha, mina, sector, coordenadas, azimut, inclinación), el sistema no certifica cumplimiento ni avance real por sector. No inventar esos datos.
