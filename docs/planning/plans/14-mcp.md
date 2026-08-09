# Plan 14 — Servidor MCP para agentes de IA

> Fase: 14 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: Claude Code (u otro agente MCP) consulta qué tareas hay en cada proyecto y en qué estado, y las actualiza conforme trabaja.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (módulos `projects`/`items` ✅), Fase 2 (cronometraje ✅), Fase 4 (Kanban derivado ✅), Fase 9 (auth ✅), Fase 13 (`listAll`/`boardAll` ✅).
- **Habilita:** que el trabajo real quede registrado sin teclearlo dos veces — el agente que hace la tarea es el que mueve su estado.

---

## Contexto y decisiones

El usuario quiere que agentes de IA lean el estado del trabajo y lo actualicen
para dejar seguimiento. Tres decisiones de fondo:

- **Transporte: Streamable HTTP dentro del backend Fastify**, no un servidor
  stdio aparte. Ganttero es un servicio self-hosted que ya vive en Docker: un
  endpoint HTTP se despliega con la app, sale por el nginx que ya existe y se
  conecta desde **cualquier máquina de la LAN** con una línea de `claude mcp add`.
  Un binario stdio habría que instalarlo y actualizarlo en cada máquina donde
  corra un agente, y aun así tendría que hablar con esta misma API.
- **Sin dependencias nuevas.** La superficie del protocolo que necesitamos son
  cuatro métodos JSON-RPC (`initialize`, `tools/list`, `tools/call`, `ping`) y
  el SDK oficial trae un transporte pensado para Express. Se implementa a mano,
  igual que la Fase 9 hizo con las cookies y por el mismo motivo.
- **Autenticación propia por bearer** (`MCP_TOKEN`, comparado con
  `timingSafeEqual` sobre SHA-256 para tolerar longitudes distintas). Un agente
  no hace login interactivo, así que la cookie de sesión no sirve. La ruta queda
  **exenta del hook global** de la Fase 9 y pone su propia puerta; el bearer
  **no** abre el resto de la API REST. Sin `MCP_TOKEN` el módulo no se registra:
  la ruta no existe, en vez de existir sin protección.
- **El MCP es una fachada, no una segunda implementación.** Cada herramienta
  delega en el servicio de siempre, así que la jerarquía, la ventana del Kanban
  y el cronometraje automático se aplican igual que desde la UI.
- **Los errores de herramienta vuelven como `isError`, no como fallo de
  protocolo**: el agente lee el motivo ("una subtarea debe colgar de una tarea")
  y se corrige solo, en vez de ver un error opaco de transporte.

---

## Herramientas expuestas

| Herramienta | Para qué |
|---|---|
| `list_projects` | Saber sobre qué proyecto se trabaja |
| `list_items` | Qué tareas hay y en qué estado (filtra por proyecto, estado y tipo; oculta las hechas salvo que se pidan) |
| `get_item` | Detalle: descripción markdown, fechas, tiempo registrado y subtareas |
| `create_item` | Crear épica/tarea/subtarea respetando la jerarquía |
| `update_item` | Título, descripción, fechas, estimación y de qué épica cuelga |
| `set_item_status` | **La de seguimiento**: mover el estado, que abre y cierra el cronometraje |
| `get_kanban` | Lo que toca ahora, ya derivado y priorizado |

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 14.1 | `mcp.schema.ts`: envoltorio JSON-RPC 2.0 + entradas Zod de cada herramienta | ✅ Hecho | Códigos de error estándar |
| 14.2 | `mcp.tools.ts`: catálogo de 7 herramientas con su JSON Schema, delegando en los servicios | ✅ Hecho | Vista compacta del ítem |
| 14.3 | `mcp.service.ts`: dispatcher del protocolo (`initialize`, `tools/list`, `tools/call`, `ping`, notificaciones) | ✅ Hecho | Sin HTTP ni SQL |
| 14.4 | `mcp.routes.ts`: POST `/mcp` con bearer (`timingSafeEqual`), 202 para notificaciones, 405 en GET/DELETE | ✅ Hecho | Lotes soportados |
| 14.5 | `config/env.ts`: `MCP_TOKEN` opcional (mín. 32 caracteres) + cableado en `app.ts`/`index.ts` con exención del hook de sesión | ✅ Hecho | Sin token, sin ruta |
| 14.6 | Tests: 25 — auth, convivencia con la Fase 9, protocolo, las 7 herramientas y el mapeo de errores | ✅ Hecho | Todo vía `inject()` |

### Documentación

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 14.7 | `docs/deploy.md` §4b (generar token, verificar con curl, `claude mcp add`), `.env.example` | ✅ Hecho | — |

---

## Entregable

Con `MCP_TOKEN` en el `.env` del homeserver:

```bash
claude mcp add --transport http ganttero http://homeserver:8080/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

y el agente ya puede listar proyectos y tareas, crearlas, editarlas y mover su
estado — dejando el tiempo registrado como si se hubiera hecho desde la UI.

## Criterio de aceptación

- `pnpm -r typecheck` y `pnpm -r test` en verde.
- Sin `MCP_TOKEN` la ruta devuelve 404; con token pero sin bearer, 401.
- El bearer del MCP no abre el resto de la API REST.
- `set_item_status` a `in_progress` deja `time_running: true`; a `done`, `false`.
- Un error de negocio vuelve como `isError` con su motivo, no como error JSON-RPC.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | 14.1–14.7 completadas | MCP por Streamable HTTP dentro del backend, cero dependencias nuevas, bearer propio. Backend 187 tests ✅ (25 nuevos). Verificado además contra el servidor real por HTTP: handshake, `tools/list` y un ciclo crear → in_progress → done. Pendiente de que el usuario lo conecte a su Claude Code (el cliente real no se puede probar desde aquí). |
