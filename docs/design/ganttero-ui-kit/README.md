# Ganttero UI kit — referencia de diseño

Copia local del UI kit del design system en claude.ai/design (fuente de verdad):
`https://claude.ai/design/p/0eea579b-6bec-4a73-ba12-fd6757545ad6` → `ui_kits/ganttero/`.

Los **tokens** y los **componentes del shell** ya están portados al frontend
(`frontend/src/design/` y `frontend/src/components/ds/`). Estos ficheros son la
referencia para las vistas que llegan en fases posteriores:

| Fichero | Se implementa en |
|---------|------------------|
| `views.jsx` → `KanbanView` (4 columnas, orden por prioridad derivada, TaskCard) | Fase 2 |
| `views.jsx` → `GanttView` (tabs de zoom, barras de épica lime, línea HOY) + `gantt-detail.html` | Fase 3 |
| `panels.jsx` → `TaskDetail` (estado ↔ time_log, commits enlazados) | Fases 2 y 6 |
| `panels.jsx` → `VoiceCapture` (● grabando → formulario pre-relleno) | Fase 5 |
| `panels.jsx` → `AjustesView`, `ProjectSelector`, `ProjectDialog`, `ProjectDelete` | Fases 1.5–2 |
| `data.jsx` (datos de ejemplo + reglas de prioridad de referencia) | — |

Componentes del DS aún sin portar (traer de claude.ai/design cuando toquen):
`TaskCard`, `KeyChip`, `Tag`, `Dialog`, `Tabs`, `Input`, `Select`, `Switch`, `Checkbox`.
`gantt-detail.html` (Gantt a escala semana con dependencias) tampoco está copiado aún — verlo en el proyecto de claude.ai/design.
