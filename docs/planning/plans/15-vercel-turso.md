# Plan 15 — Despliegue en Vercel con Turso (sin perder el self-hosted)

> Fase: 15 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: el mismo repo se despliega en el homeserver (Docker + NAS) o en Vercel con una base de datos Turso, y cada despliegue anuncia lo que sabe hacer.

---

## Dependencia con otras fases

- **Requiere:** Fase 7 (despliegue self-hosted ✅), Fase 9 (auth ✅), Fase 14 (MCP ✅).
- **Habilita:** usar Ganttero fuera de la LAN sin montar VPN, y tener un entorno de pruebas público.

---

## Contexto y decisiones

El self-hosted no se toca: sigue siendo el despliegue de referencia. Vercel se
añade **al lado**, con Turso como base de datos gestionada.

- **Vercel detecta un servidor Fastify que llama a `listen()`** (doc oficial:
  «Call server.listen() to enable detection; the port is only used for local
  development»). Es decir, `backend/src/index.ts` ya tenía la forma correcta:
  **no hace falta reescribirlo como handler serverless** ni añadir `api/`.
  El `vercel.json` con `services` (frontend Vite + backend Fastify) y el rewrite
  que recorta `/api` reproduce el mismo contrato que el nginx del homeserver.
- **Turso = `libsql://` + token.** `createDbClient` acepta `authToken` y
  `loadEnv` **falla al arrancar** si la URL es de Turso y falta el token: sin
  eso el cliente conecta y revienta en la primera consulta, ya desplegado.
- **Las capacidades se anuncian, no se adivinan.** `GET /capabilities` dice qué
  tiene este despliegue (voz, describer, github, polling, mcp) y la UI esconde
  lo que no hay. Alternativa descartada: dejar que el micro falle con un 404.
- **La voz no viaja.** Depende de Python (faster-whisper) y ffmpeg; en
  serverless no existen. `VOICE_ENABLED=false` desregistra el módulo entero, así
  que la ruta ni se publica.
- **Migraciones tolerantes a carreras.** En serverless cada instancia migra al
  bootear y dos arranques simultáneos competían por la misma migración: la
  perdedora crasheaba. Ahora, si al fallar resulta que otra ya la aplicó, se
  sigue; cualquier otro error sí sube. Beneficia también al self-hosted.
- **El polling de smart commits queda fuera** (no hay proceso vivo entre
  peticiones). Se documenta como limitación y se refleja en `/capabilities`;
  la vía natural sería un Vercel Cron contra un endpoint de escaneo.

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 15.1 | `createDbClient(url, authToken?)` para Turso | ✅ Hecho | `file:`/`ws:` sin cambios |
| 15.2 | `env.ts`: `DATABASE_AUTH_TOKEN`, `VOICE_ENABLED` y regla cruzada Turso→token | ✅ Hecho | El error no filtra valores |
| 15.3 | `GET /capabilities`: qué ofrece este despliegue | ✅ Hecho | Refleja lo que `buildApp` cableó |
| 15.4 | `index.ts`: pasa el token y solo registra la voz si `VOICE_ENABLED` | ✅ Hecho | Log explícito al desactivarla |
| 15.5 | Migraciones tolerantes a arranques concurrentes | ✅ Hecho | Un fallo real sigue subiendo |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 15.6 | `api/capabilities.ts` + esconder el micro (TopBar y botón GRABAR del alta) | ✅ Hecho | Mientras carga asume lo mínimo |

### Configuración y documentación

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 15.7 | `vercel.json` en la raíz (servicios + rewrites + recorte de `/api`) | ✅ Hecho | Rescatado de `chore/vercel-json` |
| 15.8 | `docs/deploy-vercel.md`, README, `.env.example`, `docs/architecture.md` | ✅ Hecho | Tabla de qué funciona y qué no |
| 15.9 | Tests: env (Turso/voz), `/capabilities`, carrera de migraciones | ✅ Hecho | 11 nuevos |

---

## Entregable

Importas el repo en Vercel, pones `DATABASE_URL`/`DATABASE_AUTH_TOKEN` de Turso,
las tres de auth con `AUTH_COOKIE_SECURE=true`, `VOICE_ENABLED=false` y
`GITHUB_POLL_SECONDS=0`, y tienes Ganttero en HTTPS con Kanban, Gantt, backlog,
cronometraje, login y MCP. El homeserver sigue funcionando exactamente igual.

## Criterio de aceptación

- `pnpm -r typecheck`, `pnpm -r test` y el build de frontend en verde.
- Turso sin token: el backend no arranca y dice qué falta, sin volcar el valor.
- Con `VOICE_ENABLED=false`: `/voice` devuelve 404 y `/capabilities` marca `voice:false`.
- El self-hosted no cambia de comportamiento (mismos defaults).

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | 15.1–15.9 completadas | Confirmado con la doc de Vercel (vía su MCP) que un Fastify con `listen()` se detecta solo: no hubo que reescribir el arranque. Backend 198 tests ✅ (11 nuevos), frontend 98 ✅, build ✅. Verificado arrancando el backend con el perfil de Vercel (`/capabilities` → `voice:false`, `/voice` → 404) y que Turso sin token aborta el arranque. **Sin probar contra Vercel/Turso reales**: falta el primer deploy. |
