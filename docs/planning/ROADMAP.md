# Ganttero — Roadmap del proyecto

> Última actualización: 2026-07-23

App web *self-hosted* de planificación personal: **Kanban + Gantt multi-escala**, captura de tareas por **voz** con IA local (Whisper + Gemma 4) y **automatización Gantt→Kanban**. Un solo usuario, todo en el homeserver, datos en el NAS; el único punto en la nube es la API de GitHub.

Documentación: [funcional](../functional.md) · [arquitectura](../architecture.md).

## Estrategia

**Riesgo primero.** El mayor riesgo (que la captura por voz no sea fiable/rápida) se valida en la Fase 0 antes de invertir en la UI cara (Gantt). Después se construye de fundaciones hacia arriba: datos → Kanban → Gantt → automatización → voz → GitHub.

## Fases

| # | Fase | Estado | Plan | Hito |
|---|------|--------|------|------|
| 0 | Spike de voz | 🔄 En curso | [00-spike-voz.md](plans/00-spike-voz.md) | Un audio se convierte en JSON de tarea válido (GO/NO-GO) |
| 1 | Fundaciones (datos + API + esqueleto) | ⬜ Pendiente | [01-fundaciones.md](plans/01-fundaciones.md) | CRUD de proyectos/tareas persistido en el NAS |
| 2 | Kanban + cronometraje | ⬜ Pendiente | [02-kanban-cronometraje.md](plans/02-kanban-cronometraje.md) | Mover a "Hecha" registra el tiempo en curso sin acción manual |
| 3 | Gantt multi-escala | ⬜ Pendiente | [03-gantt.md](plans/03-gantt.md) | Una jerarquía épica/tarea/subtarea se ve coherente en las 5 escalas |
| 4 | Automatización Gantt → Kanban | ⬜ Pendiente | [04-automatizacion.md](plans/04-automatizacion.md) | Al cambiar una fecha del Gantt, el Kanban se recalcula solo |
| 5 | Captura por voz integrada | ⬜ Pendiente | [05-voz-integrada.md](plans/05-voz-integrada.md) | Crear una tarea hablando 10 s es más rápido que teclearla |
| 6 | Integración GitHub | ⬜ Pendiente | [06-github.md](plans/06-github.md) | Un commit con `GP-<id>` se refleja en la tarea |
| 7 | Pulido y despliegue estable | ⬜ Pendiente | [07-despliegue.md](plans/07-despliegue.md) | La app vive en el homeserver y se usa a diario |

## Foco actual

**Fase 0 — Spike de voz.** Prototipo aislado (sin UI de la app) que responde: ¿la voz→estructura es lo bastante buena y rápida? Es un **gate GO/NO-GO** del proyecto: si la captura por voz no es fiable, se replantea antes de construir el Gantt.

## Grafo de dependencias

```
Fase 0 (spike de voz) ──GO/NO-GO──►
Fase 1 (datos + API + esqueleto)
  └──► Fase 2 (Kanban + cronometraje)
         └──► Fase 3 (Gantt multi-escala)
                └──► Fase 4 (automatización Gantt→Kanban)
                       ├──► Fase 5 (voz integrada) — reutiliza el pipeline de la Fase 0
                       └──► Fase 6 (integración GitHub)
                              └──► Fase 7 (pulido + despliegue)
```

## Leyenda de estados

| Icono | Significado |
|-------|-------------|
| ⬜ Listo / Pendiente | Sin bloqueos, se puede empezar |
| 🔄 En curso | Se está trabajando ahora |
| ✅ Hecho | Completado |
| 🔒 Bloqueado | Espera a otra tarea |
| ❌ Cancelado | Fuera de alcance |

## Decisiones tomadas

- 2026-07-22 — **Frontend React + TypeScript (SPA)** en vez de Astro: casi todo es UI interactiva con estado compartido.
- 2026-07-22 — **Base de datos libSQL/`sqld` self-hosted** ("Turso pero local"): datos en el NAS, sin nube.
- 2026-07-22 — **GitHub** como git (no self-hosted): la integración de repos es el único punto en la nube.
- 2026-07-22 — **Automatización Gantt→Kanban** y **cronometraje automático** son pilares del producto, no extras.
- 2026-07-22 — **Voz probablemente = STT (Whisper) + Gemma 4**, no solo Gemma (a confirmar en Fase 0).
