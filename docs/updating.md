# Updating

## How it works

| What | How it updates | When |
|---|---|---|
| Game server build | SteamCMD checks for a new build on every container start and installs it before the game launches. Your `DedicatedServer.ini` is copied aside first and put back afterwards. | Every start — including the nightly backup restart |
| Container image (Debian packages) | `user-scripts/rebuild.sh` | Monthly, if scheduled |
| Dashboard image | Same script | Monthly |
| Upstream repo code | Never automatically, on purpose | When you bump `DW_UPSTREAM_COMMIT` in `config.sh` |

**The game client and the dedicated server must run the same build.** After a Jagex patch, players
who have updated cannot join until the server restarts and updates. The dashboard compares the
installed build (from SteamCMD's `appmanifest`) with the current public build (from
`api.steamcmd.net`) and shows a warning when they differ.

## Fixing a stuck update

Symptom, in `docker logs Dragonwilds`:

```
CDepotDownloadMgr::BYldRequestDepotManifest(...): Failed to get manifest request code, 'Access Denied'
Error! App '4019830' state is 0x6 after update job.
```

The manifest ID in that line is the **installed** build's file list. SteamCMD fetches it to work out
what changed, and Steam sometimes stops serving old manifests to anonymous logins after a patch.
The update then fails identically on every retry, and the server stays on the old build.

Fix — move the install record aside so SteamCMD treats it as a fresh install. It fetches the new
build's file list, verifies the ~5.5 GB already on disk and downloads only what changed:

```bash
. /mnt/user/appdata/build/dragonwilds-unraid/config.sh
docker stop -t 60 Dragonwilds
mv $DW_SERVER_DIR/steamapps/appmanifest_$DW_STEAM_APP_ID.acf \
   $DW_SERVER_DIR/steamapps/appmanifest_$DW_STEAM_APP_ID.acf.stale
docker start Dragonwilds
docker logs -f Dragonwilds
```

World saves and settings are untouched: they aren't part of the Steam download, and the start script
restores the settings file anyway. Back up first (`user-scripts/backup.sh`) if you want a safety net.
Expect 5–15 minutes. Success looks like `Success! App '4019830' fully installed.`

## Checking versions by hand

```bash
# installed
grep -E '"buildid"|"StateFlags"' $DW_SERVER_DIR/steamapps/appmanifest_$DW_STEAM_APP_ID.acf
# current public build
curl -s https://api.steamcmd.net/v1/info/$DW_STEAM_APP_ID | grep -o '"public":[^}]*}'
```

`StateFlags` `4` means fully installed; `6` means an update is pending, i.e. the last attempt failed.
