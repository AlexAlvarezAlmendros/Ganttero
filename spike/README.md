# Spike de voz (Fase 0)

Prototipo **aislado** (no forma parte del monorepo de la app) que valida el pipeline
`audio → STT (Whisper) → Gemma 4 → JSON de tarea validado con Zod`.
Es el **gate GO/NO-GO** del proyecto: ver [el plan de fase](../docs/planning/plans/00-spike-voz.md).

## Estado del pipeline

| Paso | Fichero | Estado |
|------|---------|--------|
| Contrato de salida (Zod) | `src/schema.ts` | ✅ |
| Audios de prueba | `audios/` | ⬜ pendiente de grabar |
| STT (Whisper.cpp / faster-whisper) | `src/stt.ts` | ⬜ |
| Prompt + llamada a Gemma 4 | `src/structure.ts` | ⬜ |
| CLI que encadena todo | `src/run.ts` | ⬜ |
| Medición fiabilidad/latencia | `src/bench.ts` | ⬜ |

## Cómo grabar los audios de prueba (tarea 0.1)

1. Graba 10–15 clips de 5–20 s describiendo tareas reales, en el idioma y tono en que
   usarías la app de verdad. Ejemplos:
   - «Añadir la migración inicial de la base de datos, unas dos horas, para este viernes.»
   - «Épica: integración con GitHub. Empieza la semana que viene y depende del módulo de proyectos.»
   - Incluye alguno "difícil": ruido de fondo, frases a medias, sin fechas.
2. Guárdalos en `spike/audios/` como `NN-descripcion.wav` (o `.ogg`/`.m4a`).
   La carpeta está en `.gitignore`: los audios no se commitean.
3. Con los audios en su sitio se desbloquean las tareas 0.2 → 0.5.

## Comandos

```bash
cd spike
pnpm install
pnpm typecheck
pnpm test
```

## Criterio de aceptación de la fase

≥ ~80 % de los audios producen un JSON usable en pocos segundos → **GO**.
Si no, se replantea la captura por voz antes de invertir en el Gantt.
