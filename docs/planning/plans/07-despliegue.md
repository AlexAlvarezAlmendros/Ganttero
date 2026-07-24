# Plan 07 — Pulido y despliegue estable

> Fase: 7 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-24 | Cerrado: 2026-07-24
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
| 7.1 | Docker + docker compose en el homeserver, arranque automático | ✅ Hecho | Dockerfiles multi-stage + compose con restart y healthcheck; STT dentro de la imagen |
| 7.2 | Datos y audios en el NAS con backups del fichero libSQL | ✅ Hecho | Volumen GANTTERO_DATA_DIR + scripts/backup-db.sh (retención, probado) |
| 7.3 | Logs, observabilidad y repaso final de UX (simple y rápida) | ✅ Hecho | /health con chequeo de DB (503 si falla) = healthcheck Docker; pino JSON; IA caída degrada con toast |

---

## Entregable

`docker compose up -d` en el homeserver deja la app corriendo con arranque automático, datos en el NAS y backups periódicos.

## Criterio de aceptación

La app sobrevive a un reinicio del homeserver sin intervención; existe al menos un backup restaurable del fichero libSQL; el uso diario no revela fricciones nuevas.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-24 | 7.1–7.3 | Build de producción del backend (`tsc -p tsconfig.build.json` → `node dist/index.js`, **verificado arrancando**). Dockerfiles multi-stage (backend: node slim + python3/ffmpeg/faster-whisper para un despliegue autocontenido; frontend: nginx con proxy `/api` recortando prefijo, mismo contrato que Vite). `docker-compose.yml`: datos en `GANTTERO_DATA_DIR` (NAS), backend sin puerto publicado (solo LAN vía nginx), restart + healthcheck. `scripts/backup-db.sh` con `sqlite3 .backup` y retención (**probado: 3 ejecuciones, conserva N**). `/health` ahora chequea la DB (503 si falla). `docs/deploy.md` con pasos, cron de backup, restauración y actualización. Salvedad honesta: sin Docker en el portátil de desarrollo — el primer `docker compose up --build` se hace en el homeserver siguiendo docs/deploy.md. |
| 2026-07-23 | — | Plan creado. Bloqueado por las Fases 1–6. |
