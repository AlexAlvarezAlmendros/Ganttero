# Plan 10 — Reasignar el padre de una tarea o subtarea

> Fase: 10 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: desde el detalle de un ítem se puede cambiar la épica (o la tarea madre) de la que cuelga, sin borrar y volver a crear.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (módulo `items` con jerarquía ✅), Fase 3 (Gantt jerárquico ✅).
- **Habilita:** reorganizar la jerarquía sin perder historial (`time_log`, commits enlazados, `key`).

---

## Contexto y decisiones

El **backend ya lo soporta**: `updateItemSchema` acepta `parent_id`, y `ItemsService.update()`
resuelve el padre (`resolveParent`), comprueba que pertenece al mismo proyecto, valida la
jerarquía (`assertHierarchy`) y evita ciclos (`assertNoCycle`). El agujero está en la **UI**:
`TaskDetail` no ofrece ningún control para el padre, así que hoy la única forma de mover una
tarea de épica es borrarla y recrearla — perdiendo `key`, tiempo registrado y enlaces de GitHub.

Decisiones:

- **El control vive en `TaskDetail`** (el detalle del ítem), junto a estado/fechas. No se añade
  drag & drop en el Gantt: más caro y la fricción real ("no puedo cambiar la épica") se resuelve
  con un desplegable.
- **Reutilizar el filtrado de `ItemDialog`**: tarea → épicas del proyecto; subtarea → tareas del
  proyecto; épica → sin padre (control oculto). Se extrae a `lib/hierarchy.ts` para que alta y
  edición no puedan divergir.
- **Excluir descendientes propios** de los candidatos en la UI, además de la validación del
  backend: un ítem no puede colgar de sí mismo ni de su descendencia.
- **Se guarda con el botón GUARDAR**, en el mismo PATCH que título/fechas — no un guardado
  aparte, para no multiplicar peticiones ni estados intermedios.
- El backend **no cambia**; solo se le añaden tests de reparentado que hoy no existen
  (el único test de `parent_id` en `update` es el de ciclo).

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 10.1 | Tests de servicio del reparentado: mover tarea entre épicas, sacarla a raíz (`parent_id: null`), rechazar padre de otro proyecto, rechazar jerarquía inválida (subtarea bajo épica) | ✅ Hecho | Sin cambios de código: se verifica lo ya implementado |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 10.2 | `lib/hierarchy.ts`: `parentCandidates(items, type, selfId?)` — filtra por tipo y excluye el propio ítem y su descendencia | ✅ Hecho | `ItemDialog` pasa a usarlo |
| 10.3 | `TaskDetail`: selector "Épica" / "Tarea madre" (oculto en épicas) que entra en el patch como `parent_id` | ✅ Hecho | Prop nueva `items: Item[]` desde `App.tsx` |
| 10.4 | Tests: `parentCandidates` (filtrado + exclusión de descendientes) y `TaskDetail` (muestra el padre actual, lo cambia, lo quita, no aparece en épicas) | ✅ Hecho | Vitest sin globals: `cleanup()` explícito |

---

## Entregable

En el detalle de una tarea se elige de qué épica cuelga (o ninguna); en el de una subtarea, de
qué tarea. Al guardar, el Gantt y el Kanban se recalculan solos y el ítem conserva su `key`,
su tiempo registrado y sus commits enlazados.

## Criterio de aceptación

- `pnpm biome check` (ficheros tocados), `pnpm -r typecheck`, `pnpm -r test` en verde.
- Cambiar la épica de una tarea con subtareas mantiene las subtareas colgando de ella.
- El desplegable nunca ofrece el propio ítem ni un descendiente suyo.
- En una épica no aparece selector de padre.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | Plan creado | Fase 10 abierta. El backend ya validaba el reparentado; el trabajo es de UI + tests. |
| 2026-08-09 | 10.1–10.4 completadas | `lib/hierarchy.ts` compartido por alta y edición; selector de padre en `TaskDetail` (oculto en épicas, obligatorio en subtareas). Backend 157 tests ✅ (5 nuevos de reparentado), frontend 50 ✅ (12 nuevos), typecheck ✅. Sin cambios en el backend: la validación de proyecto/jerarquía/ciclos ya estaba. |
