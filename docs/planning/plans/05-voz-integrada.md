# Plan 05 — Captura por voz integrada

> Fase: 5 de 7 | Estado: 🔒 Bloqueado | Iniciado: —
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
| 5.1 | Módulo `voice`: endpoint audio → pipeline de la Fase 0 → JSON | 🔒 Bloqueado | Necesita Fase 0 GO, 1.6 |
| 5.2 | Grabador en la UI (`MediaRecorder`) + formulario pre-relleno | 🔒 Bloqueado | Necesita 5.1, 1.7. No bloquear la UI mientras transcribe |
| 5.3 | Manejo de errores: JSON inválido → fallback a formulario manual | 🔒 Bloqueado | Necesita 5.2. Nunca bloquear la creación de la tarea |

---

## Entregable

Botón de grabar en la app: hablar → formulario pre-relleno (título, tipo, fechas, estimación) → guardar; si la IA falla, formulario manual.

## Criterio de aceptación

Crear una tarea por voz de principio a fin cuesta menos que teclearla; un audio ininteligible degrada a formulario vacío sin error bloqueante.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Bloqueado por Fase 0 (GO) y Fase 1. |
