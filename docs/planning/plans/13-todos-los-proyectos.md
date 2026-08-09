# Plan 13 — Vista "Todos los proyectos"

> Fase: 13 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: elegir TODOS LOS PROYECTOS en el selector y ver el trabajo entero en Kanban, Gantt y Backlog.

---

## Dependencia con otras fases

- **Requiere:** Fase 4 (derivación del Kanban ✅), Fase 10 (reasignar padre ✅), Fase 12 (backlog ✅).
- **Habilita:** trabajar con varios proyectos vivos sin ir saltando de uno a otro.

---

## Contexto y decisiones

Hasta ahora todo colgaba de **un** proyecto activo: `GET /projects/:id/items` y
`GET /projects/:id/kanban`. Con varios proyectos en marcha, ver el día completo obligaba a
cambiar de proyecto y sumar mentalmente.

Decisiones:

- **El ámbito es del selector, no de cada vista**: `PROYECTO ▾` gana una entrada
  **TODOS LOS PROYECTOS** y las tres vistas la respetan. Un solo sitio donde cambiarlo.
- **Endpoints agregados en el backend, no N peticiones desde el cliente**: `GET /items` y
  `GET /kanban`. El tablero **debe** derivarse donde vive la regla — `boardAll()` reutiliza
  exactamente el mismo `deriveBoard`, así que el pilar del producto no se duplica.
  `project_id` pasa a ser `number | null` en la respuesta del tablero (`null` = todos).
- **La ventana sigue siendo global** (ajuste único): la agregación no cambia ninguna regla
  de ventana ni de prioridad, solo el conjunto de entrada.
- **Identificación por clave**: `GP-42` / `OT-7` ya llevan el prefijo del proyecto. Encima,
  el Backlog añade **columna y filtro de proyecto**, y el Gantt **etiqueta cada raíz**
  (épica o tarea suelta) con el nombre de su proyecto.
- **La jerarquía nunca cruza proyectos.** Con ítems de varios proyectos en memoria, el
  selector de padre de `TaskDetail` y de `ItemDialog` se filtra por `project_id` — el
  backend ya lo rechazaba, pero ni siquiera debe ofrecerse.
- **Crear en modo "todos" pregunta el proyecto**: `ItemDialog` muestra un selector de
  proyecto cuando no hay uno fijado, en vez de bloquear el botón (mínima fricción).
- **Invalidación de caché por prefijo** (`["items"]`, `["kanban"]`): el mismo ítem vive en
  la caché de su proyecto *y* en la de "todos", y las dos deben refrescarse.
- **GitHub queda fuera del modo "todos"**: un repo se enlaza a un proyecto concreto.

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 13.1 | `ItemsRepo.listAll()` + `ItemsService.listAll()` + `GET /items` | ✅ Hecho | Mismo JOIN con `project`: la clave sigue completa |
| 13.2 | `KanbanService.boardAll()` + `GET /kanban`, extrayendo `derive()` común | ✅ Hecho | `project_id: null` en la respuesta |
| 13.3 | `kanbanBoardSchema.project_id` pasa a `nullable` | ✅ Hecho | — |
| 13.4 | Tests de las dos rutas agregadas (5) | ✅ Hecho | Dos proyectos reales vía `inject()` |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 13.5 | `ProjectScope = number \| "all"`; `useItems`/`useKanban` eligen ruta según el ámbito | ✅ Hecho | Invalidación por prefijo |
| 13.6 | `ProjectSelector`: entrada TODOS LOS PROYECTOS (como `<button>`, sin ✎/✕) | ✅ Hecho | El botón del selector muestra el ámbito |
| 13.7 | `App.tsx`: estado `scope`, `active` nulo en modo todos, props a las vistas | ✅ Hecho | GitHub solo con proyecto concreto |
| 13.8 | `BacklogView`: columna y filtro PROYECTO (`showProject`) | ✅ Hecho | Filtro añadido a la lógica pura |
| 13.9 | `GanttView`: etiqueta de proyecto en cada fila raíz | ✅ Hecho | Solo si llegan `projects` |
| 13.10 | `ItemDialog`: selector de proyecto cuando no hay uno fijado; padres del proyecto elegido | ✅ Hecho | — |
| 13.11 | `TaskDetail`: padres acotados a `task.project_id` | ✅ Hecho | La jerarquía no cruza proyectos |
| 13.12 | Tests: ámbito de las queries (5), selector (4), backlog multi-proyecto (2+3), padres entre proyectos (1) | ✅ Hecho | — |

### Documentación

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 13.13 | `docs/functional.md` §3.2b | ✅ Hecho | — |

---

## Entregable

En el selector aparece **TODOS LOS PROYECTOS**; al elegirlo, Kanban, Gantt y Backlog muestran
el trabajo de todos, con el proyecto visible en cada ítem y filtrable en el backlog.

## Criterio de aceptación

- `pnpm -r typecheck`, `pnpm -r test` y el build de frontend en verde.
- `GET /kanban` aplica las mismas reglas de ventana y prioridad que `GET /projects/:id/kanban`.
- En modo todos, el selector de épica de una tarea no ofrece épicas de otro proyecto.
- Crear una tarea en modo todos exige elegir proyecto.
- Elegir un proyecto concreto deja las vistas exactamente como estaban.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | 13.1–13.13 completadas | Endpoints agregados `GET /items` y `GET /kanban` reutilizando `deriveBoard`; ámbito `"all"` en el selector y las tres vistas. Backend 162 tests ✅ (5 nuevos), frontend 98 ✅ (16 nuevos), build ✅. |
