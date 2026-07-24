# Plan 08 — Descripciones markdown con editor rich-text + IA

> Fase: 8 (post-v1) | Estado: ✅ Hecho | Iniciado: 2026-07-24 | Cerrado: 2026-07-24
> Hito del roadmap: escribir la descripción de una tarea es cómodo (WYSIWYG) y un botón la reestructura con la IA local.

---

## Dependencia con otras fases

- **Requiere:** Fase 1 (modelo `item` con `description` ✅), Fase 5 (pipeline Ollama/Gemma ✅).
- **Habilita:** nada bloqueado; mejora transversal de la captura y edición de tareas.

---

## Contexto

- El campo `item.description` (nullable) **ya existe** en la DB, el schema Zod y el PATCH del backend; hoy **no hay UI** que lo edite ni lo muestre.
- La IA local ya está cableada en el módulo `voice` (`voice.structurer.ts` → Ollama `/api/chat`, `OLLAMA_BASE_URL` + `OLLAMA_MODEL`). Se reutiliza el mismo patrón.
- Decisiones de producto (2026-07-24): editor **básico** (negrita, cursiva, títulos, listas, checklists, enlaces, código); botón "Mejorar formato" en modo **reformatear + enriquecer** (puede sugerir subtareas, aclarar y expandir sin cambiar la intención).

---

## Tareas

### Backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 8.1 | `items.describer.ts`: cliente Ollama que reformatea+enriquece markdown (espejo de `voice.structurer.ts`), inyectable por DI | ✅ Hecho | Reutiliza `OLLAMA_BASE_URL`/`OLLAMA_MODEL`; salida markdown libre (sin `format` JSON) |
| 8.2 | Ampliar `items.schema.ts`: subir límite `description` 2000→5000 + `improveDescriptionSchema` (req) y response | ✅ Hecho | El modo enriquecer necesita margen |
| 8.3 | `items.service.ts`: método `improveDescription(text)` que llama al describer (DI) | ✅ Hecho | Envuelve el fallo en DomainError (422) |
| 8.4 | `items.routes.ts`: `POST /items/improve-description` (sin estado, no requiere id) | ✅ Hecho | — |
| 8.5 | Tests: service con describer mockeado (éxito + error) y routes con `inject()` (200/400/422) | ✅ Hecho | + unit test del `OllamaDescriber` (fences/errores) |

### Frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 8.6 | Añadir dependencia de editor (Tiptap v3 headless + task-list + tiptap-markdown) al `frontend/package.json` | ✅ Hecho | Tiptap v3.28 (soporta React 19); StarterKit ya trae Link/Underline |
| 8.7 | Componente `ds/MarkdownEditor.tsx`: WYSIWYG que edita markdown por debajo + toolbar básica + estilos prose en `ds.css` con tokens | ✅ Hecho | Fuente de verdad = markdown; sync externo sin saltos de cursor |
| 8.8 | Hook `useImproveDescription()` en `api/items.ts` (POST al endpoint IA) + test | ✅ Hecho | — |
| 8.9 | Botón "Mejorar formato" integrado en el editor (loading + fallback al texto original si falla) | ✅ Hecho | Error inline; el texto nunca se pierde |
| 8.10 | Cablear el editor en `TaskDetail.tsx` (editar `description`, incluirla en el patch) y en `ItemDialog.tsx` (alta) | ✅ Hecho | — |

---

## Entregable

Desde el detalle de una tarea (y desde el alta) se escribe la descripción en un editor visual, se guarda como markdown, y un botón la reestructura/enriquece con Gemma local. Si la IA falla, se conserva el texto original.

## Criterio de aceptación

- `pnpm biome check .`, `pnpm -r typecheck`, `pnpm -r test` en verde.
- La descripción persiste como markdown y se re-renderiza al reabrir la tarea.
- "Mejorar formato" devuelve markdown mejorado; ante error de la IA no se pierde lo escrito.

---

## Registro de avance

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-07-24 | Plan creado | Fase 8 abierta; `description` ya existía en backend, faltaba UI + IA |
| 2026-07-24 | 8.1–8.10 completadas | Endpoint `POST /items/improve-description` + `MarkdownEditor` (Tiptap v3) en alta y detalle. Backend 115 tests ✅, frontend 24 tests ✅, typecheck ✅, build ✅. Biome limpio en los ficheros nuevos (el repo arrastra deuda de biome previa en ficheros no tocados). Follow-up posible: code-split del editor (bundle +Tiptap ≈277 kB gzip). |
