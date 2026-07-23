# Plan 06 — Integración GitHub

> Fase: 6 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
> Hito del roadmap: un commit con `GP-<id>` se refleja en la tarea.

Único componente que sale a la nube. Token con scope mínimo fuera del código y de la DB; webhook con firma verificada (`timingSafeEqual`) o polling sin exponer nada — decisión a registrar aquí.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (módulo `projects`); Fase 4 para los hitos en el Gantt (6.4).
- **Habilita:** Fase 7 (despliegue final).

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 6.1 | Módulo `github`: enlazar repos a proyecto, token seguro (env/secretos) | 🔒 Bloqueado | Necesita 1.5. Scope mínimo, nunca loggear el token |
| 6.2 | Lectura: ramas, commits, issues, PRs junto a las tareas | 🔒 Bloqueado | Necesita 6.1 |
| 6.3 | Smart commits `GP-<id>` (webhook con firma `timingSafeEqual`, o polling — decidir y registrar) | 🔒 Bloqueado | Necesita 6.1 |
| 6.4 | (Opcional) hitos de código (merge/tag) como marcas en el Gantt | 🔒 Bloqueado | Necesita 6.3, 3.3 |

---

## Entregable

Proyectos enlazados a sus repos: actividad del repo visible junto a las tareas y smart commits que actualizan la tarea citada.

## Criterio de aceptación

Un commit real con `GP-42` en el mensaje enlaza/actualiza la tarea GP-42 sin tocar la app; el token nunca aparece en logs ni en la DB en claro.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 1. |
