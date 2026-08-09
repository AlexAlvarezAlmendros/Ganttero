# Plan 11 — Pulido de UX

> Fase: 11 (post-v1) | Estado: 🔄 En curso | Iniciado: 2026-08-09
> Hito del roadmap: los detalles de uso diario no estorban — nada se pierde por un gesto accidental.

---

## Dependencia con otras fases

- **Requiere:** Fases 1–9 (la app completa en uso diario ✅).
- **Habilita:** nada bloquea a esta fase; es el cajón de las mejoras de uso que salen al usar la app.

---

## Contexto

Fase abierta y continua: aquí caen los arreglos de fricción que aparecen usando Ganttero a
diario, sin plan propio cada uno. Sigue el principio rector: **mínima fricción**.

---

## Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 11.1 | Los modales no se cierran al hacer clic fuera | ✅ Hecho | Un clic fuera perdía el formulario a medio rellenar. Se sale por ✕, CANCELAR o Escape |

---

## Entregable

Detalles de uso resueltos, uno a uno, sin regresiones.

## Criterio de aceptación

- Cada arreglo lleva su test si toca lógica o interacción.
- `pnpm -r typecheck` y `pnpm -r test` en verde.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-08-09 | Plan creado + 11.1 | Fase 11 abierta como cajón de pulido de UX. El clic en el scrim ya no cierra el diálogo: afecta a los 5 modales (alta de ítem, detalle, proyecto, borrar proyecto, captura por voz) porque todos usan `ds/Dialog`. |
