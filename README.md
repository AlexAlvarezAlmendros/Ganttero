<div align="center">

# Ganttero

**Planificas en el Gantt. El Kanban del día se llena solo. Y una tarea se crea hablando diez segundos.**

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-lightgrey)](LICENSE)
[![Self-hosted](https://img.shields.io/badge/self--hosted-Docker%20Compose-4c8bf5)](docs/deploy.md)
[![IA local](https://img.shields.io/badge/IA-Whisper%20%2B%20Gemma%20(local)-6f42c1)](#la-voz-no-sale-de-casa)
[![Fases 0–7](https://img.shields.io/badge/estado-fases%200--7%20implementadas-4dd4ac)](docs/planning/ROADMAP.md)

[Qué resuelve](#el-problema) ·
[El Gantt manda](#el-gantt-manda) ·
[La voz](#la-voz-no-sale-de-casa) ·
[Levantarlo](#levantarlo) ·
[Arquitectura](docs/architecture.md)

</div>

---

## El problema

Las tareas se dispersan: unas en notas, otras en la cabeza, otras en un tablero que llevas dos
semanas sin arrastrar. Los gestores de proyecto de verdad te obligan a mantener dos planes a mano
—el cronograma y el tablero— y ninguno de los dos sobrevive a un martes ocupado.

**Ganttero mantiene uno solo.** El *cuándo* vive en el Gantt; el Kanban es una vista derivada que
se recalcula sola. Y como el coste de capturar es lo que mata a cualquier sistema de tareas,
capturar aquí es hablar:

```
 ⏺ grabar   →  «el jueves tengo que rematar el informe de Rivisa, unas tres horas»
                     ↓ Whisper (STT local)
                     ↓ Gemma 4 (Ollama local)
              ┌──────────────────────────────────────────┐
              │ Rematar el informe de Rivisa             │
              │ tipo: tarea   inicio: jue   est.: 3 h    │  ← revisas y confirmas
              └──────────────────────────────────────────┘
                     ↓
              en el Gantt … y mañana, en el Kanban
```

Principio rector: **mínima fricción**. Si añadir o mover una tarea cuesta, la app ha fallado.

## El Gantt manda

El Kanban no es una lista que llenas a mano. Sale del plan, y sale solo:

- **Ventana configurable.** Lo que empieza en las próximas 1–2 semanas entra en el tablero; lo
  demás no te estorba.
- **Prioridad automática.** Empieza hoy, empieza mañana, va tarde, está bloqueada: la señal es del
  plan, no de una etiqueta que alguien recordó poner.
- **Cronometraje sin cronómetro.** Marcas la tarea como hecha y el tiempo que estuvo en curso queda
  registrado. Nunca has pulsado *start*.
- **Zoom real en el Gantt** — año → medio año → mes → semana → día — y la jerarquía **épica → tarea
  → subtarea** se agrupa o se abre según la escala, para que mirar el año no signifique ahogarse en
  subtareas.
- **Enlace con GitHub.** Un proyecto apunta a su repo, y un commit que mencione `GP-42` actualiza
  esa tarea sin que abras la app.

## La voz no sale de casa

La transcripción la hace **faster-whisper** y la estructuración **Gemma 4 sobre Ollama**, los dos
en tu máquina. El audio no viaja a ningún servicio, no se guarda en ninguna nube y no entrena nada.

Y si el modelo no entiende bien lo que dijiste, no bloquea: te deja el formulario delante con lo que
sí ha pillado. La IA aquí rellena campos, no decide.

## Tus datos, en tu casa

App **self-hosted y de un solo usuario**, pensada para el homeserver de la red local:

- La base es **libSQL** en un fichero, sobre el directorio que le digas (`GANTTERO_DATA_DIR`) —
  típicamente un volumen del NAS. Copiar tus datos es copiar un fichero.
- **Login con usuario y contraseña**, hash generado con `pnpm --filter backend auth:hash`, sesión en
  cookie `HttpOnly` firmada. En producción el backend **no arranca** sin credenciales configuradas.
- El único componente que sale a internet es la **integración con GitHub**, y es opcional.

## Levantarlo

```bash
cp backend/.env.example .env      # OLLAMA_BASE_URL, GITHUB_TOKEN, GANTTERO_DATA_DIR
pnpm --filter backend auth:hash   # genera AUTH_PASSWORD_HASH y AUTH_SECRET
docker compose up -d --build      # http://<homeserver>:8080
```

Backups, observabilidad y el detalle del despliegue en [`docs/deploy.md`](docs/deploy.md).

## Desarrollo

```bash
pnpm install
pnpm --filter backend dev      # API en :3000 (migra la DB al arrancar)
pnpm --filter frontend dev     # SPA en :5173 (proxy /api → :3000)

pnpm check                     # Biome (lint + formato)
pnpm typecheck                 # tsc en todos los paquetes
pnpm test                      # Vitest en todos los paquetes
```

Para la captura por voz en dev hace falta el venv de faster-whisper, `ffmpeg` y un Ollama accesible
(instrucciones en `backend/.env.example`).

- Qué hace y para quién → [`docs/functional.md`](docs/functional.md)
- Componentes, modelo de datos y seguridad → [`docs/architecture.md`](docs/architecture.md)
- Despliegue en el homeserver → [`docs/deploy.md`](docs/deploy.md)
- Plan por fases (fuente de verdad) → [`docs/planning/ROADMAP.md`](docs/planning/ROADMAP.md)
- Design system → [`docs/design/ganttero-ui-kit/README.md`](docs/design/ganttero-ui-kit/README.md)

## Stack

**React 19** + TypeScript (Vite) · **Fastify 5** sobre Node 22 · **libSQL** · Zod · TanStack Query ·
TipTap · Vitest · Biome · pnpm workspaces. Voz: **faster-whisper** + **Gemma 4** vía Ollama.

Monorepo de dos paquetes (`frontend/`, `backend/`) más `spike/`, el prototipo aislado donde se
validó que el pipeline de voz daba resultados suficientes antes de integrarlo.

## Estado

**Fases 0–7 implementadas**: spike de voz con GO → fundaciones → Kanban con cronometraje → Gantt
multi-escala → automatización Gantt→Kanban → voz integrada → GitHub → despliegue, más la fase 9 de
autenticación. El detalle por tarea, en el [roadmap](docs/planning/ROADMAP.md).

Es una herramienta personal, construida para un usuario concreto (yo) en una red concreta (la de
casa). Funciona; no pretende ser multiusuario ni multi-tenant.

## Desarrollo con Claude Code

El repo trae `CLAUDE.md` con las convenciones y la estrategia de ramas, la skill `/ganttero-plan`
para planificar y hacer seguimiento por fases, y hooks en `.claude/` que validan formato y calidad
antes de cada commit.

## Licencia

MIT — ver [LICENSE](LICENSE).
