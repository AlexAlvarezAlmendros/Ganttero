# Plan 09 — Autenticación básica de un solo usuario

> Fase: 9 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-08-09 | Cerrado: 2026-08-09
> Hito del roadmap: la app pide usuario y contraseña una vez y la sesión dura semanas; ninguna ruta de datos responde sin sesión.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (backend Fastify + `config/env.ts` ✅), Fase 7 (despliegue en el homeserver ✅).
- **Habilita:** exponer Ganttero fuera de la LAN (VPN/túnel) sin dejar la API abierta.

---

## Contexto y decisiones

Modelo tipo **Umami**: no hay servicio de auth aparte ni proveedor externo; el login vive
dentro del backend Fastify que ya existe. Un solo usuario, sin registro ni recuperación.

Decisiones tomadas con el usuario (2026-08-09):

- **Credenciales en `.env`, no en la DB.** `AUTH_USERNAME` + `AUTH_PASSWORD_HASH` (scrypt) +
  `AUTH_SECRET`. Cumple la regla de `CLAUDE.md` (secretos fuera del código y fuera de la DB
  en claro), evita migración y flujo de setup. Cambiar contraseña = regenerar hash y reiniciar.
- **Sesión por cookie firmada `HttpOnly`**, no token en `localStorage`: el JS de la página
  nunca puede leerla (`CLAUDE.md`: nunca `localStorage` para datos críticos).
- **Sin JWT ni librería de criptografía**: `node:crypto` (scrypt + HMAC-SHA256 +
  `timingSafeEqual`). **Cero dependencias nuevas**: la cookie se serializa y se lee a mano
  (`auth.cookie.ts`), lo que además evita depender del orden de carga de plugins en el hook.
- **Sin 2FA** en esta fase: LAN, un usuario, fricción diaria alta para el beneficio.
- **Auth por DI, como `voice`/`github`**: `buildApp({ auth })`. Sin las variables la app
  arranca sin auth en desarrollo (con aviso en el log) pero **falla al arrancar en
  producción**: nunca se despliega desprotegido por olvidar el `.env`.

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 9.1 | `config/env.ts`: `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `AUTH_SECRET`, `AUTH_SESSION_DAYS`, `AUTH_COOKIE_SECURE` + refine que las exige en `production` | ✅ Hecho | Nunca volcar valores en el error |
| 9.2 | `auth.password.ts`: `hashPassword`/`verifyPassword` con scrypt + `timingSafeEqual`; script `pnpm --filter backend auth:hash` | ✅ Hecho | Formato `scrypt$N$r$p$salt$hash` |
| 9.3 | `auth.service.ts`: verificación de credenciales, emisión/validación del token de sesión (HMAC-SHA256 + expiración) y backoff por intentos fallidos | ✅ Hecho | Reloj inyectable (`now`), sin HTTP ni SQL |
| 9.4 | `auth.schema.ts` + `auth.routes.ts`: `POST /auth/login`, `POST /auth/logout`, `GET /auth/session` | ✅ Hecho | Cookie `HttpOnly`, `SameSite=Lax`, `Path=/` |
| 9.5 | Hook global `onRequest` en `app.ts`: 401 en todo salvo `/health` y `/auth/*` | ✅ Hecho | Se registra solo si llega `auth` por DI |
| 9.6 | Cablear `index.ts` + helpers de cookie propios (`auth.cookie.ts`) | ✅ Hecho | Aviso en el log si la auth queda desactivada |
| 9.7 | Tests: password, service (expiración, firma manipulada, backoff), routes (200/401/429, atributos de la cookie) y 401 en rutas protegidas | ✅ Hecho | Los tests existentes siguen sin auth (DI) |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 9.8 | `api/auth.ts` (`useSession`, `useLogin`, `useLogout`) + 401 global en `api/client.ts` | ✅ Hecho | Un 401 invalida la sesión y vuelve al login |
| 9.9 | `LoginPage` con el design system (usuario, contraseña, error, estado de bloqueo) | ✅ Hecho | Sin pistas de qué campo falla |
| 9.10 | Gate en `App.tsx`: sin sesión → login; botón "SALIR" en el TopBar | ✅ Hecho | Si el backend no tiene auth, todo sigue igual |
| 9.11 | Tests: gate (login vs app), login correcto/incorrecto, logout | ✅ Hecho | — |

### Documentación / despliegue

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 9.12 | `backend/.env.example`, `docs/deploy.md`, `README.md` y `docs/architecture.md` | ✅ Hecho | Cómo generar hash y `AUTH_SECRET` |

---

## Entregable

Al abrir Ganttero se pide usuario y contraseña; la sesión persiste en una cookie firmada
`HttpOnly` durante `AUTH_SESSION_DAYS` (30 por defecto). Toda la API responde 401 sin sesión
válida, salvo `/health` (healthcheck de Docker) y las rutas de login. Los intentos fallidos
se frenan con backoff creciente por IP.

## Criterio de aceptación

- `pnpm biome check .` (ficheros tocados), `pnpm -r typecheck`, `pnpm -r test` en verde.
- `curl http://host:8080/api/projects` sin cookie → 401; con cookie válida → 200.
- La cookie sale con `HttpOnly`, `SameSite=Lax` y `Max-Age` acorde a `AUTH_SESSION_DAYS`.
- Arrancar con `NODE_ENV=production` sin las variables `AUTH_*` aborta el arranque.
- Manipular un byte del token de la cookie invalida la sesión.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | Plan creado | Fase 9 abierta: credenciales en `.env` (scrypt) + sesión por cookie firmada + rate limit. Sin 2FA y sin tabla de usuarios. |
| 2026-08-09 | 9.1–9.12 completadas | Módulo `auth` (password/service/routes/cookie) + hook global, `LoginPage` + `AuthGate`, CLI `auth:hash`. Backend 152 tests ✅ (37 nuevos), frontend 38 ✅ (14 nuevos), typecheck ✅. Prueba de humo con el servidor real: 401 sin cookie → login → 200 → logout → 401, y arranque abortado en `production` sin credenciales. `NODE_ENV: production` fijado en el compose para que un `.env` copiado del ejemplo no rebaje la seguridad. |
