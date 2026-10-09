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


## SERNAGEOMIN: cruce técnico del cargo de Ingeniería (2026-10-09)

- Fuentes oficiales: https://www.bcn.cl/leychile/navegar?idNorma=221064 (DS 132, arts. 22, 33, 34, 60, 61) y https://www.sernageomin.cl/proyectos-mineros/.
- Se reutiliza lib/intelligence/sernageomin-obligations.ts, la misma fuente del módulo Legal. No hay segunda bandeja regulatoria ni un criterio de cumplimiento automatizado.
- Art. 33: diferenciar profesional responsable de proyectos, título reconocido y alcance de obra; no asignarlo por denominación de cargo.
- Art. 34: jefatura de mina sujeta a requisitos profesionales propios, no equivalente automática a Jefe de Ingeniería.
- Art. 22: método de explotación y modificación mayor requieren revisión de resoluciones. No inferir autorización desde el plan mensual.
- Arts. 60-61: planos mineros y registros de avance requieren actualización y custodia; revisar planos con UTM, ventilación donde corresponda, accesos y emergencia.
- El panel de Topografía exhibe fichas de referencias oficiales y evidencia a solicitar, solo para roles con permiso en Topografía. Legal conserva aplicabilidad y cierre de obligaciones.
- El asistente usa estas referencias en respuestas, sin afirmar cumplimiento, firma, nombramientos ni permisos existentes.
- Umbrales de proyectos de SERNAGEOMIN: dependen de capacidad autorizada, no se deducen del plan MINE-2026-08.
- Pendientes de pedir a la faena: resolución del método de explotación, plano maestro/versiones, profesional firmante, jefe de mina designado, estudios/registro topográfico y capacidad autorizada.
- QA antes de main: confirmar build SHA exacto, pruebas, navegación con cargo JEFE ING. PLA MINA, UI móvil y desktop, ninguna expansión de la matriz RBAC.
