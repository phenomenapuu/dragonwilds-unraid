# Configuration

## Repository settings

`config.sh` holds paths, ports, limits and the pinned upstream commit. Every value can be overridden
by the environment, and `config.local.sh` (gitignored) overrides everything:

```bash
cp config.sh config.local.sh   # then edit
```

Common changes:

| Variable | Default | Notes |
|---|---|---|
| `DW_APPDATA` | `/mnt/cache/appdata` | Use `/mnt/user/appdata` if appdata isn't on a pool named `cache` |
| `DW_LAN_IP` | empty | Bind the dashboard to one address; empty publishes on all interfaces |
| `DW_MEMORY` / `DW_CPUS` | `8g` / `4` | Game server limits |
| `DW_KEEP_BACKUPS` | `7` | How many backup archives to keep |
| `DW_UPSTREAM_COMMIT` | pinned | Bump after reviewing upstream changes |

## Game settings

The game writes `DedicatedServer.ini` on first start:

```
<DW_SERVER_DIR>/RSDragonwilds/Saved/Config/LinuxServer/DedicatedServer.ini
```

Note the `RSDragonwilds/` folder — upstream's README omits it.

```ini
[/Script/Dominion.DedicatedServerSettings]
OwnerId=                     ; your Player ID — required
ServerName=                  ; what players search for (case-sensitive)
WorldPassword=               ; empty = anyone can join
DefaultWorldName=
PlatformPolicy=Crossplay
bAllowSendingCrashDumps=True ; False stops crash reports going to Jagex
```

**Stop the server before editing**, or the game may overwrite your changes on shutdown:

```bash
docker stop -t 60 Dragonwilds && nano <path above> && docker start Dragonwilds
```

**OwnerId** is your Dragonwilds Player ID: start the game, open **Settings** from the main menu, and
copy **My Player ID** from the bottom left. Without it the server logs
`An OwnerId is required for normal Server operation.`

Your edits survive game updates: the start script copies the file aside before SteamCMD runs and
restores it afterwards.

## Roles

| Role | How | Can |
|---|---|---|
| Owner | Player ID matches `OwnerId` | Ban and unban anyone, online or offline |
| Admin | Knows the admin password | Ban online regular players |
| Player | Knows the world password | Play |

Kick and ban live in-game under **Settings → Server Management**. There is no whitelist and no remote
console — see [security.md](security.md).
