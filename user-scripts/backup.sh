#!/bin/bash
# Unraid User Scripts: daily world backup. Suggested schedule: 0 4 * * *
# Stops the server so the save is consistent, archives Saved/, starts it again,
# and keeps only the newest DW_KEEP_BACKUPS archives.
. /mnt/user/appdata/build/dragonwilds-unraid/config.sh

mkdir -p "$DW_BACKUP_DIR"
echo "Stopping $DW_CONTAINER"
docker stop -t 60 "$DW_CONTAINER"

backup_tar="$DW_BACKUP_DIR/dragonwilds-$(date +%Y-%m-%d-%H%M%S).tar.gz"
if tar -czf "$backup_tar" -C "$DW_SERVER_DIR/RSDragonwilds" Saved; then
  echo "Backup written: $backup_tar ($(du -h "$backup_tar" | cut -f1))"
else
  echo "Backup FAILED"
fi

echo "Starting $DW_CONTAINER"
docker start "$DW_CONTAINER"

cd "$DW_BACKUP_DIR" && ls -t dragonwilds-2*.tar.gz | tail -n +$((DW_KEEP_BACKUPS + 1)) | xargs -r -d '\n' rm --
echo "Old backups cleaned up (keeping $DW_KEEP_BACKUPS)"
