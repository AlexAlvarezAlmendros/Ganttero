# Ganttero

App web **self-hosted, de un solo usuario**, para planificar proyectos y tareas con
**Kanban + Gantt multi-escala**, capturando tareas por **voz** (IA local: Whisper + Gemma 4)
y con **automatización Gantt→Kanban**. Corre en el homeserver; los datos viven en el NAS.
El único componente en la nube es la integración con **GitHub**.

> **El Gantt manda**: el *cuándo* vive en el Gantt; el Kanban se deriva solo
> (ventana configurable + prioridades automáticas + cronometraje sin cronómetros).

## Documentación

- [Documentación funcional](docs/functional.md) — qué hace, casos de uso, reglas y flujos.
- [Arquitectura (documento técnico)](docs/architecture.md) — componentes, modelo de datos, seguridad.
- [Despliegue en el homeserver](docs/deploy.md) — Docker compose, NAS, backups.
- [Roadmap](docs/planning/ROADMAP.md) — plan por fases (fuente de verdad de la planificación).
- [Design system](docs/design/ganttero-ui-kit/README.md) — el UI kit de claude.ai/design que guía el frontend.

## Stack

React 19 + TypeScript (Vite) · Node 22 + Fastify 5 · libSQL · Zod · TanStack Query ·
Vitest · Biome · pnpm · faster-whisper + Gemma 4 (Ollama) para la voz.

## Desarrollo

```bash
pnpm install
pnpm --filter backend dev      # API en :3000 (migra la DB al arrancar)
pnpm --filter frontend dev     # SPA en :5173 (proxy /api → :3000)

pnpm check                     # Biome (lint + format)
pnpm typecheck                 # tsc en todos los paquetes
pnpm test                      # Vitest en todos los paquetes
```

Para la captura por voz en dev: venv de faster-whisper + ffmpeg
(instrucciones en `backend/.env.example`) y un Ollama accesible.

## Despliegue

```bash
cp backend/.env.example .env   # editar OLLAMA_BASE_URL, GITHUB_TOKEN, GANTTERO_DATA_DIR
docker compose up -d --build   # app en http://<homeserver>:8080
```

Detalles, backups y observabilidad en [docs/deploy.md](docs/deploy.md).

## Estado

**Fases 0–7 implementadas** (spike de voz con GO → fundaciones → Kanban + cronometraje →
Gantt multi-escala → automatización Gantt→Kanban → voz integrada → GitHub → despliegue).
Ver el [roadmap](docs/planning/ROADMAP.md).

## Desarrollo con Claude Code

Este repo trae `CLAUDE.md` (convenciones y estrategia de ramas), la skill `/ganttero-plan`
(planificación y seguimiento) y hooks en `.claude/` que validan formato y calidad.
