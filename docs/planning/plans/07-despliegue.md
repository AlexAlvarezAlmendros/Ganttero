# Plan 07 — Pulido y despliegue estable

> Fase: 7 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
> Hito del roadmap: la app vive en el homeserver y se usa a diario.

Cierre: contenedores en el homeserver, datos y backups en el NAS, y un repaso final de UX guiado por el principio de mínima fricción.

---

## Dependencia con otras fases

- **Requiere:** Fases 1–6 completadas (o las que hayan sobrevivido al alcance).
- **Habilita:** uso diario real.

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 7.1 | Docker + docker compose en el homeserver, arranque automático | 🔒 Bloqueado | Necesita Fases 1–6 |
| 7.2 | Datos y audios en el NAS con backups del fichero libSQL | 🔒 Bloqueado | Necesita 7.1. Copia + retención |
| 7.3 | Logs, observabilidad y repaso final de UX (simple y rápida) | 🔒 Bloqueado | Necesita 7.1. Salud de STT/Gemma/sqld |

---

## Entregable

`docker compose up -d` en el homeserver deja la app corriendo con arranque automático, datos en el NAS y backups periódicos.

## Criterio de aceptación

La app sobrevive a un reinicio del homeserver sin intervención; existe al menos un backup restaurable del fichero libSQL; el uso diario no revela fricciones nuevas.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por las Fases 1–6. |
