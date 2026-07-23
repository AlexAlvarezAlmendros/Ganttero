# Ganttero — CLAUDE.md

App web **self-hosted, de un solo usuario**, para planificar proyectos y tareas con
**Kanban + Gantt multi-escala**, capturando tareas por **voz** (IA local: Whisper + Gemma 4)
y con **automatización Gantt→Kanban**. Todo corre en el homeserver; los datos persisten en el
NAS. El único componente que sale a la nube es la integración con **GitHub**.

Documentación: [funcional](docs/functional.md) · [arquitectura](docs/architecture.md) · [roadmap](docs/planning/ROADMAP.md).

> Principio rector del producto: **mínima fricción**. Si añadir o mover una tarea cuesta, la app ha fallado.

---

## Workflow de desarrollo — OBLIGATORIO

**Antes de escribir cualquier línea de código**, ejecuta siempre el skill `/ganttero-plan`:

1. Lee `docs/planning/ROADMAP.md` — si no existe, créalo.
2. Lee el plan de la fase correspondiente en `docs/planning/plans/` — si no existe, créalo.
3. Marca las tareas que vas a abordar como `🔄 En curso`.
4. Implementa el trabajo siguiendo las convenciones de este archivo.
5. Al terminar, marca las tareas como `✅ Hecho` y desbloquea las que quedan libres.
6. Reporta al usuario: qué se completó y cuáles son las siguientes tareas desbloqueadas.

Aplica a cualquier petición de desarrollo: feature, endpoint, componente, migración, test, refactor o spike.
El **Gantt manda**: el *cuándo* vive en el Gantt; el Kanban es una vista derivada, nunca una lista independiente.

---

## Estado del repositorio

Repo **greenfield**. La Fase 0 (spike de voz) es un prototipo aislado; el esqueleto de la app
(frontend + backend) se levanta en la Fase 1. Estructura objetivo:

```
frontend/            React + TypeScript + Vite (SPA: Kanban · Gantt · grabador)
backend/             Node + Fastify (API REST + automatización + orquestador de voz + cliente GitHub)
  src/
    modules/<x>/     x.routes.ts · x.service.ts · x.repo.ts · x.schema.ts
    config/env.ts    Variables de entorno (Zod)
    db/              Cliente libSQL + migraciones (up/down)
spike/               Fase 0: pipeline aislado audio → STT → Gemma → JSON
docs/                functional.md · architecture.md · planning/
.claude/             hooks/ + settings.json (validación de formato y calidad)
```

---

## Comandos esenciales

> Objetivo (se irán cableando conforme se levanten frontend/backend). Gestor: **pnpm**.

```bash
# Instalar
pnpm install

# Dev
pnpm --filter backend dev
pnpm --filter frontend dev

# Calidad (formato + lint) — Biome
pnpm biome check .
pnpm biome check --write .

# Typecheck
pnpm -r typecheck

# Tests (Vitest)
pnpm -r test
pnpm --filter backend test
pnpm --filter frontend test

# Base de datos (libSQL / sqld) — migraciones versionadas up/down
pnpm --filter backend db:migrate
```

---

## Stack y versiones fijas

```
Node.js       22 LTS
TypeScript    5.7+
React         19.x         (frontend SPA con Vite)
Fastify       5.x          (backend)
libSQL/sqld   local        ("Turso pero local"); fichero de DB en el NAS
Zod           validación de request/response y de la salida de la IA
Vitest        tests (no Jest)
Biome         lint + format (no ESLint, no Prettier)
pnpm          gestor de paquetes
IA voz        STT local (Whisper.cpp / faster-whisper) + Gemma 4 local
```

TypeScript siempre **estricto**: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` — no desactivar.

---

## Arquitectura backend — separación obligatoria

Cada módulo REST tiene exactamente 4 archivos:

```
módulo.routes.ts    → HTTP únicamente: parsing, validación, respuesta
módulo.service.ts   → Lógica de negocio: no sabe de HTTP ni de SQL
módulo.repo.ts      → libSQL únicamente: sin lógica de negocio
módulo.schema.ts    → Zod schemas de request/response
```

Las routes instancian el service; el service instancia (o recibe por DI) el repo.
`packages`/módulos nunca importan de las routes. Sin dependencias circulares.

Módulos previstos: `projects`, `items` (épica/tarea/subtarea auto-referenciados por `parent_id` + `type`),
`kanban` (derivado del Gantt), `timelog`, `voice` (audio→JSON), `github`.

---

## Convenciones TypeScript

- Variables de entorno: solo a través de `config/env.ts` (Zod), **nunca `process.env` directo**.
- Fechas/timestamps: **ISO-8601 en UTC** en la DB; el front convierte a local. No guardar fechas "naïve".
- Imports con extensión `.js` (NodeNext) en el backend.
- Validar y parsear con **Zod** antes de cualquier procesamiento — incluida la salida de la IA (structured output + reintento).
- IDs: `id` interno + `key` corto por proyecto (p. ej. `GP-42`) para las "smart commits".

## Convenciones frontend (React + TS)

- SPA con Vite. Estado: store de cliente (Zustand) + capa de datos servidor (TanStack Query) para caché/revalidación.
- Audio: `MediaRecorder` del navegador → sube el blob a la API; no bloquear la UI mientras transcribe.
- El Gantt es la pieza más cara: empezar con librería (`frappe-gantt` / `vis-timeline`) para validar UX; ir a medida solo si el multi-escala se queda corto (decisión abierta, Fase 3).
- Manejo de errores de la IA: si el JSON no es válido, **fallback a formulario manual** sin bloquear.

---

## Reglas de negocio clave (no romper)

- **El Gantt es la fuente de verdad del *cuándo*.** El Kanban se **deriva**: incluye ítems cuya `[start_date, end_date]` cruza `[hoy, hoy + kanban_window_days]` o que estén `in_progress`/`blocked`.
- **Prioridad derivada** (no se persiste salvo caché): `end_date < hoy` y no `done` → retrasada/urgente; empieza hoy/mañana → para ya; en ventana pero más tarde → normal; `blocked` → aparte.
- **Cronometraje automático:** al pasar a `in_progress` se abre un `time_log`; al pasar a `done` se cierra (duración). Reabrir suma un tramo nuevo; el total es la suma. Sin cronómetros manuales.
- `status`: `backlog` · `in_progress` · `blocked` · `done`.

---

## Seguridad — reglas no negociables

Modelo de amenaza reducido (un usuario, LAN), pero:

- El **personal access token de GitHub** vive **fuera del código y fuera de la DB en claro**: variable de entorno / fichero de secretos en el homeserver. Scope mínimo (solo lectura de repos si no se escribe).
- **Webhook de GitHub:** verificar la firma `X-Hub-Signature-256` con **`timingSafeEqual`**, nunca `===`. Alternativa sin exponer nada: **polling**.
- Nunca loggear tokens, seeds ni el fichero de la DB.
- No commitear secretos ni la base de datos: `.env`, `*.db`, `*.sqlite`, ficheros libSQL locales van al `.gitignore` (el hook `guard-secrets` lo bloquea).
- No exponer sqld/STT/Gemma fuera del host; confían en la LAN.

---

## Testing

- **Backend (Vitest):** tests de service con mocks de repo y de la IA/GitHub; tests de routes con `inject()` de Fastify (sin servidor real). Sin tests de repo (testarían libSQL, no nuestro código).
- **Frontend (Vitest + Testing Library):** tests de hooks con `renderHook` + wrapper con providers mockeados. No testear componentes de librería; testear nuestros hooks y lógica.
- **Automatización Gantt→Kanban:** tests de la lógica de ventana/prioridad con "hoy" inyectable (nunca `new Date()` sin inyección) — es el pilar del producto.

---

## Hooks (`.claude/hooks/`)

Cableados en `.claude/settings.json`. Validan formato y calidad automáticamente:

- **`format-quality.py`** (PostToolUse Write|Edit): pasa Biome (`check --write`) sobre el fichero TS/JS editado y recuerda typecheck/tests si toca. No bloquea.
- **`guard-secrets.py`** (PreToolUse Bash): bloquea `git add`/`commit` de `.env`, `*.db`, `*.sqlite` y ficheros libSQL.
- **`no-ai-attribution.py`** (PreToolUse Bash): bloquea commits/PRs con atribución a la IA (regla global del usuario: commits y PRs limpios).
