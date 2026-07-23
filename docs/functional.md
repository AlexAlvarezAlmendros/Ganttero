---
tipo: doc
estado: validando
creado: 2026-07-22
tags: [proyecto, ganttpersonal, funcional]
---

# GanttPersonal — Documentación funcional

> v0.1 · 2026 · Qué hace la app y para quién

Arquitectura: [architecture.md](./architecture.md) · Plan: [ROADMAP.md](./planning/ROADMAP.md).

---

## 1. Visión y usuario objetivo

**Usuario:** yo, un único usuario, en la red local de casa. Sin cuentas, sin permisos, sin compartir.

**Visión:** dejar de dispersar tareas entre notas, cabeza y este vault. Una sola herramienta donde **planifico en un Gantt** y el **Kanban del día se mantiene solo**, y donde crear una tarea cuesta 10 segundos **hablando** en vez de rellenar un formulario. Principio rector: **mínima fricción**. Si añadir o mover una tarea cuesta, la app ha fallado.

---

## 2. Casos de uso / historias de usuario

Formato: *Como usuario, quiero … para …*

### Captura y estructura
- Quiero **crear una tarea hablando** (describirla en voz) y que la app la rellene sola, para no teclear campos.
- Quiero **revisar y ajustar** lo que la IA ha entendido antes de guardar, para corregir errores.
- Quiero **crear proyectos, épicas, tareas y subtareas** y anidarlas, para estructurar el trabajo.

### Organización visual
- Quiero un **Kanban** con el trabajo de ahora, para saber qué tengo entre manos.
- Quiero un **Gantt** donde ver el plan en el tiempo, y **cambiar el zoom** (año → medio año → mes → semana → día) para pasar de la visión global al detalle.
- Quiero que **épicas, tareas y subtareas** se vean en el Gantt según la escala elegida, para no ahogarme en detalle cuando miro el año.

### Automatización (lo que no quiero hacer a mano)
- Quiero que el **Kanban se llene solo** con lo que toca las próximas 1–2 semanas, para no arrastrar tareas manualmente.
- Quiero que las tareas se **prioricen solas** (empieza hoy/mañana, va tarde…), para ver de un vistazo qué es urgente.
- Quiero que, al marcar una tarea como completada, se **registre solo el tiempo** que estuvo en curso, para saber cuánto me llevan las cosas sin cronometrar.

### Vínculo con el código
- Quiero **enlazar un proyecto con su repo de GitHub**, para tener el código a un clic.
- Quiero que un **commit que mencione una tarea** (`GP-42`) la actualice, para no tocar la app al programar.

---

## 3. Funcionalidades por módulo

### 3.1. Gestión de proyectos e ítems
- Crear/editar/archivar **proyectos**.
- Crear ítems jerárquicos: **Épica → Tarea → Subtarea** (mover, reanidar, borrar).
- Campos de un ítem: título, descripción, estado, fechas inicio/fin, estimación, dependencias.
- Cada ítem tiene una **clave corta** (`GP-42`) para referenciarlo desde commits.

### 3.2. Captura por voz
- Botón de **grabar**; al soltar, la app transcribe (STT) y estructura con IA (Gemma 4).
- Devuelve un **formulario pre-relleno** (título, tipo, fechas sugeridas, estimación) para confirmar/editar.
- Si la IA no entiende bien, **fallback a formulario manual** sin bloquear.

### 3.3. Kanban
- Columnas por estado: **Backlog · En curso · Bloqueada · Hecha**.
- **Drag & drop** entre columnas.
- Contenido **derivado del Gantt** (no se añade a mano): ver reglas en §4.
- Señales visuales de **prioridad** (para ya / retrasada / normal / bloqueada).

### 3.4. Gantt multi-escala
- Línea temporal con **zoom** año → medio año → mes → semana → día.
- Barras para épicas (contenedoras) y sus tareas/subtareas, que **se agrupan/expanden** según la escala.
- Edición de fechas arrastrando barras *(deseable; ver Roadmap)*.

### 3.5. Cronometraje
- Registro **automático** del tiempo en "En curso" (sin cronómetro manual).
- Historial de tiempo por tarea; base para comparar real vs. estimado *(extensión futura)*.

### 3.6. Integración GitHub
- Enlazar uno o varios **repos** a un proyecto.
- Ver **ramas, commits, issues y PRs** abiertos junto a las tareas.
- **Smart commits:** `GP-<id>` en un commit/PR enlaza o cambia el estado de la tarea.

### 3.7. Ajustes
- **Ventana del Kanban** (días que mira hacia delante: 7/14/configurable).
- Preferencias de retención de audios, token de GitHub, etc.

---

## 4. Reglas de negocio

- **El Gantt manda:** el *cuándo* vive en el Gantt; el Kanban es una **vista derivada**, no una lista independiente.
- **Ventana del Kanban:** aparece un ítem si su rango de fechas cruza `[hoy, hoy + ventana]`, o si está `En curso`/`Bloqueada`.
- **Prioridad automática:**
  - `fin < hoy` y no completada → **Retrasada / urgente**.
  - Empieza **hoy o mañana** → **Para ya**.
  - En ventana pero empieza más tarde → **Normal**.
  - `Bloqueada` → se destaca aparte.
- **Cronometraje:** al pasar a "En curso" se abre un tramo de tiempo; al pasar a "Hecha" se cierra. Reabrir suma un tramo nuevo; el total es la suma.
- **Jerarquía:** completar todas las subtareas no completa la tarea padre automáticamente (decisión del usuario) — *revisable*.
- **Un solo usuario:** sin permisos ni estados de asignación a terceros.

---

## 5. Flujos principales

### 5.1. Crear una tarea por voz
1. Pulso **grabar** y describo la tarea hablando.
2. La app transcribe (STT) → estructura (Gemma) → muestra **formulario pre-relleno**.
3. Reviso, corrijo si hace falta y **guardo**.
4. La tarea aparece en el Gantt (por sus fechas) y, si entra en ventana, en el Kanban.

### 5.2. Planificar en el Gantt
1. Abro el **Gantt** en escala mes/semana.
2. Coloco épicas y sus tareas/subtareas en el tiempo (fechas).
3. Cambio a **escala año** para ver el conjunto; **al día** para el detalle.

### 5.3. Trabajar el día a día (Kanban automático)
1. Abro el **Kanban**: ya está lleno con lo de las próximas 1–2 semanas, **priorizado**.
2. Muevo una tarea a **En curso** (empieza el cronómetro solo).
3. Al terminar, la muevo a **Hecha** → se guarda el **tiempo en progreso**.

### 5.4. Vincular y trabajar con GitHub
1. En un proyecto, **enlazo su repo**.
2. Programo y hago un commit citando `GP-42`.
3. La tarea `GP-42` se **actualiza sola** (enlace/estado) según la regla de smart commits.

---

## 6. Fuera de alcance (v1)

- Multi-usuario, cuentas, permisos, colaboración.
- App móvil nativa (la web responsive basta).
- Notificaciones push / integraciones externas más allá de GitHub.
- Informes/analítica avanzada (más allá de tiempo real vs. estimado, que es extensión).
- Exponer la app a Internet (uso en LAN; salvo el webhook de GitHub si se opta por él).

---

## Estado

Documento **v0.1**, alineado con el [ROADMAP.md](./planning/ROADMAP.md). Se refinará según lo que valide la Fase 0 (captura por voz) y las decisiones abiertas del [documento de arquitectura](./architecture.md).
