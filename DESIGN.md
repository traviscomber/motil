---
version: alpha
name: MOTIL Mining Operating System
description: Canon visual ejecutable para la interfaz operacional de MOTIL. Los tokens reflejan el sistema real de app/globals.css y app/motil-system.css; la landing mantiene un scope visual propio en app/landing.css.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.52 0.11 33)"
  on-primary: "oklch(1 0 0)"
  secondary: "oklch(0.48 0.14 142)"
  on-secondary: "oklch(1 0 0)"
  destructive: "oklch(0.45 0.18 25)"
  on-destructive: "oklch(1 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.45 0 0)"
  border: "oklch(0.9 0 0)"
  dark-background: "oklch(0.145 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.18 0 0)"
  dark-muted: "oklch(0.24 0 0)"
  dark-border: "oklch(0.28 0 0)"
typography:
  page-title:
    fontFamily: Montserrat
    fontSize: 2.05rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.032em
  section-title:
    fontFamily: Montserrat
    fontSize: 1.6rem
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: -0.024em
  body:
    fontFamily: Geist Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  table-label:
    fontFamily: Geist Sans
    fontSize: 0.7rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.035em
rounded:
  sm: 0.05rem
  md: 0.175rem
  lg: 0.3rem
  xl: 0.55rem
spacing:
  xs: 0.625rem
  sm: 0.75rem
  md: 1rem
  lg: 1.25rem
  section: 1.75rem
  gutter: 2rem
components:
  app-surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  primary-action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 0.75rem
  secondary-action:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
    padding: 0.75rem
  destructive-action:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    rounded: "{rounded.md}"
    padding: 0.75rem
---

# MOTIL Design System

## Overview

MOTIL es software operacional industrial. La interfaz debe ser sobria, precisa y orientada a decisiones: primero estado, excepción, evidencia y acción. Este archivo es la fuente canónica para agentes y humanos antes de cualquier trabajo UI.

La aplicación interna usa los tokens semánticos definidos en `app/globals.css` y los primitives de `app/motil-system.css`. La landing pública tiene un lenguaje editorial/mineral propio, acotado a `.motil-landing` en `app/landing.css`; no trasladar esos tokens al dashboard por defecto.

## Colors

Usar tokens semánticos, nunca colores arbitrarios. `primary` es el acento óxido MOTIL; `secondary` representa estados positivos/operacionales; `destructive` se reserva para riesgo o acciones irreversibles. La app soporta modo claro y oscuro y no debe comunicar estado únicamente por color.

## Typography

Montserrat gobierna títulos de la aplicación; Geist Sans gobierna cuerpo y controles. Mantener una escala limitada, legible y de densidad operacional. Manrope pertenece a la landing pública y no reemplaza la tipografía interna salvo decisión explícita del sistema de diseño.

## Layout

Contenido máximo de 1600px. Gutter responsivo de 1rem a 2rem y separación de sección de 1.25rem a 1.75rem. Una pantalla, una intención principal; una acción primaria visible y como máximo una secundaria. Reducir complejidad en móvil en vez de comprimir el desktop.

## Elevation & Depth

La jerarquía se construye con fondo, borde, espacio y tipografía. Evitar sombras pesadas, glassmorphism y card-in-card. Las superficies operacionales deben sentirse planas y arquitectónicas.

## Shapes

Radios contenidos y consistentes; evitar pills salvo controles cuyo significado los justifique. Botones y superficies deben conservar la geometría sobria del sistema y áreas táctiles mínimas de 40px.

## Components

Reutilizar primitives y componentes existentes antes de crear variantes. Tablas son superficies de decisión, no decoración. Estados loading, empty, partial-data, permission, recoverable-error y blocking-error son componentes de primera clase. Acciones extra van a menús contextuales.

## Do's and Don'ts

**Do:** derivar desde fuentes canónicas, usar tokens semánticos, mostrar provenance/estado cuando importa, mantener foco/contraste/reduced-motion y validar visualmente desktop + móvil + claro + oscuro.

**Don't:** inventar métricas o datos, introducir colores/spacing ad hoc, duplicar navegación o KPIs, usar IDs técnicos visibles, crear nuevas cards por defecto, copiar el lenguaje visual de la landing dentro del producto operacional.


Este documento es la fuente canónica para la interfaz del ERP MOTIL. Aplica al dashboard, módulos principales, rutas secundarias, formularios, tablas, modales y estados del sistema.

## 1. Principios

- Claridad operacional antes que decoración.
- Una pantalla debe comunicar primero qué es, después qué requiere atención y finalmente qué puede hacer el usuario.
- Mostrar datos reales. No usar métricas, estados ni ejemplos mock en producción.
- Evitar duplicar información, títulos, accesos o acciones en una misma pantalla.
- Mantener una experiencia equivalente en modo claro y oscuro.

## 2. Los 10 principios MOTIL de simplificación y deduplicación

Este método se inspira en Kaizen, 5S y diseño Lean. Debe aplicarse antes de crear una nueva ruta, tabla, botón, tarjeta, filtro, métrica o fuente de datos.

### 1. Una entidad, una fuente maestra

Cada concepto operacional debe tener una única fuente canónica. Las demás tablas o archivos pueden actuar como evidencia, staging, historial o vista derivada, pero nunca como maestros paralelos.

Ejemplos:

- Equipos: un maestro de activos.
- Proveedores: un maestro de proveedores.
- Productos: un maestro de productos.
- Centros de costo: un maestro financiero-operacional.
- Documentos: un repositorio de evidencia, no un sustituto de los datos estructurados.

### 2. Una función, una entrada principal

Cada función debe tener un único acceso principal en la navegación. Las vistas especializadas deben aparecer dentro del contexto de la entidad, no como módulos paralelos.

Ejemplo: disponibilidad, costos, fichas, expedientes y componentes deben vivir dentro del dominio Equipos.

### 3. Mostrar una vez, derivar siempre

Una cifra, estado o atributo no debe copiarse manualmente en varias tablas o pantallas. Debe calcularse o consultarse desde la fuente canónica.

No duplicar:

- KPIs;
- estados;
- nombres;
- códigos;
- totales;
- clasificaciones;
- fechas de vigencia.

### 4. Separar entidad, proceso y evidencia

No mezclar conceptos distintos en la misma estructura.

- Entidad: equipo, proveedor, persona, producto.
- Proceso: compra, mantenimiento, inspección, capacitación.
- Evidencia: documento, fotografía, certificado, XLS, PDF.

Un centro de costo no es un equipo. Un documento no es un procedimiento estructurado. Una orden de compra no es un proveedor.

### 5. Reducir antes de agregar

Antes de crear algo nuevo se debe revisar si ya existe una ruta, tabla, componente, acción o dato equivalente. Primero se fusiona, renombra o reutiliza; solo después se agrega.

Toda nueva función debe responder:

- ¿Ya existe?
- ¿Puede vivir dentro de una sección actual?
- ¿Puede ser una vista derivada?
- ¿Puede reemplazar algo antiguo?

### 6. Una pantalla, una intención principal

Cada pantalla debe responder una pregunta principal y ofrecer una acción primaria.

Ejemplos:

- Equipos: encontrar y abrir un activo.
- Compras: revisar y gestionar órdenes.
- Proveedores: administrar el maestro de proveedores.
- Sostenibilidad: identificar riesgos, vencimientos y brechas.

Si una pantalla intenta resolver más de una intención principal, debe dividirse en pestañas contextuales o vistas derivadas.

### 7. Menos controles, mayor contexto

Mostrar solo los controles necesarios para la tarea actual.

- Máximo una acción primaria.
- Máximo una acción secundaria visible.
- Acciones adicionales en `Más acciones`.
- Máximo tres filtros visibles.
- Filtros adicionales en `Más filtros`.
- Acciones por fila dentro de menú contextual.

### 8. Nombres únicos y consistentes

Un concepto debe tener un único nombre en todo el sistema.

No usar simultáneamente:

- Equipos / Maquinaria / Activos para la misma entidad.
- Ficha / Ficha técnica cuando no existe una diferencia funcional real.
- Documentos / Gestión documental / Flujo documental sin una definición explícita.
- Compras / Órdenes / OCs para pantallas equivalentes.

Cuando existan diferencias reales, deben documentarse en la interfaz y en el modelo de datos.

### 9. Lo derivado no compite con lo canónico

Las filas derivadas, inferidas o reconstruidas deben identificarse claramente y no mezclarse visualmente como si fueran registros maestros completos.

Estados recomendados:

- Canónico.
- Derivado.
- Pendiente de promoción.
- Histórico.
- Inactivo.
- Evidencia solamente.

Los registros derivados no deben ofrecer funciones que requieran un ID canónico.

### 10. Mejorar en ciclos pequeños y verificables

Cada bloque de limpieza debe terminar con:

1. fuente canónica definida;
2. duplicados identificados;
3. navegación simplificada;
4. acciones reducidas;
5. datos derivados documentados;
6. build exitoso;
7. deployment `READY`;
8. cero errores de runtime;
9. validación en modo claro y oscuro;
10. registro de lo eliminado, fusionado o movido.

## 3. Clasificación obligatoria de cada elemento

Durante una auditoría, toda ruta, tabla, componente, botón, métrica o fuente debe clasificarse en una de estas categorías:

- **Conservar:** es canónica, necesaria y clara.
- **Fusionar:** duplica parcialmente otra función o entidad.
- **Mover:** es válida, pero está en el nivel o módulo incorrecto.
- **Derivar:** debe calcularse desde una fuente canónica.
- **Renombrar:** representa un concepto válido con una etiqueta confusa.
- **Archivar:** sirve como historial o evidencia, pero no debe competir en producción.
- **Eliminar:** no tiene uso, está duplicado o induce a error.

No se elimina información operacional sin conservar trazabilidad o confirmar que existe una copia canónica equivalente.

## 4. Jerarquía de página

Cada página debe usar este orden:

1. Breadcrumb global en el header.
2. Título de página o módulo.
3. Descripción breve, de una o dos líneas.
4. Estado de sincronización o contexto, cuando sea relevante.
5. Acción primaria.
6. Contenido principal.

No repetir el mismo título en el header global y dentro de tarjetas.

### Encabezados

- Título principal: `text-2xl` o `text-3xl`, peso `font-semibold`.
- Título de sección: `text-lg`, peso `font-semibold`.
- Descripción: `text-sm text-muted-foreground`.
- Ancho máximo recomendado del contenido: `1600px`.
- Espaciado vertical estándar entre bloques: `space-y-6`.

## 5. Acciones y botones

### Límite de acciones

- Una acción primaria visible por pantalla.
- Como máximo una acción secundaria visible junto a la primaria.
- La tercera acción y posteriores deben ir en un menú `Más acciones`.
- No repetir una acción en el header y dentro del primer bloque de contenido.

### Uso de variantes

- `default`: crear, guardar, confirmar o iniciar la acción principal.
- `outline`: acción secundaria no destructiva.
- `ghost`: navegación contextual, iconos o acciones de baja prioridad.
- `destructive`: eliminar, anular o acciones irreversibles.

Los botones de solo icono siempre deben tener `aria-label` y tooltip cuando el significado no sea evidente.

## 6. Navegación

- El sidebar contiene accesos de módulo, no todas las operaciones posibles.
- Las rutas secundarias deben agruparse dentro del módulo y estar colapsadas por defecto cuando el grupo sea extenso.
- El elemento activo debe ser inequívoco.
- Los breadcrumbs no deben mostrar UUID, IDs internos ni cadenas técnicas.
- Mostrar un máximo de cuatro niveles. Los niveles intermedios se resumen con `…`.
- Toda segunda sección debe ofrecer un camino claro de regreso mediante breadcrumb; no agregar botones redundantes de “volver” cuando ya existe ese camino.

## 7. Tarjetas y métricas

- Usar tarjetas para resumir entidades o métricas, no como contenedor universal.
- Una fila de KPI debe tener entre dos y cuatro tarjetas.
- No repetir una métrica en múltiples tarjetas de la misma vista.
- Las tarjetas no deben tener sombras fuertes; usar borde y `shadow-none`.
- Evitar tarjetas anidadas.
- Una tarjeta clickeable debe ser completamente clickeable, no contener varios botones internos.

## 8. Tablas y listados

- Filtros principales visibles: búsqueda, estado y rango de fecha cuando corresponda.
- Filtros adicionales dentro de `Más filtros`.
- Acciones por fila en un menú contextual; mostrar como máximo una acción directa.
- Encabezados breves y consistentes.
- Columnas de baja prioridad se ocultan en móvil.
- Siempre incluir estados de carga, vacío, error y sin permisos.
- El estado vacío debe explicar qué falta y ofrecer una única acción relevante.

## 9. Formularios y modales

- Agrupar campos por propósito, no por estructura de base de datos.
- Etiquetas visibles; no depender solo de placeholders.
- Mensajes de error junto al campo.
- Acciones del formulario: `Cancelar` y una única acción primaria.
- Los formularios extensos deben usar secciones o pasos.
- No abrir un modal sobre otro modal.

## 10. Estados del sistema

Los estados permitidos son:

- Cargando.
- Actualizado.
- Datos parciales.
- Sin datos.
- Sin permisos.
- Error recuperable.
- Error bloqueante.

`Datos parciales` debe explicar qué fuente no está disponible. Nunca mostrarlo como una etiqueta sin contexto.

## 11. Color y accesibilidad

- Usar tokens semánticos del tema; evitar colores hardcodeados salvo estados operacionales justificados.
- Contraste mínimo WCAG AA.
- No comunicar estados únicamente mediante color.
- Foco visible en todos los elementos interactivos.
- Área mínima táctil: 40px.
- Respetar `prefers-reduced-motion`.

## 12. Responsive

- Diseñar primero para móvil y escalar a desktop.
- Los encabezados pasan a columna en pantallas pequeñas.
- Acciones secundarias se mueven a menús en móvil.
- Tablas complejas usan columnas adaptativas o vistas tipo tarjeta; no scroll horizontal sin control.
- Sidebar móvil debe cerrar después de navegar.

## 13. Reglas por rutas secundarias

Toda ruta secundaria debe cumplir:

- Breadcrumb correcto.
- Título y descripción específicos.
- Cero IDs técnicos visibles.
- Una acción primaria.
- Máximo dos botones visibles en el encabezado.
- Menú contextual para acciones adicionales.
- Estado vacío útil.
- Estado de error con reintento cuando sea posible.
- Datos provenientes de la fuente canónica correspondiente.
- Sin accesos duplicados a la misma función.

## 14. Checklist antes de publicar

- [ ] Build sin errores.
- [ ] Sin errores de runtime.
- [ ] Modo claro y oscuro revisados.
- [ ] Desktop, tablet y móvil revisados.
- [ ] Una sola acción primaria por pantalla.
- [ ] No más de dos acciones visibles en encabezados.
- [ ] No hay botones sin función.
- [ ] No hay datos mock.
- [ ] No hay texto técnico o IDs internos visibles.
- [ ] Estados de carga, vacío, error y permisos implementados.
- [ ] Breadcrumbs y navegación de regreso correctos.
- [ ] Cada entidad tiene una fuente maestra definida.
- [ ] No existen maestros paralelos sin justificación.
- [ ] Todo dato derivado está identificado.
- [ ] Se registró qué se conservó, fusionó, movió, renombró, archivó o eliminó.
