import type { Migration } from "../migrations.js";

/**
 * Lista ordenada de migraciones de la app. La migración inicial del modelo
 * de datos (project, item, time_log, …) llega con la tarea 1.4.
 */
export const migrations: readonly Migration[] = [];
