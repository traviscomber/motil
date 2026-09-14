# RES 0886 — extraction Stage 3

Estado: `official_index_verified / page_anchor_pending / human_review_pending`.

## Fuente

Fuente oficial: SERNAGEOMIN, Resolución Exenta N°0886 (2025), “Instructivo para estandarización de listado o estructura de quiebre de instalaciones minera”.

URL canónica registrada por MOTIL: `https://www.sernageomin.cl/wp-content/uploads/2025/05/RES-0886-APRUEBA-MODIFICACIO%CC%81N-Estructura-de-Quiebre-2025.pdf`.

La extracción de este corte proviene del texto indexado del documento oficial en `sernageomin.cl`. El servidor del PDF continúa respondiendo intermitentemente 502 al fetch directo, por lo que **no existe todavía un page anchor estable verificable** para promover estas filas a `approved_reference`.

## Regla de promoción

Ninguna fila de este documento puede publicarse como taxonomía aprobada mientras falte cualquiera de estos elementos:

1. spelling exacto contrastado con el PDF oficial;
2. page/table anchor estable del PDF oficial;
3. parent/hierarchy confirmada;
4. geometry confirmada;
5. regulatory code exacto cuando la fuente lo exponga;
6. revisión humana explícita.

No se inventan códigos. Un heading o snippet indexado sólo permite `pending_human_review`.

## Nuevos candidatos observados

### CLASIFICACIÓN PLANTAS DE CONCENTRACIÓN

Instalación principal observada:

- `PLANTA CONCENTRACION` — geometría `POLÍGONO`.

Instalaciones auxiliares observadas, geometría `PUNTO`:

- `CHANCADO PLANTA DE CONCENTRACION`
- `PLANTA MOLIENDA PLANTA CONCENTRACION`
- `PLANTA FLOTACION PLANTA CONCENTRACION`
- `ESPESADORES PLANTA CONCENTRACION`
- `PLANTA DE FILTROS PLANTA CONCENTRACION`
- `TALLER PLANTA CONCENTRACION`
- `PLANTA MOLIBDENO`
- `PLANTA DE CAL`
- `ALMACENAMIENTO SUMINISTROS PLANTA CONCENTRACION`
- `OFICINA Y ADMINISTRACION PLANTA CONCENTRACION`
- `BODEGA PLANTA CONCENTRACION`
- `CASINO PLANTA CONCENTRACION`
- `POLICLINICO PLANTA CONCENTRACION`
- `SALA DE CONTROL PLANTA CONCENTRACION`
- `LABORATORIO PLANTA CONCENTRACION`

### CLASIFICACIÓN PLANTA RECUPERACIÓN MAGNÉTICA

Instalación principal observada:

- `PLANTA RECUPERACION MAGNETICA` — geometría `POLÍGONO`.

Instalaciones auxiliares visibles en el fragmento oficial indexado:

- `CHANCADO PLANTA RECUPERACIÓN MAGNETICA` — `PUNTO`
- `PLANTA MOLIENDA PLANTA RECUPERACIÓN MAGNETICA` — `PUNTO`
- `PLANTA FLOTACION PLANTA RECUPERACION MAGNETICA` — `PUNTO`
- `CONCENTRACION MAGNETICA SECO` — `PUNTO`

### CLASIFICACIÓN PUERTO EMBARQUE MINERO

Instalación principal observada:

- `PUERTO DE EMBARQUE MINERO` — `PUNTO`.

Auxiliares observados, `PUNTO`:

- `OFICINA Y ADMINISTRACION PUERTO EMBARQUE MINERO`
- `BODEGA PUERTO EMBARQUE MINERO`
- `CASINO PUERTO EMBARQUE MINERO`
- `POLICLINICO PUERTO EMBARQUE MINERO`

### CLASIFICACIÓN DE INSTALACIONES ASOCIADAS A LA FAENA

Instalaciones principales visibles en el fragmento oficial indexado, todas `PUNTO` y mostradas sin instalación auxiliar:

- `RELLENO SANITARIO`
- `PLANTA TRATAMIENTO AGUA POTABLE`
- `PLANTA TRATAMIENTO AGUA SERVIDAS`
- `PLANTA DE REFINACION ELECTROLITICA`

Los snippets indexados pueden estar truncados; por tanto estas listas **no se consideran exhaustivas** y permanecen fuera de la taxonomía aprobada.

## Qué NO cambia

- `RES_0886_APPROVED_TAXONOMY` permanece vacío.
- Ningún candidate adquiere autoridad operacional.
- Ningún mapping regulatorio puede sobrescribir el ID de una instalación MOTIL.
- Regulation Intelligence continúa `reference_only`.
- No se calcula compliance.

## Próximo paso

Reintentar acceso/render del PDF oficial, capturar page/table anchors estables y sólo entonces proponer promociones individuales mediante human review auditable.