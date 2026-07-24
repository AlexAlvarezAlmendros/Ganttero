# Plan 06 — Integración GitHub

> Fase: 6 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-24 | Cerrado: 2026-07-24
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
| 6.1 | Módulo `github`: enlazar repos a proyecto, token seguro (env/secretos) | ✅ Hecho | Token solo en env; los errores del cliente no reflejan cuerpos |
| 6.2 | Lectura: ramas, commits, issues, PRs junto a las tareas | ✅ Hecho | GET /projects/:id/github/activity agregado por repo |
| 6.3 | Smart commits `GP-<id>` (webhook con firma `timingSafeEqual`, o polling — decidir y registrar) | ✅ Hecho | **POLLING** (decisión registrada): nada de la LAN se expone; «fixes GP-42» cierra la tarea |
| 6.4 | (Opcional) hitos de código (merge/tag) como marcas en el Gantt | ❌ Cancelado | Fuera del alcance v1: los commits ya se ven en el detalle de la tarea |

---

## Entregable

Proyectos enlazados a sus repos: actividad del repo visible junto a las tareas y smart commits que actualizan la tarea citada.

## Criterio de aceptación

Un commit real con `GP-42` en el mensaje enlaza/actualiza la tarea GP-42 sin tocar la app; el token nunca aparece en logs ni en la DB en claro.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-24 | 6.1–6.3 | Módulo `github`: cliente fetch mínimo (token solo por env, cabecera Bearer, errores sin reflejar cuerpos), enlaces repo↔proyecto (409 en duplicado), actividad agregada (ramas/commits/issues/PRs), y **smart commits por POLLING** (decisión registrada en el roadmap; intervalo `GITHUB_POLL_SECONDS`, 0=off, + POST /github/scan manual): `GP-42` enlaza el commit (tabla `item_commit`, migración 003, dedupe por UNIQUE) y «fixes/closes/cierra/resuelve GP-42» además la cierra PASANDO por ItemsService (dispara el cronometraje). Idempotente: reescanear no re-cierra. Un repo caído no tumba el escaneo. Frontend: repo en el diálogo de proyecto (enlaza/desenlaza al guardar), `owner/repo ↗` en la cabecera, commits reales en el detalle de la tarea y estado del token en Ajustes. 7 tests nuevos. 6.4 cancelada (v1). |
| 2026-07-23 | — | Plan creado. Bloqueado por la Fase 1. |
