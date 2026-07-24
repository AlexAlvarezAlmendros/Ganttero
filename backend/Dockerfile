# Backend Ganttero: Fastify + libSQL embebido + STT local (faster-whisper).
# Contexto de build: la RAÍZ del repo (docker compose ya lo hace así).

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend
COPY backend backend
RUN pnpm --filter backend build && pnpm --filter backend deploy --prod --legacy /out

FROM node:22-bookworm-slim
# python3 + ffmpeg para el STT (faster-whisper); imagen gorda a cambio de
# un despliegue autocontenido en el homeserver.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-venv ffmpeg \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/backend/dist ./dist
COPY backend/stt/stt.py ./stt/stt.py
RUN python3 -m venv /app/stt/.venv \
	&& /app/stt/.venv/bin/pip install --no-cache-dir faster-whisper

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
