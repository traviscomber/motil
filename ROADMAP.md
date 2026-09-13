# MOTIL ROADMAP

## North Star

MOTIL debe evolucionar de ERP minero con IA a **Mining Operational Intelligence System**.

Arquitectura objetivo:

`Fuentes canónicas → estado operacional → excepciones → prioridades → Decision Cases → especialista → acción humana → revalidación → memoria → aprendizaje operacional`

Principio rector: el usuario debe poder abrir MOTIL y entender rápidamente **qué importa ahora, por qué importa, qué falta, quién debe actuar, qué hacer y qué cambió**. La IA interpreta y prioriza; la verdad operacional sigue siendo canónica y las decisiones de autoridad siguen siendo humanas.

---

## 1. Canonical Operational Truth

Mantener una capa sin IA para activos, OT, planes preventivos, horómetros, producción, sondajes, geología, inventario, compras, proveedores, costos, centros de costo, HSE, personas, turnos, documentos y evidencia.

Reglas:
- ningún agente modifica silenciosamente esta capa;
- toda escritura operacional requiere flujo autorizado;
- separar fuente, normalización, cálculo e insight;
- conservar trazabilidad de procedencia.

## 2. Operational State

Transformar datos canónicos en estado operacional determinístico:
- OT lista/no lista para cierre;
- mantenimiento vencido/próximo;
- máquina sin responsable;
- repuesto crítico sin cobertura;
- compra abierta/atrasada;
- inventario bajo mínimo;
- producción bajo ritmo;
- fuente atrasada o inconsistente;
- sondaje con geometría/evidencia insuficiente;
- costo incompleto;
- documento obligatorio faltante.

La lógica determinística no debe depender de LLM.

## 3. Decision Layer

Unificar situaciones materiales en `Decision Cases` persistentes.

Cada caso debe registrar:
- dominio;
- severidad/prioridad;
- objeto afectado;
- estado;
- evidencia;
- contradicciones;
- evidencia faltante;
- responsable;
- siguiente acción;
- timestamps;
- última revalidación;
- estado de resolución;
- autoridad `advisory_only` salvo flujo humano explícito.

Regla UX: consolidar múltiples síntomas/evidencias en un caso coherente, evitando ruido de alertas.

## 4. MOTIL Intelligence Core

Un cerebro compartido, no múltiples chats independientes.

`Usuario → contexto → Intelligence Core → especialista invisible → fuentes autorizadas → respuesta`

Especialistas previstos:
- Producción;
- Planta;
- Mantención;
- Confiabilidad;
- Inventario;
- Compras;
- Geología;
- Finanzas;
- HSE;
- RRHH;
- Data Health;
- Ejecutivo.

El usuario no selecciona agentes. MOTIL enruta internamente.

## 5. Executive Intelligence

Centro Ejecutivo orientado a excepciones y decisiones:
- qué necesita atención;
- qué cambió;
- qué está bloqueado;
- qué puede afectar producción;
- qué equipos presentan riesgo/recurrencia;
- qué compras bloquean trabajo;
- dónde cae disponibilidad;
- qué información no es confiable;
- qué decisiones siguen abiertas;
- qué ocurrió desde la última visita.

---

# Roadmap de ejecución

## Fase A — Intelligence Core 2.0

### A1. Decision Cases Mantención + Geología — COMPLETADO 2026-09-13

- preventiva por horómetro → caso persistente;
- OT bloqueada para cierre → caso persistente;
- readiness/evidencia geológica → caso persistente;
- revalidación exacta antes de archivar;
- permisos por dominio;
- autoridad advisory-only;
- hasta tres prioridades persistentes en Inicio;
- revisión P1/P2 cerrada antes de merge.

### A2. Decision Cases v2 — Inventario + Compras — SIGUIENTE

Objetivo: conectar abastecimiento directamente con necesidad operacional, especialmente Mantención.

Casos previstos, sólo si las fuentes reales los permiten:
- producto crítico bajo mínimo;
- necesidad de repuesto sin cobertura;
- necesidad de compra sin orden asociada;
- orden de compra que bloquea una OT;
- orden atrasada o recepción pendiente;
- material reservado/emitido/pendiente inconsistente;
- producto canónico sin resolución suficiente para abastecer una OT.

Requisitos:
- reutilizar read models/tablas existentes;
- evitar crear un módulo global nuevo;
- consolidar por necesidad/material/OT cuando corresponda;
- revalidar contra evidencia exacta antes de resolver;
- no modificar stock, OC ni OT desde Decision Cases.

### A3. Decision Cases Producción

- desviación plan/real;
- ritmo materialmente insuficiente;
- turno/fuente incompleta;
- excepción de importación/reconciliación;
- calidad/frescura que impide una lectura confiable.

### A4. Decision Cases Finanzas/HSE

Finanzas:
- OT sin centro de costo cuando sea exigible;
- costo incompleto;
- valorización pendiente;
- excepciones materiales trazables.

HSE:
- hallazgos;
- incidentes;
- no conformidades;
- acciones vencidas;
- bloqueos de retorno a servicio cuando exista evidencia canónica.

---

## Fase B — Prioridad real

Crear `Operational Attention Score` explicable, combinando sólo factores soportados por evidencia:

`impacto × urgencia × bloqueo × recurrencia × incertidumbre × responsabilidad`

Niveles orientativos:
- P1: seguridad, detención, producción, equipo crítico;
- P2: riesgo creciente, atraso, repuesto crítico, pérdida potencial;
- P3: housekeeping, calidad de dato, revisión futura.

Límites de exposición:
- Inicio: máximo 3 prioridades;
- Centro Ejecutivo: máximo 5–7;
- nunca convertir todos los gaps en alertas individuales.

---

## Fase C — Inicio 2.0

### C1. Qué importa ahora

Máximo tres prioridades, cada una con:
- problema;
- por qué importa;
- qué falta;
- siguiente acción.

### C2. Mi operación

Contenido específico por cargo.

Ejemplo Mantención:
- OT en ejecución;
- OT bloqueadas;
- preventiva vencida;
- esperando repuesto;
- equipos críticos.

### C3. Cambió desde tu última visita

Detectar eventos relevantes:
- OT avanzó/cerró/se bloqueó;
- preventiva pasó a vencida;
- llegó un repuesto;
- se resolvió/apareció un Decision Case;
- apareció una anomalía material.

---

## Fase D — Memoria gobernada 2.0

Guardar sólo contexto estable:
- responsabilidades;
- mina/área;
- equipos habituales;
- terminología;
- preferencias;
- nivel de detalle;
- vistas frecuentes.

Nunca usar memoria como verdad para:
- stock;
- OT;
- producción;
- estados operacionales;
- precios;
- métricas;
- decisiones transitorias.

`memoria de usuario ≠ verdad operacional`

---

## Fase E — Temporal Intelligence

MOTIL debe distinguir:
- apareció;
- empeoró;
- mejoró;
- sigue igual;
- volvió a ocurrir;
- se resolvió.

Habilita:
- “qué cambió”;
- “qué está empeorando”;
- comparación contra ventana previa sin inventar KPI.

---

## Fase F — Recurrence Engine / Reliability

Detectar recurrencia basada en evidencia:

`mismo equipo + síntoma/causa comparable + ventana temporal`

Salida advisory:
- posible recurrencia;
- evidencia relacionada;
- acción sugerida de revisión de causa raíz.

Capacidades posteriores, sólo con calidad suficiente:
- MTBF;
- MTTR;
- repetición de falla;
- disponibilidad;
- downtime;
- failure mode;
- causa raíz;
- costo por activo;
- frecuencia de intervención.

---

## Fase G — Equipment Intelligence

Ficha operacional por activo:
- estado;
- disponibilidad;
- horómetro;
- próxima mantención;
- OT abiertas;
- últimas fallas;
- repuestos/BOM;
- costos;
- recurrencia;
- evidencia;
- Decision Cases.

Objetivo conversacional: responder “¿qué está pasando con el equipo X?” desde evidencia conectada.

---

## Fase H — Maintenance Intelligence

Cinco superficies:
1. Trabajo — qué hacer hoy;
2. Planificación — qué viene;
3. Activos — estado;
4. Confiabilidad — qué está fallando repetidamente;
5. Inteligencia — qué requiere intervención de jefatura.

Reducir navegación fuera de estas preguntas.

### Mobile Operations

Para perfiles de ejecución:
- trabajo actual;
- Iniciar;
- Pausar/Reanudar;
- Terminar;
- causa/acción;
- evidencia;
- horómetro;
- observación.

El teléfono no debe parecer un ERP completo.

### Evidence-first closure

Preservar:
- quién;
- cuándo;
- activo;
- horómetro;
- evidencia;
- causa;
- acción;
- repuestos;
- horas;
- costo;
- antes/después cuando exista.

---

## Fase I — Inventory 2.0 / Spare Parts Intelligence

Inventario debe responder:
- qué tenemos;
- qué falta;
- qué está bajo mínimo;
- qué bloquea mantenimiento;
- qué nunca se mueve;
- qué consume demasiado;
- qué repuesto corresponde a qué equipo.

Conectar:

`Activo ↔ BOM ↔ repuesto ↔ inventario ↔ OT ↔ compra`

Objetivo: responder “¿tenemos los repuestos necesarios para las OT de esta semana?”.

---

## Fase J — Procurement Intelligence

Compras como consecuencia de necesidad operacional:

`OT → repuesto faltante → necesidad → compra → recepción → reserva → emisión`

Evitar que el usuario reconstruya manualmente la cadena.

### Supplier Intelligence

Con datos suficientes:
- lead time;
- retrasos;
- cumplimiento;
- órdenes abiertas;
- categorías;
- dependencia;
- precio histórico.

Cálculo determinístico, no opinión del LLM.

---

## Fase K — Producción 2.0

Centrar Producción en:

`Plan vs Real vs Ritmo vs Desviación vs Causa`

Luego decidir qué requiere acción.

### Production Exceptions

Detectar:
- falta de registro;
- turno incompleto;
- tonelaje anómalo sustentable;
- inconsistencia;
- atraso;
- discrepancia de fuente;
- ritmo insuficiente.

Alimentar Decision Cases cuando la excepción sea material.

---

## Fase L — Geology Intelligence

MOTIL apoya al geólogo, no lo sustituye.

Responder:
- qué sondajes requieren revisión;
- qué evidencia falta;
- dónde existen contradicciones;
- qué información aún no debe usarse;
- qué datos están listos para interpretación.

### Geological Evidence Graph

Relacionar:

`Sondaje → intervalos → litología → mineralización → estructura → survey → topografía → evidencia visual → fuente`

Toda conclusión debe poder volver a evidencia.

---

## Fase M — Data Health infrastructure

Data Health trabaja en segundo plano, no compite necesariamente como módulo global.

Para datos críticos mantener, cuando la fuente lo permita:
- fuente;
- freshness;
- completeness;
- confidence;
- reconciliation state.

### Confidence-aware AI

Respuestas del Core deben poder distinguir:
- alta confianza;
- media;
- baja;

explicando qué evidencia falta o contradice.

---

## Fase N — Executive Center 2.0

Secciones objetivo:
- Atención ahora;
- Riesgos;
- Bloqueos;
- Decisiones abiertas;
- Cambió desde ayer;
- Salud de información.

### Executive Briefing

Vista compacta “Hoy en MOTIL”:
- Producción;
- Mantención;
- Abastecimiento;
- Geología;
- Riesgos.

Máximo una página.

---

## Fase O — Decision History / Human Approvals

Timeline de Decision Case:

`detectado → revisado → asignado → acción → revalidado → resuelto`

Separar siempre:
- recomendación;
- evidencia;
- decisión humana;
- actor;
- comentario;
- timestamp.

Permitir responder “¿por qué se tomó esta decisión?”.

---

## Fase P — Cross-domain reasoning

El Core debe conectar dominios sin obligar navegación manual.

Ejemplo:

`OT bloqueada → falta rodamiento → stock insuficiente → OC abierta → recepción pendiente`

Mostrar causal chain:

`problema → causa → dependencia → acción`

Prioridad alta después de A2.

---

## Fase Q — Persona-driven MOTIL

Una plataforma, experiencias diferentes:
- Mecánico: trabajo actual;
- Jefe de taller: equipos/personas/bloqueos;
- Planificador: plan/backlog/materiales;
- Jefe Mantención: disponibilidad/riesgos/recurrencia;
- Geólogo: evidencia/sondajes/revisión;
- Bodega: stock/necesidades;
- Compras: necesidades/órdenes;
- Gerencia: excepciones/decisiones.

Aplicar progressive disclosure:

`resumen → contexto → evidencia`

---

## Fase R — Navegación y búsqueda

Grandes dominios preferidos:
- Inicio;
- Operación;
- Mantención;
- Geología;
- Abastecimiento;
- Finanzas;
- Sostenibilidad;
- Administración.

Capacidades como Reportes, Desempeño, Data Health y Centros de costo deben vivir en el contexto que corresponda, no competir innecesariamente como módulos globales.

### Search / Command Bar

Buscar:
- equipo;
- OT;
- persona;
- producto;
- sondaje.

Consultas/acciones de navegación:
- “OT atrasadas”;
- “Equipo CAT 320”;
- “Compras que bloquean mantenimiento”.

---

## Fase S — Notifications / Daily Operating Cycle

Notificar sólo:
- P1;
- responsabilidad directa;
- bloqueo;
- vencimiento;
- cambio material.

Ciclo objetivo:
- inicio de turno: atención;
- durante turno: trabajo;
- cambio material: actualización;
- fin de turno: pendientes;
- jefatura: excepciones.

---

## Fase T — Intelligence Core observability and evaluation

Auditar:
- usuario;
- dominio;
- especialista;
- fuentes;
- latencia;
- errores;
- respuesta;
- acciones propuestas;
- resultado.

Crear evaluación permanente con preguntas como:
- ¿Qué OT están bloqueadas?;
- ¿Qué requiere atención hoy?;
- ¿Tenemos repuestos para estas OT?;
- ¿Qué está pasando con el equipo X?;
- ¿Qué sondajes requieren revisión?

Evaluar:
- fuente correcta;
- permisos;
- no alucinación;
- precisión;
- utilidad.

---

## Fase U — Hardening

### Permission regression suite

Por rol validar:
- rutas;
- endpoints;
- datos;
- mutaciones;
- Intelligence Core;
- Decision Cases.

### Mobile regression suite

Perfiles prioritarios:
- mecánico;
- soldador;
- jefe de taller;
- encargado camiones/camionetas;
- supervisor.

### Performance

- Inicio rápido y específico;
- evitar joins/client fetch redundantes;
- no usar IA para datos determinísticos;
- cachear estructuras/catálogos poco cambiantes;
- no cachear agresivamente OT, producción actual, inventario crítico o Decision Cases.

### Data Guardian

Buscar continuamente:
- duplicados;
- referencias rotas;
- activos sin canonical mapping;
- personas inválidas;
- stock inconsistente;
- enums antiguos;
- relaciones históricas incompletas.

No corregir silenciosamente evidencia dudosa.

### Auditability

Toda transformación debe poder explicar:

`source → normalized → calculation → decision`

---

## Fase V — Benchmarking

Comparar capacidades con patrones relevantes de:
- SAP PM;
- IBM Maximo;
- Hexagon;
- ABB;
- AVEVA;
- Fiix;
- MaintainX;
- UpKeep;
- ERP/CMMS mineros especializados.

Objetivo: detectar capacidades críticas faltantes, no copiar UX o propiedad intelectual.

---

# Guardrails

No priorizar:
- dashboards decorativos;
- más módulos por sí mismos;
- múltiples agentes visibles;
- AI insights genéricos;
- predicción sin historial suficiente;
- KPIs no sostenidos por fuente;
- automatizaciones que escriban verdad operacional sin autoridad humana.

Preferir siempre:
- estado;
- excepción;
- decisión;
- acción;
- evidencia;
- trazabilidad.

---

# Gates de calidad

## Gate 9.8

Exigir:
- roles críticos probados;
- Inicio específico por rol;
- máximo tres prioridades reales;
- Decision Cases persistentes;
- resolución/revalidación segura;
- memoria gobernada;
- Core cross-domain;
- mobile execution completo;
- cero violaciones críticas de permisos;
- cero rutas P0/P1 rotas;
- datos canónicos intactos;
- deployment productivo verificado;
- runtime limpio;
- QA desktop + móvil.

## Gate 9.9+

Además:
- “qué cambió desde ayer”;
- recurrencia de fallas;
- inteligencia por activo;
- dependencia OT → repuesto → compra;
- temporal reasoning;
- confianza de fuentes;
- historia de decisiones;
- evaluación automática del Core;
- especialistas invisibles coordinados.

---

# Orden de ataque vigente

1. **A2 — Decision Cases v2: Inventario + Compras**
2. **P — Cross-domain reasoning OT → inventario → compras**
3. **C — Inicio 2.0 / cambios desde última visita**
4. **F/G/H — Reliability + Equipment + Maintenance Intelligence**
5. **I/J — Inventory / Procurement Intelligence**
6. **K/L — Production / Geology Intelligence**
7. **N/O — Executive Center + Decision History**
8. **T/U — Evaluación, permisos, móvil, performance y release hardening**

Este documento es el roadmap canónico de producto. Debe actualizarse a medida que un bloque pasa de planificado → en progreso → completado, sin convertir nombres de roadmap en fuentes de verdad operacional.
