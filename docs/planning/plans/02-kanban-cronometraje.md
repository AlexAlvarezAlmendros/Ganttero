# Plan 02 — Kanban + cronometraje

> Fase: 2 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
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
| 2.1 | Tablero Kanban (columnas backlog/in_progress/blocked/done) + drag & drop | 🔒 Bloqueado | Necesita 1.6, 1.7 |
| 2.2 | Cronometraje automático: abrir `time_log` al pasar a `in_progress`, cerrar al pasar a `done` (suma de tramos) | 🔒 Bloqueado | Necesita 1.4, 2.1. Reabrir suma un tramo nuevo |
| 2.3 | Tests de la lógica de cronometraje con "hoy" inyectable | 🔒 Bloqueado | Necesita 2.2. Nunca `new Date()` sin inyección |

---

## Entregable

Kanban usable con drag & drop entre estados; cada tránsito `in_progress`→`done` deja un `time_log` cerrado y el total por tarea es la suma de tramos.

## Criterio de aceptación

Mover una tarea a "En curso" y luego a "Hecha" registra la duración sin ninguna acción manual; los tests de tramos (abrir/cerrar/reabrir) pasan con fecha inyectada.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 1. |
