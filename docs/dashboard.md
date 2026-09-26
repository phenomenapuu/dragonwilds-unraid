# Dashboard internals

```
browser ──HTTP──> dw-dash ──HTTP+token──> dw-control ──unix socket──> Docker
  (LAN)            (no docker access)      (internal network only)
                                                 │
                                    read-only: Saved/, steamapps/
                                    read-write: backups/
```

`dw-dash` polls `dw-control` every 5 s (status, job, new log lines) and every 60 s (settings,
backups), keeps the derived state in memory, and serves it to browsers as one JSON document at
`/api/state`. Browsers never talk to `dw-control`.

## dw-control endpoints

All require the `x-control-token` header (a shared secret generated on first run).

| Method | Path | Returns |
|---|---|---|
| GET | `/status` | Container state, uptime, CPU, memory, ports, image build date |
| GET | `/settings` | Server name, world, owner ID, whether a password is set, installed game build |
| GET | `/backups` | Archive list with sizes and timestamps |
| GET | `/gamelog?id=<inode>&offset=<bytes>` | New log lines, or a full rescan when the file rotated |
| GET | `/job` | Current or last operation and its result |
| POST | `/action/{start,stop,restart,backup}` | Queues one operation (one at a time) |

## Reading the log

The game's stdout is block-buffered, so `docker logs` can lag minutes behind on an idle server —
which made health checks and join times wrong. `dw-control` reads
`Saved/Logs/RSDragonwilds.log` instead, tracking the file by inode and byte offset: it sends only
new bytes, and when the game rotates the file on restart it sends a filtered full scan plus the
last 500 lines.

Timestamps come from the game's own `[2026.09.19-08.39.54:507]` prefix (UTC).

## Player history

Derived from the log:

| Line | Meaning |
|---|---|
| `LogDomMatcherSession: Player ADDED to session [<id>]-[<name>]` | joined |
| `LogDomMatcherSession: Player Removed from session [<id>]-[<name>]` | left |

Sessions, playtime and recent activity are kept in `data/players.json`. Closed sessions are recorded
by key so a rescan after a restart can't count the same session twice. If the container stops with
players online, their sessions end at the container's stop time.

`tools/import-history.js` rebuilds the history from older logs (rotated `RSDragonwilds-backup-*.log`
files and a `docker logs` dump of a previous container). It pairs joins with leaves and ends
unmatched sessions at the last line of that run:

```bash
docker stop dw-dash
docker run --rm --user 99:100 --network none \
  -v $PWD/dashboard/tools/import-history.js:/import.js:ro \
  -v <appdata>/rsdw-dedicated/RSDragonwilds/Saved/Logs:/logs:ro \
  -v <dir with old-container.log>:/old:ro \
  -v <appdata>/dragonwilds-dash/data:/data \
  node:22-alpine node /import.js
docker start dw-dash
```

## Health

| Shown | Meaning |
|---|---|
| Online | Heartbeat to Epic within the last 3 minutes — the server is listed in the browser |
| Starting | Container up, but the game hasn't reported listening yet (SteamCMD may be updating) |
| Degraded | Running, but no heartbeat for 3+ minutes |
| Stopped / Missing | Container not running, or gone |

Errors the game prints on a healthy server (weapon-skill lookups, navmesh size, missing online
subsystem) are filtered out; the rest are grouped with a count.
