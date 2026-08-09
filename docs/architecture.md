---
tipo: doc
estado: validando
creado: 2026-07-22
tags: [proyecto, ganttpersonal, arquitectura]
---

# GanttPersonal — Arquitectura (Documento técnico)

> v0.1 · 2026 · Interno · App self-hosted de planificación personal

Planificación viva en [ROADMAP.md](./planning/ROADMAP.md) · Documentación funcional: [functional.md](./functional.md).

---

## 1. Objetivo y alcance

App web **self-hosted, de un solo usuario**, para planificar proyectos y tareas con **Kanban + Gantt multi-escala**, capturando tareas por **voz** (IA local) y con **automatización Gantt→Kanban**. Todo corre en el homeserver; los datos persisten en el NAS. El único componente que sale a la nube es la integración con **GitHub**.

**En alcance:** jerarquía Proyecto→Épica→Tarea→Subtarea, Kanban, Gantt con zoom año→día, captura por voz, priorización y cronometraje automáticos, vinculación a repos de GitHub.

**Fuera de alcance:** multi-usuario, permisos, multi-tenant, cuentas, app móvil nativa, cualquier SaaS/monetización.

---

## 2. Arquitectura de alto nivel

Monolito modular pragmático: un único backend que sirve la API y orquesta IA y datos; un frontend SPA; servicios locales (STT, Gemma, sqld) accesibles en la red del homeserver.

```
┌─────────────────────────────────────────────────────────┐
│  Navegador (LAN)                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Frontend SPA — React + TypeScript                │  │
│  │  Kanban · Gantt multi-escala · Grabador de audio  │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────┘
                │ HTTP/JSON (REST)
┌───────────────▼─────────────────────────────────────────┐
│  Homeserver                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Backend/API — Node + Fastify                     │  │
│  │  ├─ Módulos REST (proyectos, tareas, …)           │  │
│  │  ├─ Motor de automatización (Gantt→Kanban)        │  │
│  │  ├─ Orquestador de voz (audio→JSON)               │  │
│  │  ├─ Cliente GitHub (API + webhook/polling)        │  │
│  │  └─ Servidor MCP (agentes de IA, bearer propio)   │  │
│  └────────┬──────────────┬───────────────┬───────────┘  │
│           │              │               │              │
│    ┌──────▼─────┐  ┌─────▼──────┐  ┌─────▼──────────┐   │
│    │  STT local │  │  Gemma 4   │  │  sqld (libSQL) │   │
│    │  (Whisper) │  │  (local)   │  │  fichero →NAS  │   │
│    └────────────┘  └────────────┘  └──────┬─────────┘   │
└───────────────────────────────────────────┼────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │  NAS (local)        │
                                  │  DB libSQL + audios │
                                  │  + backups          │
                                  └─────────────────────┘
                    ▲
                    │ HTTPS (API GitHub · token / webhook)
             ┌──────┴──────┐
             │   GitHub    │  (único punto en la nube)
             └─────────────┘
```

---

## 3. Componentes

### 3.1. Frontend (React + TypeScript, SPA)
- **Vistas:** Kanban (tablero por estados), Gantt multi-escala (zoom año→día), detalle de tarea/épica, grabador de audio.
- **Estado:** store de cliente (p. ej. Zustand/Redux) + capa de datos servidor (p. ej. TanStack Query) para caché y revalidación.
- **Gantt:** pieza más cara. Decisión abierta entre librería (`frappe-gantt`, `vis-timeline`) y render a medida (SVG/canvas) — ver §8.
- **Audio:** `MediaRecorder` del navegador → sube el blob a la API.

### 3.2. Backend/API (Node + Fastify)
Sigue una separación por módulo (routes / service / repo / schema Zod). Responsabilidades:
- **CRUD** de proyectos, épicas, tareas, subtareas.
- **Motor de automatización:** deriva el Kanban y las prioridades desde el Gantt (§ lógica en 4.3 y 5).
- **Orquestador de voz:** recibe audio → STT → Gemma → valida JSON → devuelve tarea pre-rellenada.
- **Cliente GitHub:** lectura de repos/commits/PRs y recepción de webhooks.

### 3.3. IA local
- **STT (Whisper.cpp / faster-whisper):** audio → transcripción.
- **Gemma 4 (local):** transcripción → **JSON estructurado** de tarea, forzando un esquema de salida (structured output / *grammar* / validación + reintento). Gemma no procesa el audio directamente; el STT va antes (a confirmar en Fase 0 del [ROADMAP.md](./planning/ROADMAP.md)).

### 3.4. Persistencia
- **`sqld` (libSQL):** servidor SQLite con la DX de Turso, en local. Fichero de base de datos en el NAS.
- **Audios:** guardados en el NAS (o descartados tras transcribir, configurable).

### 3.5. Integración GitHub
Cliente contra la API de GitHub con *personal access token*; webhook entrante (o polling) para eventos de commits/PRs. Ver §6 (seguridad) y §8 (trade-offs).

### 3.6. Servidor MCP (agentes de IA)
`POST /mcp` habla **MCP sobre Streamable HTTP** (JSON-RPC 2.0) para que agentes como Claude Code lean el trabajo y lo actualicen. Vive **dentro** del backend Fastify —se despliega con la app y se alcanza desde cualquier máquina de la LAN— e implementa el protocolo a mano, sin dependencias nuevas.

Autenticación **propia por bearer** (`MCP_TOKEN`): un agente no hace login interactivo, así que la cookie de sesión no aplica. La ruta queda exenta del hook global de sesión y pone su propia puerta; el bearer no abre el resto de la API REST, y sin `MCP_TOKEN` el módulo ni se registra. Cada herramienta delega en el servicio de siempre: es una fachada, no una segunda implementación de las reglas.

---

## 4. Modelo de datos

Jerarquía **Proyecto → Épica → Tarea → Subtarea**. Para simplificar, épica/tarea/subtarea pueden modelarse como una entidad **`item`** auto-referenciada (`parent_id` + `type`), lo que facilita el render recursivo en el Gantt.

### 4.1. Entidades (borrador)

| Entidad | Campos clave |
|---|---|
| `project` | `id`, `name`, `description`, `created_at`, `github_repos` (rel.) |
| `item` | `id`, `project_id`, `parent_id` (nullable), `type` (`epic`/`task`/`subtask`), `title`, `description`, `status`, `priority`, `start_date`, `end_date`, `estimate_min`, `created_at` |
| `time_log` | `id`, `item_id`, `started_at`, `ended_at`, `duration_sec` |
| `github_link` | `id`, `project_id`, `repo_full_name`, `created_at` |
| `settings` | `id`, `kanban_window_days` (p. ej. 7/14), … |

- `status`: `backlog` · `in_progress` · `blocked` · `done`.
- `priority`: derivada (no siempre manual) — ver §5.
- **Dependencias** entre items: tabla `dependency` (`from_item`, `to_item`) si se necesitan para el Gantt.
- **BigInt/fechas:** timestamps ISO-8601 en UTC; el front convierte a local.

### 4.2. Notas de esquema
- IDs legibles para "smart commits": además del `id` interno, un `key` corto por proyecto (p. ej. `GP-42`) para referenciar desde commits.
- Migraciones versionadas (patrón up/down) sobre libSQL.

### 4.3. Cronometraje automático
Al pasar un `item` a `in_progress` se abre un `time_log` (`started_at`). Al pasar a `done` se cierra (`ended_at`, `duration_sec`). Si vuelve a `in_progress`, se abre otro tramo; el tiempo total es la suma de tramos. Sin cronómetros manuales.

---

## 5. Lógica de automatización Gantt → Kanban

El Gantt es la **fuente de verdad del *cuándo***; el Kanban es una **vista derivada**.

- **Ventana:** el Kanban incluye los items cuya `[start_date, end_date]` intersecta `[hoy, hoy + kanban_window_days]` (configurable, def. 7–14 días) o que estén `in_progress`/`blocked`.
- **Prioridad derivada** (recalculada al cargar y a medianoche):
  | Condición | Prioridad |
  |---|---|
  | `end_date < hoy` y `status ≠ done` | **Retrasada / urgente** |
  | `start_date` ∈ {hoy, mañana} | **Para ya** |
  | En ventana, `start_date > mañana` | Normal |
  | `status = blocked` | Bloqueada (destacada aparte) |
- **Recálculo:** un job ligero (cron interno) al cambiar el día; y en cada request de la vista Kanban. No se persiste la prioridad derivada salvo caché.

---

## 6. Seguridad

Modelo de amenaza reducido: **un usuario, red local**. Aun así:
- **Autenticación (Fase 9):** login de un solo usuario dentro del propio backend (sin servicio de auth aparte). Credenciales en el `.env` del homeserver — `AUTH_USERNAME` + `AUTH_PASSWORD_HASH` (**scrypt** de `node:crypto`, nunca la contraseña en claro ni en la DB). La sesión es un token firmado con HMAC-SHA256 (`AUTH_SECRET`) que viaja en una cookie **`HttpOnly`, `SameSite=Lax`**: el JS de la página no puede leerla y el navegador no la envía en peticiones cross-site. Un hook global responde **401** en toda la API salvo `/health` y `/auth/*`; los intentos fallidos se frenan con **backoff creciente por IP**. Con `NODE_ENV=production` el backend no arranca sin credenciales configuradas. Rotar `AUTH_SECRET` cierra todas las sesiones.
- **Red:** la app escucha en la LAN; no se expone a Internet salvo el endpoint de webhook de GitHub (si se usa) tras reverse proxy/túnel. Alternativa sin exponer nada: **polling** a la API de GitHub.
- **Secretos:** el *personal access token* de GitHub se guarda **fuera del código** (variable de entorno / fichero de secretos en el homeserver), nunca en la DB en claro ni en el front. Scope mínimo del token (solo lectura de repos si no se necesita escribir).
- **Webhook:** verificar la **firma** (`X-Hub-Signature-256`) con `timingSafeEqual` antes de procesar el payload.
- **Backend↔servicios IA/DB:** confían en la LAN; no exponer sqld/STT/Gemma fuera del host.
- **Datos:** sin PII de terceros; el riesgo es de disponibilidad → backups (§7).

---

## 7. Despliegue e infraestructura

- **Empaquetado:** contenedores Docker (frontend estático + backend + sqld; STT y Gemma como servicios ya existentes en el homeserver o contenedores propios).
- **Orquestación:** `docker compose` en el homeserver; arranque automático.
- **Datos en NAS:** volumen del fichero libSQL y de audios montado desde el NAS. **Backups** periódicos del fichero de DB (copia + retención).
- **Observabilidad:** logs del backend; salud de STT/Gemma/sqld.

---

## 8. Decisiones y trade-offs

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **React + TypeScript (SPA)** | Astro | La app es casi toda UI interactiva con estado compartido; el modelo de islas aportaba poco. |
| **libSQL/`sqld` local** | SQLite plano · Postgres | Quería "Turso pero local": misma DX, sin nube, fichero en el NAS. Postgres es sobredimensionado para un usuario. |
| **STT (Whisper) + Gemma 4** | Solo Gemma sobre audio | Gemma estructura texto; el audio necesita STT previo. **A validar en Fase 0.** |
| **`item` auto-referenciado** | Tablas separadas épica/tarea/subtarea | Render recursivo del Gantt más simple con una sola entidad + `parent_id`. |
| **Gantt: librería vs. a medida** | — | **Decisión abierta.** Empezar con librería para validar UX; ir a medida solo si el multi-escala se queda corto. |
| **GitHub por polling o webhook** | — | Polling no expone la red pero tiene latencia; webhook es inmediato pero requiere exponer un endpoint. Decidir en Fase 6. |
| **Kanban derivado (no entidad propia)** | Kanban con tareas independientes | El pilar del producto es que el Kanban se mantenga solo desde el Gantt; duplicar estado rompería esa promesa. |

### Riesgos técnicos abiertos
1. **Fiabilidad/latencia del pipeline de voz** con modelos locales → *gate* GO/NO-GO en Fase 0.
2. **Gantt multi-escala** con jerarquía re-agrupable: la parte de UX más difícil.
3. **Sobre-ingeniería:** mantener el alcance de "un usuario, simple"; resistir clonar Jira entero.

---

## Estado y siguientes pasos

Documento **v0.1**, sujeto a lo que se aprenda en la Fase 0 del [ROADMAP.md](./planning/ROADMAP.md) (validación de voz). Al cerrar decisiones abiertas (Gantt lib vs. a medida, webhook vs. polling, STT concreto), subir a v0.2.
