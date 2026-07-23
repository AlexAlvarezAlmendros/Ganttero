# Plan 04 — Automatización Gantt → Kanban (pilar)

> Fase: 4 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
> Hito del roadmap: al cambiar una fecha del Gantt, el Kanban se recalcula solo.

El pilar del producto: el Gantt es la fuente de verdad del *cuándo* y el Kanban es una vista derivada. Nada de listas independientes ni arrastre manual de tareas al tablero.

---

## Dependencia con otras fases

- **Requiere:** Fase 2 (Kanban) y Fase 3 (Gantt con fechas fiables).
- **Habilita:** Fase 5 (voz) y Fase 6 (GitHub).

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 4.1 | Motor de ventana: incluir ítems cuya `[start,end]` cruza `[hoy, hoy+kanban_window_days]` o `in_progress`/`blocked` | 🔒 Bloqueado | Necesita 2.1, 3.3 |
| 4.2 | Prioridad derivada (retrasada/para ya/normal/bloqueada) con "hoy" inyectable | 🔒 Bloqueado | Necesita 4.1. No se persiste salvo caché |
| 4.3 | Recálculo al cambiar el día (job ligero) + en cada request de Kanban | 🔒 Bloqueado | Necesita 4.2 |
| 4.4 | Tests exhaustivos de ventana/prioridad (es el pilar del producto) | 🔒 Bloqueado | Necesita 4.2. Bordes: hoy, mañana, fin<hoy, blocked |

---

## Entregable

Kanban 100 % derivado: cambiar fechas en el Gantt reordena/añade/quita tarjetas y prioridades sin intervención manual.

## Criterio de aceptación

Mover la fecha de una tarea dentro/fuera de la ventana la hace aparecer/desaparecer del Kanban con la prioridad correcta; la batería de tests de ventana/prioridad con "hoy" inyectado cubre todos los bordes y pasa.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por las Fases 2 y 3. |
