# Scheduled scripts

Both scripts are for the Unraid **User Scripts** plugin (Apps → search "User Scripts").

| Script | Suggested schedule | What it does |
|---|---|---|
| `user-scripts/backup.sh` | `0 4 * * *` (daily 04:00) | Stops the server, archives `Saved/`, starts it again, keeps the newest `DW_KEEP_BACKUPS` archives |
| `user-scripts/rebuild.sh` | `30 4 1 * *` (monthly) | Rebuilds both images with current base-image security updates and recreates the containers |

Because every container start runs a SteamCMD update check, the nightly backup doubles as the
nightly game-update check.

## Adding them

1. **Settings → User Scripts → Add New Script**, name it `dragonwilds_backup`.
2. Click the script name → **Edit Script**, and paste:

```bash
#!/bin/bash
/mnt/user/appdata/build/dragonwilds-unraid/user-scripts/backup.sh
```

3. Set the schedule to **Custom** and enter `0 4 * * *`, then **Apply**.
4. Repeat for `dragonwilds_rebuild` with `rebuild.sh` and `30 4 1 * *`.

Use **Run Script** once to check each works. Logs appear in the plugin.

## Restoring a backup

```bash
. /mnt/user/appdata/build/dragonwilds-unraid/config.sh
docker stop -t 60 Dragonwilds
tar -xzvf $DW_BACKUP_DIR/dragonwilds-<date>.tar.gz -C $DW_SERVER_DIR/RSDragonwilds
docker start Dragonwilds
```

The archive contains the whole `Saved/` folder: world, settings and logs.
