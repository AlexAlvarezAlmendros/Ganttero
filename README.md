# Ganttero

App web **self-hosted, de un solo usuario**, para planificar proyectos y tareas con
**Kanban + Gantt multi-escala**, capturando tareas por **voz** (IA local: Whisper + Gemma 4)
y con **automatización Gantt→Kanban**. Corre en el homeserver; los datos viven en el NAS.
El único componente en la nube es la integración con **GitHub**.

## Documentación

- [Documentación funcional](docs/functional.md) — qué hace, casos de uso, reglas y flujos.
- [Arquitectura (documento técnico)](docs/architecture.md) — componentes, modelo de datos, seguridad, despliegue.
- [Roadmap](docs/planning/ROADMAP.md) — plan por fases (fuente de verdad de la planificación).

## Stack

React + TypeScript (Vite) · Node + Fastify · libSQL/`sqld` (local) · Zod · Vitest · Biome · pnpm ·
STT local (Whisper) + Gemma 4 para la captura por voz.

## Estado

Fase 0 — **spike de voz** (validación GO/NO-GO del pipeline audio → JSON). Ver el [roadmap](docs/planning/ROADMAP.md).

## Desarrollo con Claude Code

Este repo trae `CLAUDE.md` (convenciones), la skill `/ganttero-plan` (planificación y seguimiento)
y hooks en `.claude/` que validan formato y calidad del código automáticamente.
