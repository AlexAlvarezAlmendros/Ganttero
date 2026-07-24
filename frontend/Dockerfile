# Frontend Ganttero: build estático servido por nginx con proxy /api.
# Contexto de build: la RAÍZ del repo.

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile --filter frontend
COPY frontend frontend
RUN pnpm --filter frontend build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
