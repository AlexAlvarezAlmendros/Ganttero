#!/usr/bin/env bash
# Backup del fichero libSQL con retención. Pensado para el cron del homeserver:
#   15 3 * * * /ruta/Ganttero/scripts/backup-db.sh /mnt/nas/ganttero /mnt/nas/backups/ganttero 14
set -euo pipefail

DATA_DIR="${1:?uso: backup-db.sh <data_dir> <backup_dir> [copias_a_conservar]}"
BACKUP_DIR="${2:?uso: backup-db.sh <data_dir> <backup_dir> [copias_a_conservar]}"
KEEP="${3:-14}"
DB="$DATA_DIR/ganttero.db"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

[ -f "$DB" ] || { echo "no existe $DB" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

# sqlite3 .backup hace copia consistente aunque la app esté escribiendo;
# si no está instalado, cp (suficiente: un solo usuario, escrituras raras).
if command -v sqlite3 >/dev/null 2>&1; then
	sqlite3 "$DB" ".backup '$BACKUP_DIR/ganttero-$STAMP.db'"
else
	cp "$DB" "$BACKUP_DIR/ganttero-$STAMP.db"
fi

# Retención: conserva las $KEEP más recientes
ls -1t "$BACKUP_DIR"/ganttero-*.db 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "backup ok: ganttero-$STAMP.db ($(ls -1 "$BACKUP_DIR"/ganttero-*.db | wc -l) copias)"
