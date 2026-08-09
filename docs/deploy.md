# Despliegue en el homeserver

Ganttero corre entero en el homeserver: frontend (nginx) + backend (Fastify con
libSQL embebido y STT dentro de la imagen). El único servicio externo es el
**Ollama del propio homeserver** (la IA de la voz) y la **API de GitHub** (nube).

```
navegador (LAN) → :8080 nginx ── /api → backend :3000 ── file:/data/ganttero.db (NAS)
                                          ├─ stt.py (faster-whisper, en la imagen)
                                          ├─ Ollama del homeserver (gemma4)
                                          └─ api.github.com (polling)
```

## 1. Preparar

```bash
git clone https://github.com/AlexAlvarezAlmendros/Ganttero.git && cd Ganttero
cp backend/.env.example .env
```

Edita `.env` (mínimo):

```bash
OLLAMA_BASE_URL=http://192.168.1.46:11434   # el Ollama del homeserver
OLLAMA_MODEL=gemma4:latest
GITHUB_TOKEN=ghp_...                        # scope mínimo (repo:read)
GANTTERO_DATA_DIR=/mnt/nas/ganttero         # ruta montada del NAS
```

> El fichero de la DB y los audios viven en `GANTTERO_DATA_DIR` (el NAS).
> `DATABASE_URL`, `AUDIO_DIR` y las rutas del STT ya vienen fijadas en el compose.

### Credenciales (obligatorias en producción)

Genera el hash de la contraseña y el secreto de sesión (la contraseña se pide por
teclado; no queda en el historial del shell):

```bash
pnpm --filter backend auth:hash
```

Pega su salida en el `.env` y añade el usuario:

```bash
AUTH_USERNAME=poio
AUTH_PASSWORD_HASH=scrypt$16384$8$1$...
AUTH_SECRET=<64 hex>
AUTH_SESSION_DAYS=30      # duración de la sesión
AUTH_COOKIE_SECURE=false  # `true` solo si sirves la app por HTTPS
```

> Con `NODE_ENV=production` el backend **no arranca** sin las tres primeras: así
> nunca se despliega con la API abierta. Cambiar la contraseña = regenerar el
> hash y reiniciar el backend. Rotar `AUTH_SECRET` cierra todas las sesiones.

## 2. Arrancar

```bash
docker compose up -d --build
```

- App en `http://<homeserver>:8080` (cambia el puerto con `GANTTERO_PORT`).
- Las migraciones se aplican solas al arrancar el backend.
- `restart: unless-stopped` → sobrevive a reinicios del homeserver.
- El backend NO publica su puerto: solo se entra por el frontend (LAN).

## 3. Backups (tarea 7.2)

Cron en el homeserver (diario a las 03:15, 14 copias):

```cron
15 3 * * * /ruta/Ganttero/scripts/backup-db.sh /mnt/nas/ganttero /mnt/nas/backups/ganttero 14
```

Restaurar: parar el backend, copiar el `.db` del backup sobre
`$GANTTERO_DATA_DIR/ganttero.db`, arrancar.

## 4. Observabilidad (tarea 7.3)

- `GET /health` → `{"status":"ok","db":"ok"}` (503 si la DB no responde);
  es el healthcheck de Docker.
- Logs: `docker compose logs -f backend` (pino JSON; el polling de GitHub y
  las migraciones se anuncian; los tokens jamás se loggean).
- Salud de la IA: si Ollama está caído, la captura por voz degrada a
  formulario manual con toast — la app sigue funcionando.

## 5. Actualizar

```bash
git pull && docker compose up -d --build
```

## Notas

- **Latencia de la voz**: la generación real de Gemma en el homeserver son ~4 s;
  quedó pendiente investigar ~20 s de overhead interno de Ollama por petición
  (`journalctl -u ollama -f` mientras capturas). No bloquea el uso.
- La imagen del backend es grande (python3 + ffmpeg + faster-whisper) a cambio
  de un despliegue autocontenido. El modelo Whisper se descarga en el primer
  uso y queda cacheado en el contenedor; móntale un volumen a
  `~/.cache/huggingface` si quieres conservarlo entre rebuilds.
