# Plan 05 — Captura por voz integrada

> Fase: 5 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-24 | Cerrado: 2026-07-24
> Hito del roadmap: crear una tarea hablando 10 s es más rápido que teclearla.

Integra en la app el pipeline validado en la Fase 0: grabar en el navegador, transcribir y estructurar en el backend, y confirmar en un formulario pre-relleno.

---

## Dependencia con otras fases

- **Requiere:** Fase 0 con **GO** (reutiliza su pipeline) y Fase 1 (módulo `items`); UI de la Fase 4 en su sitio.
- **Habilita:** el flujo estrella de captura sin fricción.

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 5.1 | Módulo `voice`: endpoint audio → pipeline de la Fase 0 → JSON | ✅ Hecho | POST /voice multipart; STT y Gemma inyectables; retención según ajuste |
| 5.2 | Grabador en la UI (`MediaRecorder`) + formulario pre-relleno | ✅ Hecho | ● del kit → graba → ItemDialog pre-rellenado con la transcripción visible |
| 5.3 | Manejo de errores: JSON inválido → fallback a formulario manual | ✅ Hecho | 422 con la transcripción dentro; mic denegado o IA caída → formulario vacío |

---

## Entregable

Botón de grabar en la app: hablar → formulario pre-relleno (título, tipo, fechas, estimación) → guardar; si la IA falla, formulario manual.

## Criterio de aceptación

Crear una tarea por voz de principio a fin cuesta menos que teclearla; un audio ininteligible degrada a formulario vacío sin error bloqueante.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-24 | 5.1–5.3 | Backend: módulo `voice` (PythonStt con el stt.py del spike, OllamaStructurer con prompt endurecido + Zod + reintento, VoiceService con "hoy" local y DomainError→422 llevando la transcripción). POST /voice multipart; retención según `retain_audio` (migración 002). Frontend: VoiceCapture (MediaRecorder, ● con blink) → ItemDialog pre-rellenado; fallback manual sin bloqueo. Smoke real: audio del spike → JSON correcto. Incidencia: el smoke commiteó 3 audios personales → retirados con amend y `backend/data/` al .gitignore. 6 tests nuevos. |
| 2026-07-23 | — | Plan creado. Bloqueado por Fase 0 (GO) y Fase 1. |
