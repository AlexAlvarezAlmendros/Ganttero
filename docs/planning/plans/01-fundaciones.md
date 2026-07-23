# Plan 01 — Fundaciones (datos + API + esqueleto)

> Fase: 1 de 7 | Estado: 🔒 Bloqueado (gate Fase 0) | Iniciado: —
> Hito del roadmap: CRUD de proyectos/tareas persistido en el NAS.

Levanta el esqueleto real de la app: monorepo pnpm, backend Fastify con libSQL y migraciones, módulos `projects` e `items`, y el shell del frontend React.

---

## Dependencia con otras fases

- **Requiere:** Fase 0 con decisión **GO** (o decisión explícita del usuario de seguir sin voz).
- **Habilita:** Fase 2 (Kanban + cronometraje) y, indirectamente, todo lo demás.

---

## Tareas

### Infraestructura

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.1 | Scaffold monorepo pnpm (frontend Vite+React19+TS, backend Fastify) + Biome + Vitest + tsconfig estricto | ⬜ Listo | `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` |
| 1.2 | `backend/src/config/env.ts` — esquema Zod de todas las env vars | 🔒 Bloqueado | Necesita 1.1 |
| 1.3 | Cliente libSQL/sqld + runner de migraciones versionadas (up/down), fichero en el NAS | 🔒 Bloqueado | Necesita 1.1 |
| 1.4 | Migración inicial: `project`, `item` (parent_id + type), `time_log`, `github_link`, `settings`, `dependency` | 🔒 Bloqueado | Necesita 1.3 |

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.5 | Módulo `projects`: routes + service + repo + schema (CRUD) | 🔒 Bloqueado | Necesita 1.2, 1.4 |
| 1.6 | Módulo `items`: CRUD jerárquico épica/tarea/subtarea + `key` corto (GP-42) | 🔒 Bloqueado | Necesita 1.4, 1.5 |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.7 | Esqueleto React (routing, layout, cliente API con TanStack Query) | 🔒 Bloqueado | Necesita 1.1 |

### Calidad

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.8 | Tests: service con mocks de repo + routes con `inject()` de Fastify | 🔒 Bloqueado | Necesita 1.5, 1.6 |

---

## Entregable

API REST con CRUD de proyectos e ítems jerárquicos persistidos en libSQL (fichero en el NAS) y un frontend que arranca y consume la API.

## Criterio de aceptación

Se puede crear un proyecto y una jerarquía épica→tarea→subtarea vía API, sobrevive a un reinicio del backend, y `pnpm -r test` + `pnpm -r typecheck` pasan.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por el gate GO/NO-GO de la Fase 0. |
