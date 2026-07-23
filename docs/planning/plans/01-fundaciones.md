# Plan 01 — Fundaciones (datos + API + esqueleto)

> Fase: 1 de 7 | Estado: 🔄 En curso | Iniciado: 2026-07-23
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
| 1.1 | Scaffold monorepo pnpm (frontend Vite+React19+TS, backend Fastify) + Biome + Vitest + tsconfig estricto | ✅ Hecho | Workspace `frontend`+`backend` (spike fuera a propósito) |
| 1.2 | `backend/src/config/env.ts` — esquema Zod de todas las env vars | ✅ Hecho | `loadEnv(source)` inyectable + `.env.example` |
| 1.3 | Cliente libSQL/sqld + runner de migraciones versionadas (up/down), fichero en el NAS | ✅ Hecho | Runner propio + CLI `db:migrate`/`db:rollback`; URL inyectada desde env |
| 1.4 | Migración inicial: `project`, `item` (parent_id + type), `time_log`, `github_link`, `settings`, `dependency` | ✅ Hecho | `001-modelo-inicial` con CHECKs, cascadas y seed de settings |

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.5 | Módulo `projects`: routes + service + repo + schema (CRUD) | ⬜ Listo | 1.2 y 1.4 hechas |
| 1.6 | Módulo `items`: CRUD jerárquico épica/tarea/subtarea + `key` corto (GP-42) | 🔒 Bloqueado | Necesita 1.4, 1.5 |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.7 | Esqueleto React (routing, layout, cliente API con TanStack Query) | ⬜ Listo | 1.1 hecha |

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
| 2026-07-23 | — | **Gate abierto: GO de la Fase 0.** La 1.1 (scaffold) queda lista para empezar. |
| 2026-07-23 | 1.3 | Cliente libSQL (`createDbClient(url)`, sin leer entorno) + runner de migraciones up/down con tabla `schema_migrations` (validación de ids, idempotente, `now` inyectable, timestamps ISO UTC) + CLI `db:migrate`/`db:rollback`. 5 tests con DB `:memory:`. La migración inicial del modelo va en la 1.4. |
| 2026-07-23 | 1.4 | Migración `001-modelo-inicial`: `project` (con `key_prefix` único), `item` auto-referenciada con CHECKs de dominio (type/status), fechas ISO con `CHECK start<=end`, `UNIQUE(project_id, key_number)` para las claves GP-42, índices para el motor de ventana; `time_log`, `github_link`, `settings` (fila única, ventana 14 días) y `dependency` (sin auto-dependencia). `createDbClient` pasa a async para activar `PRAGMA foreign_keys` por conexión (cascadas). 7 tests del modelo. Nota: la 1.3 se recuperó vía cherry-pick — la PR #3 se mergeó sobre la rama de la #2 después de que la #2 llegara a main. |
| 2026-07-23 | 1.3 | Cliente libSQL (`createDbClient(url)`, sin leer entorno) + runner de migraciones up/down con tabla `schema_migrations` (validación de ids, idempotente, `now` inyectable, timestamps ISO UTC) + CLI `db:migrate`/`db:rollback`. 5 tests con DB `:memory:`. |
| 2026-07-23 | 1.2 | `config/env.ts`: esquema Zod con defaults (NODE_ENV, HOST, PORT, DATABASE_URL, OLLAMA_BASE_URL/MODEL, GITHUB_TOKEN opcional), `loadEnv(source)` inyectable para tests, errores sin volcar valores (no filtra secretos), `.env.example` documentado e `index.ts` cableado (fuera el puerto fijo). 6 tests. |
| 2026-07-23 | 1.1 | Scaffold del monorepo: workspace pnpm (`frontend` + `backend`; el spike queda fuera con su propio lockfile), `tsconfig.base.json` estricto compartido, Biome en la raíz (`pnpm check`), Vitest en ambos paquetes. Backend: Fastify 5 con `buildApp()` + `GET /health` + test con `inject()`; puerto fijo hasta la 1.2. Frontend: Vite + React 19 con proxy `/api` → :3000. Verificado: Biome limpio, typecheck y tests en verde, `/health` responde en dev y `vite build` construye. |
