# Despliegue en Vercel (con Turso)

Ganttero se puede desplegar de dos formas, y **ambas siguen soportadas**:

| | Self-hosted (homeserver) | Vercel + Turso |
|---|---|---|
| Dónde vive | Docker en tu máquina, LAN | Nube, HTTPS público |
| Base de datos | libSQL en fichero (NAS) o `sqld` | **Turso** (`libsql://`) |
| Kanban · Gantt · Backlog · Timelog | ✅ | ✅ |
| Login, MCP para agentes | ✅ | ✅ |
| **Captura por voz** | ✅ | ❌ — necesita Python, ffmpeg y Ollama |
| **"Mejorar formato" (IA)** | ✅ | ⚠️ solo con un Ollama accesible por HTTPS |
| **Smart commits (polling)** | ✅ | ❌ — no hay proceso vivo entre peticiones |

Lo que no está disponible **no falla al pulsarlo**: el backend publica
`GET /capabilities` y la UI esconde lo que no hay (el micro, por ejemplo).

Guía del homeserver: [deploy.md](deploy.md).

---

## 1. Crear la base de datos en Turso

```bash
turso db create ganttero
turso db show ganttero --url          # libsql://ganttero-<org>.turso.io
turso db tokens create ganttero       # el token de auth
```

No hay que crear tablas a mano: **el backend migra al arrancar**, igual que en
el homeserver. El runner tolera que dos instancias arranquen a la vez y compitan
por la misma migración.

## 2. Importar el repo en Vercel

El `vercel.json` de la raíz ya declara los dos servicios y su enrutado:

- `frontend/` (Vite) sirve la SPA en `/`
- `backend/` (Fastify) atiende `/api/*`, y Vercel le recorta el prefijo `/api`
  antes de pasárselo — el mismo contrato que el nginx del self-hosted

No hace falta tocar la configuración del proyecto en Vercel.

## 3. Variables de entorno

En **Project Settings → Environment Variables**:

| Variable | Valor | Por qué |
|---|---|---|
| `DATABASE_URL` | `libsql://ganttero-<org>.turso.io` | Turso |
| `DATABASE_AUTH_TOKEN` | el token del paso 1 | Turso lo exige; sin él el backend **no arranca** |
| `NODE_ENV` | `production` | Obliga a que exista el login |
| `AUTH_USERNAME` | tu usuario | |
| `AUTH_PASSWORD_HASH` | `pnpm --filter backend auth:hash` | Nunca la contraseña en claro |
| `AUTH_SECRET` | `openssl rand -hex 32` | Firma la sesión |
| `AUTH_COOKIE_SECURE` | `true` | **En Vercel todo es HTTPS**: en `false` la cookie viaja sin protección |
| `VOICE_ENABLED` | `false` | No hay Python ni ffmpeg; la UI esconde el micro |
| `GITHUB_POLL_SECONDS` | `0` | No hay proceso vivo que haga polling |
| `MCP_TOKEN` | `openssl rand -hex 32` *(opcional)* | Habilita el MCP para agentes |

> ⚠️ `AUTH_COOKIE_SECURE=true` es lo contrario que en la LAN. En el homeserver
> va en `false` (HTTP) y aquí en `true`; con el valor equivocado, o el navegador
> tira la cookie (y no puedes entrar) o la manda en claro.

Deja fuera `STT_*`, `AUDIO_DIR` y `GITHUB_TOKEN` salvo que sepas que los quieres:
sus valores por defecto no molestan con la voz y el polling apagados.

## 4. Desplegar y comprobar

```bash
curl https://<tu-app>.vercel.app/api/health
# {"status":"ok","db":"ok"}

curl https://<tu-app>.vercel.app/api/capabilities
# {"voice":false,"describer":true,"github":true,"github_polling":false,"mcp":true}
```

Si `db` no sale `ok`, casi siempre es el par `DATABASE_URL`/`DATABASE_AUTH_TOKEN`.

### MCP desde Vercel

Igual que en el homeserver, pero con la URL pública:

```bash
claude mcp add --transport http ganttero https://<tu-app>.vercel.app/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

---

## Si algo falla

| Síntoma | Causa |
|---|---|
| `Project framework is set to "services", but no services are declared` | El **Root Directory** del proyecto apunta a una subcarpeta. `vercel.json` está en la raíz del repo: deja el Root Directory vacío. Ojo con la sugerencia de importación de Vercel, que propone un proyecto por carpeta. |
| `Invalid export found in module ".../app.mjs" — The default export must be a function or server` | Vercel busca el entrypoint del backend en los nombres `app`, `index` y `server` (raíz o `src/`). Por eso la fábrica se llama **`build-app.ts`** y no `app.ts`: el entrypoint es `src/index.ts`, el único que llama a `listen()`. **No renombres `build-app.ts`.** |
| El login no persiste | `AUTH_COOKIE_SECURE` debe ser `true` en Vercel (HTTPS). |
| El backend no arranca | Revisa los logs de runtime: casi siempre falta alguna `AUTH_*` con `NODE_ENV=production`, o el par `DATABASE_URL`/`DATABASE_AUTH_TOKEN`. |

> **Un solo proyecto de Vercel, no dos.** La sesión es una cookie `HttpOnly` y el
> frontend llama a `/api` en el mismo origen. Separar frontend y backend en dos
> proyectos los pone en dominios distintos y rompe el login: haría falta
> `SameSite=None`, CORS con credenciales y una URL absoluta en el cliente.

## Notas y limitaciones

- **La voz no se puede portar tal cual.** Depende de un binario de Python
  (faster-whisper) y de ffmpeg. Si la quieres en la nube habría que sacarla a
  un servicio aparte; hoy es la razón principal para seguir en el homeserver.
- **"Mejorar formato"** llama a Ollama. Desde Vercel solo funciona si expones
  tu Ollama por HTTPS (`OLLAMA_BASE_URL`) — piénsalo dos veces antes de abrirlo.
  Sin él, el endpoint responde 422 y la UI conserva el texto original.
- **Smart commits**: el polling vive en un `setInterval` del proceso, que en
  serverless no existe. La vía natural sería un Vercel Cron pegándole a un
  endpoint de escaneo; no está hecho.
- **Datos**: Turso y el fichero del NAS son bases de datos distintas. Migrar de
  una a otra es volcar y restaurar; no se sincronizan.
