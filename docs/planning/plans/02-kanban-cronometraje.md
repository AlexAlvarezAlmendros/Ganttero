# Plan 02 — Kanban + cronometraje

> Fase: 2 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-23 | Cerrado: 2026-07-23
> Hito del roadmap: mover a "Hecha" registra el tiempo en curso sin acción manual.

Primer valor visible: tablero Kanban con drag & drop y cronometraje automático ligado a los cambios de estado.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (módulo `items` + esqueleto React).
- **Habilita:** Fase 3 (Gantt) y Fase 4 (automatización, que deriva este Kanban).

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 2.1 | Tablero Kanban (columnas backlog/in_progress/blocked/done) + drag & drop | ✅ Hecho | DnD nativo; tarjetas TaskCard del DS; épicas fuera del tablero |
| 2.2 | Cronometraje automático: abrir `time_log` al pasar a `in_progress`, cerrar al pasar a `done` (suma de tramos) | ✅ Hecho | Módulo `timelog` + gancho onStatusChange; salir de in_progress (done O blocked) cierra tramo |
| 2.3 | Tests de la lógica de cronometraje con "hoy" inyectable | ✅ Hecho | 7 unit (reloj fijo) + 5 e2e vía PATCH con reloj mutable |

---

## Entregable

Kanban usable con drag & drop entre estados; cada tránsito `in_progress`→`done` deja un `time_log` cerrado y el total por tarea es la suma de tramos.

## Criterio de aceptación

Mover una tarea a "En curso" y luego a "Hecha" registra la duración sin ninguna acción manual; los tests de tramos (abrir/cerrar/reabrir) pasan con fecha inyectada.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | 2.1–2.3 | Backend: módulo `timelog` (repo/service/routes) con la regla «entrar en in_progress abre tramo, salir lo cierra» (blocked también cierra: el bloqueo no es trabajo), resumen con tramo abierto sumado hasta "ahora", reloj siempre inyectado. Frontend: 8 componentes más del DS portados (TaskCard, KeyChip, Tag, Dialog, Tabs, Input, Select, Switch), tablero con drag & drop nativo, selector/diálogos de proyecto del kit, detalle de tarea con estado↔time_log y toasts, alta manual de ítems (la voz de la Fase 5 pre-rellenará este formulario). Fix: `createDbClient` crea el directorio del fichero (error 14 de SQLite). Smoke e2e real: proyecto→tarea→in_progress→done→time_log con duración. |
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 1. |
