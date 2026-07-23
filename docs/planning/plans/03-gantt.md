# Plan 03 — Gantt multi-escala

> Fase: 3 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
> Hito del roadmap: una jerarquía épica/tarea/subtarea se ve coherente en las 5 escalas.

La pieza de UX más cara del producto. Estrategia: empezar con librería para validar la experiencia; ir a render a medida (SVG/canvas) solo si el multi-escala se queda corto.

---

## Dependencia con otras fases

- **Requiere:** Fase 2 (los ítems ya se ven y mueven en el Kanban).
- **Habilita:** Fase 4 (la automatización necesita las fechas del Gantt como fuente de verdad).

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 3.1 | Decisión: librería (`frappe-gantt`/`vis-timeline`) vs. a medida — registrar en el roadmap | 🔒 Bloqueado | Necesita 2.1. Decisión abierta de architecture.md §8 |
| 3.2 | Vista Gantt con barras épica (contenedora)/tarea/subtarea | 🔒 Bloqueado | Necesita 3.1 |
| 3.3 | Control de zoom año → medio año → mes → semana → día con agrupación/expansión por escala | 🔒 Bloqueado | Necesita 3.2 |
| 3.4 | Editar fechas arrastrando barras (deseable, no bloqueante) | 🔒 Bloqueado | Necesita 3.3 |

---

## Entregable

Vista Gantt navegable con zoom en 5 escalas donde la jerarquía se agrupa/expande según la escala elegida.

## Criterio de aceptación

Un proyecto con épicas, tareas y subtareas se lee con sentido tanto a escala año (visión global agrupada) como a escala día (detalle), sin ahogar en detalle las escalas amplias.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 2. |
