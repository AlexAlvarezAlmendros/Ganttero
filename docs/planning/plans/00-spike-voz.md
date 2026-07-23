# Plan 00 — Spike de voz

> Fase: 0 de 7 | Estado: 🔄 En curso | Iniciado: 2026-07-23
> Hito del roadmap: un audio se convierte en JSON de tarea válido — **gate GO/NO-GO** del proyecto.

Prototipo **aislado** (sin UI de la app) que responde: ¿la captura voz→estructura con modelos locales es lo bastante fiable y rápida como para usarla a diario? Si no lo es, el proyecto se replantea antes de invertir en el Gantt.

---

## Dependencia con otras fases

- **Requiere:** nada.
- **Habilita:** decide el GO/NO-GO global. La Fase 5 (voz integrada) reutiliza este pipeline.

---

## Tareas

### Pipeline voz → JSON

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 0.1 | Capturar audio de prueba describiendo una tarea (varios ejemplos reales) | ⬜ Listo | Base para medir |
| 0.2 | STT local: audio → transcripción (Whisper.cpp / faster-whisper) | 🔒 Bloqueado | Necesita 0.1 |
| 0.3 | Definir el esquema Zod de salida (título, tipo épica/tarea/subtarea, estimación, fechas sugeridas, dependencias) | ✅ Hecho | `spike/src/schema.ts` + 10 tests |
| 0.4 | Prompt a Gemma 4 que fuerce ese JSON (structured output / validación + reintento) | 🔒 Bloqueado | Necesita 0.2, 0.3 |
| 0.5 | CLI/script que encadene audio → STT → Gemma → JSON validado | 🔒 Bloqueado | Necesita 0.4 |

### Medición y decisión

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 0.6 | Medir fiabilidad (% de audios que dan JSON usable) sobre el lote de 0.1 | 🔒 Bloqueado | Necesita 0.5 |
| 0.7 | Medir latencia (segundos por captura, ¿aceptable?) | 🔒 Bloqueado | Necesita 0.5 |
| 0.8 | Decisión GO/NO-GO y registro en el roadmap | 🔒 Bloqueado | Necesita 0.6, 0.7 |

---

## Entregable

Script/CLI que convierte un audio en un JSON de tarea válido.

## Criterio de aceptación

≥ ~80 % de los audios producen un JSON correcto en pocos segundos. Ese resultado marca el **GO/NO-GO** del proyecto.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-23 | — | Plan creado. Fase en curso. |
| 2026-07-23 | 0.3 | Contrato Zod de la IA en `spike/src/schema.ts` (+ `parseCapturedItem` y shape para el prompt). Scaffold del spike: package.json, tsconfig estricto, README con guía de grabación, `audios/` ignorado en git. Typecheck y 10 tests Vitest en verde. |
| 2026-07-23 | — | Planes de las fases 1–7 creados en `docs/planning/plans/`. |
