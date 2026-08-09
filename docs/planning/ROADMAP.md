# Ganttero — Roadmap del proyecto

> Última actualización: 2026-08-09

App web *self-hosted* de planificación personal: **Kanban + Gantt multi-escala**, captura de tareas por **voz** con IA local (Whisper + Gemma 4) y **automatización Gantt→Kanban**. Un solo usuario, todo en el homeserver, datos en el NAS; el único punto en la nube es la API de GitHub.

Documentación: [funcional](../functional.md) · [arquitectura](../architecture.md).

## Estrategia

**Riesgo primero.** El mayor riesgo (que la captura por voz no sea fiable/rápida) se valida en la Fase 0 antes de invertir en la UI cara (Gantt). Después se construye de fundaciones hacia arriba: datos → Kanban → Gantt → automatización → voz → GitHub.

## Fases

| # | Fase | Estado | Plan | Hito |
|---|------|--------|------|------|
| 0 | Spike de voz | ✅ Hecho | [00-spike-voz.md](plans/00-spike-voz.md) | Un audio se convierte en JSON de tarea válido (GO/NO-GO) → **GO** |
| 1 | Fundaciones (datos + API + esqueleto) | ✅ Hecho | [01-fundaciones.md](plans/01-fundaciones.md) | CRUD de proyectos/tareas persistido en el NAS |
| 2 | Kanban + cronometraje | ✅ Hecho | [02-kanban-cronometraje.md](plans/02-kanban-cronometraje.md) | Mover a "Hecha" registra el tiempo en curso sin acción manual |
| 3 | Gantt multi-escala | ✅ Hecho | [03-gantt.md](plans/03-gantt.md) | Una jerarquía épica/tarea/subtarea se ve coherente en las 5 escalas |
| 4 | Automatización Gantt → Kanban | ✅ Hecho | [04-automatizacion.md](plans/04-automatizacion.md) | Al cambiar una fecha del Gantt, el Kanban se recalcula solo |
| 5 | Captura por voz integrada | ✅ Hecho | [05-voz-integrada.md](plans/05-voz-integrada.md) | Crear una tarea hablando 10 s es más rápido que teclearla |
| 6 | Integración GitHub | ✅ Hecho | [06-github.md](plans/06-github.md) | Un commit con `GP-<id>` se refleja en la tarea |
| 7 | Pulido y despliegue estable | ✅ Hecho | [07-despliegue.md](plans/07-despliegue.md) | La app vive en el homeserver y se usa a diario |
| 8 | Descripciones markdown + IA | ✅ Hecho | [08-descripciones-markdown.md](plans/08-descripciones-markdown.md) | Editor WYSIWYG (markdown por debajo) con botón "mejorar formato" (Gemma local) |
| 9 | Autenticación básica | ✅ Hecho | [09-autenticacion.md](plans/09-autenticacion.md) | La app pide usuario/contraseña una vez y ninguna ruta de datos responde sin sesión |
| 10 | Reasignar el padre de un ítem | ✅ Hecho | [10-reasignar-padre.md](plans/10-reasignar-padre.md) | Cambiar la épica de una tarea desde su detalle, sin borrar y recrear |

## Foco actual

**Fases 0–10 implementadas.** La Fase 10 añadió el selector de padre en el detalle del ítem: el backend ya validaba el reparentado (mismo proyecto, jerarquía, sin ciclos), así que solo faltaba la UI y los tests.

La Fase 9 añadió el login de un solo usuario dentro del backend Fastify (sin servicio de auth aparte, modelo Umami): credenciales en `.env` con hash scrypt, sesión en cookie firmada `HttpOnly` y rate limit por IP.

Pendientes de operación (no de código): primer `docker compose up --build` en el homeserver ([docs/deploy.md](../deploy.md)), cron de backups, e investigar el overhead de ~20 s de Ollama por petición en el homeserver (la generación real son ~4 s).

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
- 2026-07-23 — **GO de la Fase 0.** Pipeline confirmado: faster-whisper `small` (CPU) + Gemma 4 vía Ollama con structured output + Zod + reintento. Fiabilidad 5/5 (100 %) en portátil (e4b) y homeserver (E2B con prompt endurecido); fechas relativas y estimaciones validadas. Latencia: ~28 s/captura contra el homeserver, con ~20 s de overhead interno de Ollama a investigar (cómputo real ~4 s → objetivo ~8 s). El overhead no bloquea la Fase 1.
- 2026-07-24 — **Smart commits por POLLING, no webhook** (cierra la decisión abierta de architecture.md §8): nada de la LAN se expone a Internet; la latencia del intervalo (5 min por defecto) es irrelevante para un solo usuario. `GITHUB_POLL_SECONDS=0` lo apaga.
- 2026-07-23 — **Gantt a medida** (cierra la decisión abierta de architecture.md §8): ninguna librería reproduce la estética del design system y el GanttView del kit ya define el enfoque (filas + barras posicionadas en %). Redibujar 5 escalas con agrupación es más simple sin pelearse con una librería.
- 2026-08-09 — **Autenticación dentro del backend existente** (modelo Umami: sin servicio de auth aparte). Credenciales del único usuario en `.env` con hash **scrypt** (no en la DB), sesión en **cookie firmada `HttpOnly`** con HMAC-SHA256 de `node:crypto` (sin JWT), rate limit con backoff por IP y **sin 2FA**. En `production` el arranque falla si faltan las variables `AUTH_*`.
- 2026-07-23 — La IA de producción apuntará al **Ollama del homeserver** (`gemma4:latest`, E2B en VRAM); el prompt vive en el código (`structure.ts`) con «hoy» siempre inyectado.
