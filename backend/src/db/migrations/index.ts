import type { Migration } from "../migrations.js";
import { modeloInicial } from "./001-modelo-inicial.js";

/** Lista ordenada de migraciones de la app. */
export const migrations: readonly Migration[] = [modeloInicial];
