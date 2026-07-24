# Plan 04 — Automatización Gantt → Kanban (pilar)

> Fase: 4 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-23 | Cerrado: 2026-07-23
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
| 4.1 | Motor de ventana: incluir ítems cuya `[start,end]` cruza `[hoy, hoy+kanban_window_days]` o `in_progress`/`blocked` | ✅ Hecho | + regla extra deliberada: las VENCIDAS sin hacer nunca salen del tablero |
| 4.2 | Prioridad derivada (retrasada/para ya/normal/bloqueada) con "hoy" inyectable | ✅ Hecho | `derivePriority` pura; nada persistido; orden por urgencia y deadline |
| 4.3 | Recálculo al cambiar el día (job ligero) + en cada request de Kanban | ✅ Hecho | Derivación pura POR REQUEST → el job es innecesario (nada persistido); el front revalida cada 60 s y al enfocar |
| 4.4 | Tests exhaustivos de ventana/prioridad (es el pilar del producto) | ✅ Hecho | 24 unit de bordes + 5 e2e (hito, cambio de día, ventana configurable) + workflow de verificación adversaria |

---

## Entregable

Kanban 100 % derivado: cambiar fechas en el Gantt reordena/añade/quita tarjetas y prioridades sin intervención manual.

## Criterio de aceptación

Mover la fecha de una tarea dentro/fuera de la ventana la hace aparecer/desaparecer del Kanban con la prioridad correcta; la batería de tests de ventana/prioridad con "hoy" inyectado cubre todos los bordes y pasa.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-24 | 4.4 | **Verificación adversaria (workflow, 4 lentes × 2 refutadores):** confirmó y se corrigieron 4 hallazgos — (1) «hoy» se derivaba en día UTC: entre las 00:00 y las 02:00 hora española el tablero razonaba con el día de ayer → `localDayIso()` (día local del servidor/navegador) en backend y frontend; (2) el orden en columna usaba `end_date` crudo en vez del deadline efectivo (una late solo-con-start ordenaba la última); (3) el «hoy» del frontend estaba congelado con `useMemo([])` para toda la vida de la pestaña → estado + tick por minuto y al enfocar; (4) una épica podía ponerse en curso y abrir un cronómetro invisible → las épicas no cronometran. Refutados como teóricos: atomicidad del gancho y carrera TOCTOU (mono-usuario, mono-proceso). 4 tests de regresión. |
| 2026-07-23 | 4.1–4.4 | Módulo `kanban` (motor puro `deriveBoard`/`derivePriority`/`isInWindow`/`isOverdue` exportado para tests + `KanbanService` con reloj inyectado) y módulo `settings` (ventana configurable 1–60 días). Regla añadida sobre el kit (divergencia deliberada): un ítem VENCIDO sin hacer entra siempre como `late` — una tarea retrasada jamás desaparece del tablero. Decisión 4.3: sin job — derivación pura por request (nada persistido) + revalidación del front (60 s y al enfocar). Frontend: el tablero consume `/projects/:id/kanban` (prioridad y orden del servidor), Ajustes controla la ventana real y la cabecera la muestra. Verificación adversaria por workflow multi-agente sobre el motor. |
| 2026-07-23 | — | Plan creado. Bloqueado por las Fases 2 y 3. |
