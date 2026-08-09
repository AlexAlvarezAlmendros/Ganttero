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

## 4b. MCP para agentes de IA (Fase 14)

Ganttero expone un servidor **MCP** para que agentes como Claude Code consulten
qué tareas hay, en qué estado, y las actualicen conforme trabajan. Está
**apagado por defecto**: sin `MCP_TOKEN` la ruta ni siquiera se registra.

```bash
# 1. Genera el token y añádelo al .env del homeserver
openssl rand -hex 32
# MCP_TOKEN=<lo que salga>

docker compose up -d --build   # recarga el .env
```

El endpoint sale por el mismo nginx que la API, sin tocar la configuración:

```bash
# 2. Compruébalo desde la máquina donde vas a usar el agente
curl -s -X POST http://homeserver:8080/api/mcp \
  -H "authorization: Bearer $MCP_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 200
```

```bash
# 3. Conéctalo a Claude Code (en cualquier máquina de la LAN)
claude mcp add --transport http ganttero http://homeserver:8080/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

Herramientas disponibles: `list_projects`, `list_items`, `get_item`,
`create_item`, `update_item`, `set_item_status` y `get_kanban`.
`set_item_status` es la de seguimiento: al pasar a `in_progress` abre un tramo
de tiempo y al pasar a `done` lo cierra, igual que desde la UI.

**Seguridad:** el token es una llave de la API de tareas — trátalo como el de
GitHub (fuera del repo, solo en el `.env` del homeserver). Es independiente del
login del navegador: no da acceso al resto de la API REST, y rotarlo es cambiar
la variable y reiniciar. No expongas el puerto fuera de la LAN sin VPN.

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
