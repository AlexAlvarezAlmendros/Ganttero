# Plan 03 — Gantt multi-escala

> Fase: 3 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-23 | Cerrado: 2026-07-23
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
| 3.1 | Decisión: librería (`frappe-gantt`/`vis-timeline`) vs. a medida — registrar en el roadmap | ✅ Hecho | **A medida**: el design system manda; registrada en el roadmap |
| 3.2 | Vista Gantt con barras épica (contenedora)/tarea/subtarea | ✅ Hecho | Épica lime contenedora, tarea 8px, subtarea 6px; línea HOY |
| 3.3 | Control de zoom año → medio año → mes → semana → día con agrupación/expansión por escala | ✅ Hecho | 5 escalas; año=épicas, 6m=+tareas, mes/semana/día=+subtareas |
| 3.4 | Editar fechas arrastrando barras (deseable, no bloqueante) | ✅ Hecho | Pointer events, cuantizado a días, PATCH start+end |

---

## Entregable

Vista Gantt navegable con zoom en 5 escalas donde la jerarquía se agrupa/expande según la escala elegida.

## Criterio de aceptación

Un proyecto con épicas, tareas y subtareas se lee con sentido tanto a escala año (visión global agrupada) como a escala día (detalle), sin ahogar en detalle las escalas amplias.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | 3.1–3.4 | `lib/gantt.ts`: lógica pura (rangos por escala con "hoy" inyectado, posicionamiento %, agrupación por escala, filas jerárquicas ordenadas) con 16 tests UTC. `GanttView.tsx`: tabs de zoom /01–/05, cabecera de marcas por escala, barras (épica contenedora lime, tarea coloreada por estado, subtarea fina), línea HOY discontinua, filas sin fechas señaladas, y arrastre de barras cuantizado a días que hace PATCH de start+end. Cableado en App con el detalle de tarea compartido. |
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 2. |
