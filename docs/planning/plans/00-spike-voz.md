# Plan 00 — Spike de voz

> Fase: 0 de 7 | Estado: ✅ Hecho | Iniciado: 2026-07-23 | Cerrado: 2026-07-23 con **GO**
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
| 0.1 | Capturar audio de prueba describiendo una tarea (varios ejemplos reales) | ✅ Hecho | 5 audios AAC en `spike/audios/` |
| 0.2 | STT local: audio → transcripción (Whisper.cpp / faster-whisper) | ✅ Hecho | faster-whisper `small` int8 en CPU; 5/5 audios OK, ~3,2 s/audio |
| 0.3 | Definir el esquema Zod de salida (título, tipo épica/tarea/subtarea, estimación, fechas sugeridas, dependencias) | ✅ Hecho | `spike/src/schema.ts` + 10 tests |
| 0.4 | Prompt a Gemma 4 que fuerce ese JSON (structured output / validación + reintento) | ✅ Hecho | `src/structure.ts`; 5/5 al primer intento, pero ~70 s/captura en CPU |
| 0.5 | CLI/script que encadene audio → STT → Gemma → JSON validado | ✅ Hecho | `pnpm capture <audios…>` (src/run.ts) con métricas por paso |

### Medición y decisión

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 0.6 | Medir fiabilidad (% de audios que dan JSON usable) sobre el lote de 0.1 | ✅ Hecho | **5/5 (100 %)** en portátil (e4b) y homeserver (E2B + prompt endurecido); fechas relativas y estimaciones también validadas |
| 0.7 | Medir latencia (segundos por captura, ¿aceptable?) | ✅ Hecho | Portátil (CPU): mediana 69,6 s. **Homeserver: mediana 27,9 s**, con ~20 s de overhead interno de Ollama a investigar (cómputo real ~4 s) |
| 0.8 | Decisión GO/NO-GO y registro en el roadmap | ✅ Hecho | **GO** (usuario, 2026-07-23) |

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
| 2026-07-23 | 0.1 | 5 audios AAC reales grabados por el usuario en `spike/audios/`. |
| 2026-07-23 | 0.2 | STT operativo: `stt.py` (faster-whisper `small` int8, CPU, venv propio) con normalización previa a WAV 16 kHz vía ffmpeg (PyAV no traga el ADTS/AAC directo) + wrapper `src/stt.ts` validado con Zod. 5/5 transcripciones correctas, ~3,2 s/audio incluyendo carga del modelo. Smoke test de integración en Vitest. |
| 2026-07-23 | 0.4 | `src/structure.ts`: Ollama `/api/chat` con `format` JSON schema + Zod + reintento con feedback ("hoy" siempre inyectado). Hallazgo: las restricciones finas del schema (`pattern`, `minimum`, `minLength`) rompen el compilador de gramática de Ollama 0.20.2 → el `format` solo lleva tipos/enum y Zod hace el resto. Integración real (gateada con `SPIKE_INTEGRATION=1`): 5/5 JSON válidos al primer intento, cero campos inventados. ⚠️ Latencia en este portátil (CPU): 63–85 s/captura — riesgo para el criterio "pocos segundos"; a medir en 0.7 (¿homeserver con GPU / modelo menor / keep_alive?). |
| 2026-07-23 | 0.5 | CLI `pnpm capture` (src/run.ts): audio(s) → STT → Gemma → JSON validado, con métricas por paso y resumen agregado. "Hoy" se resuelve una vez en el borde del CLI. |
| 2026-07-23 | 0.6–0.7 | Lote completo (5 audios): fiabilidad **5/5 (100 %)**, todo al primer intento, títulos limpios y sin campos inventados. Latencia total mediana **69,6 s** (mín 62,7 · máx 99,1): STT ~4 s, Gemma ~66 s en CPU del portátil. Salvedades: (a) ningún audio del lote menciona fechas/estimaciones → la resolución de fechas relativas queda sin medir; (b) la latencia está medida en el portátil, no en el homeserver. |
| 2026-07-23 | 0.8 | **GO** confirmado por el usuario. Fase 0 cerrada; se desbloquea la Fase 1. Pendiente no bloqueante: investigar en el homeserver el overhead (~20 s) de Ollama por petición. |
| 2026-07-23 | 0.6–0.7 (homeserver) | Medición contra el Ollama del homeserver (192.168.1.46, Ollama 0.30.8, `gemma4:latest` = **E2B 4,6B Q4, 100 % en VRAM**). El E2B inventaba `start_date = hoy` (4/5) → **prompt endurecido** (regla explícita de fechas + 2 ejemplos few-shot) y quedó **5/5 sin inventar nada**; además resuelve bien fechas relativas («el viernes» → 2026-07-24) y estimaciones («un par de horas» → 120). Latencia: **mediana 27,9 s/captura** (STT ~3,6 + Gemma ~24). Ojo: el cómputo real de Gemma son ~4 s (load 0,5 + prompt 0,5 + gen 2,7); hay **~20 s de overhead interno de Ollama** en el homeserver (¿cola de otros clientes? ¿PLE del E2B?) — investigar allí; no es el JSON schema (sin `format` tarda igual). Con ese overhead resuelto, la captura completa quedaría en ~8 s. |
