# Plan 12 — Backlog con filtros

> Fase: 12 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: una vista con TODAS las tareas del proyecto — planificadas o no, dentro o fuera de la ventana — filtrable por estado, fecha y épica.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (módulo `items` ✅), Fase 4 (reglas de ventana/prioridad ✅), Fase 10 (reasignar padre desde el detalle ✅).
- **Habilita:** aparcar ideas sin fecha sin que desaparezcan de la app.

---

## Contexto y decisiones

El Kanban se **deriva** del Gantt: solo enseña lo que cruza `[hoy, hoy+ventana]` (más lo
`in_progress`/`blocked` y lo vencido). Consecuencia: **un ítem sin fechas no aparecía en
ninguna parte**. No había dónde aparcar una idea, ni cómo revisar lo que se salió del radar.

Decisiones (con el usuario, 2026-08-09):

- **El backlog lo lista TODO**: planificado y sin planificar, dentro y fuera de la ventana,
  hecho y por hacer. Es la única vista que no esconde nada; el Kanban sigue intacto como
  derivada del Gantt.
- **Vista propia `/backlog`**, cuarta pestaña. Una columna extra en el Kanban no puede
  contener "todo" sin romper el tablero del día a día.
- **Filtros: estado, fecha y épica.** El de fecha combina presets (sin planificar ·
  planificadas · en la ventana · vencidas) con un **rango libre desde/hasta**, porque
  "filtrar por fecha" significa las dos cosas según el momento.
- **Las épicas no son filas**, igual que en el Kanban: contienen trabajo, no se ejecutan.
  Son la dimensión del filtro. Una subtarea hereda la épica de su tarea madre.
- **Sin cambios de backend**: `GET /projects/:id/items` ya devuelve el proyecto entero; el
  filtrado es lógica pura de cliente (`lib/backlog.ts`) con **"hoy" inyectado**, testeable
  sin renderizar nada.
- **Se reutiliza `TaskDetail`** al pulsar una fila: desde ahí se ponen fechas y el ítem entra
  al Gantt y al Kanban solo. No hace falta un flujo de "planificar" aparte.

---

## Tareas

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 12.1 | `lib/backlog.ts`: filtros (estado/fecha/épica/rango), resolución de la épica de cada ítem y orden (planificado por fecha, sin planificar al final) | ✅ Hecho | "Hoy" inyectado; sin `new Date()` dentro |
| 12.2 | `BacklogView`: barra de filtros + lista densa (clave, título, épica, estado, fechas, estimación) + contador y botón LIMPIAR | ✅ Hecho | Fila pulsable → `TaskDetail` |
| 12.3 | Cablear en `App.tsx`: pestaña BACKLOG y ruta `/backlog` | ✅ Hecho | Recibe `today` y `kanban_window_days` |
| 12.4 | Tests: 18 de la lógica de filtrado + 9 de la vista | ✅ Hecho | Combinaciones de filtros, herencia de épica, ciclos en los datos |

### Documentación

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 12.5 | `docs/functional.md` §3.4b — qué es el backlog y sus filtros | ✅ Hecho | — |

---

## Entregable

Pestaña **BACKLOG** con todas las tareas del proyecto activo y tres filtros combinables
(estado, fecha, épica) más un rango libre de fechas. Al pulsar una fila se abre el detalle
de siempre.

## Criterio de aceptación

- `pnpm -r typecheck`, `pnpm -r test` y el build de frontend en verde.
- Una tarea sin fechas aparece en el backlog y sigue sin aparecer en el Kanban.
- El filtro de épica recoge también las subtareas que cuelgan de sus tareas.
- Los filtros se acumulan y LIMPIAR devuelve la lista completa.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | 12.1–12.5 completadas | Vista `/backlog` con filtros de estado/fecha/épica + rango libre. Sin tocar backend: el filtrado es lógica pura de cliente. Frontend 82 tests ✅ (27 nuevos), backend 157 ✅, build ✅. |
