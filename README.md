# dragonwilds-unraid

A hardened **RuneScape: Dragonwilds** dedicated server for Unraid, plus a web dashboard for
watching and controlling it.

![status](https://img.shields.io/badge/runs%20on-Unraid%207.x-orange) ![deps](https://img.shields.io/badge/npm%20dependencies-0-brightgreen)

The game server itself is built from [ppetro08/dragonwilds](https://github.com/ppetro08/dragonwilds)
(which builds on [ich777](https://github.com/ich777)'s SteamCMD server images). This repository adds:

- **a fix that makes the image build again** — upstream pins Debian 11, whose security repository is
  archived, so `apt-get` 404s mid-build
- **container hardening** — no extra Linux capabilities, no privilege escalation, memory/CPU/process
  limits, its own Docker network
- **scheduled backups and rebuilds** as Unraid User Scripts
- **a dashboard** showing status, players, playtime, backups, errors, the live log, and whether the
  game server is behind Steam's current build — with Start / Stop / Restart / Back up now behind a login

## The dashboard

Two containers, split so the web UI never touches Docker:

| Container | Docker access | Network | Job |
|---|---|---|---|
| `dw-control` | yes, the socket | internal only, no internet, no published port | A fixed list of operations on one container: start, stop, restart, back up. Reads the game log, settings and backups. Strips the world password out of log lines before anything leaves it. |
| `dw-dash` | none | LAN, published on one address | Serves the page and the JSON it reads. Login gates every control. |

Both run read-only, unprivileged, with `no-new-privileges` and small memory and process limits.
No npm dependencies: it's Node's standard library and busybox.

It reads the game's **own log file** rather than `docker logs`, because the server's console output
is block-buffered and arrives minutes late when the server is idle — which made health and join
times wrong.

## Install

On the Unraid server (Terminal, or SSH):

```bash
mkdir -p /mnt/user/appdata/build && cd /mnt/user/appdata/build
git clone https://github.com/USER/dragonwilds-unraid.git
cd dragonwilds-unraid
cp config.sh config.local.sh   # edit paths, ports, limits, LAN IP
./server/install-server.sh     # builds the image, starts the server (~5.5 GB download)
```

Watch the first start with `docker logs -f Dragonwilds`. When it's running, stop it, set your
**OwnerId**, server name and passwords in
`<appdata>/rsdw-dedicated/RSDragonwilds/Saved/Config/LinuxServer/DedicatedServer.ini`
(see [docs/configuration.md](docs/configuration.md)), then start it again.

Then the dashboard:

```bash
docker build -t dragonwilds-dash:local dashboard
./dashboard/run-dashboard.sh
```

It prints the URL and where to find the generated password. New password any time:

```bash
docker exec dw-dash node /app/web.js reset-password
```

Finally add `user-scripts/backup.sh` and `user-scripts/rebuild.sh` to the **User Scripts** plugin —
see [docs/scheduling.md](docs/scheduling.md).

## Ports

| Port | Protocol | Who needs it |
|---|---|---|
| 7777 | UDP | Players. Forward it only if people play from outside your network. |
| 8888 | UDP | World settings. Forward it too if you manage settings from outside. |
| 8890 | TCP | The dashboard. Keep it on your LAN; use a VPN from outside. |

## Documentation

- [docs/configuration.md](docs/configuration.md) — settings file, passwords, owner ID
- [docs/scheduling.md](docs/scheduling.md) — backup and rebuild User Scripts
- [docs/updating.md](docs/updating.md) — how game updates work, and fixing a stuck update
- [docs/security.md](docs/security.md) — what's hardened, what isn't, and what the game can't do
- [docs/dashboard.md](docs/dashboard.md) — internals, endpoints, player history

## Credits

- [ppetro08/dragonwilds](https://github.com/ppetro08/dragonwilds) — the server image and start scripts
- [ich777/docker-steamcmd-server](https://github.com/ich777/docker-steamcmd-server) — the base image approach
- RuneScape: Dragonwilds is made by Jagex. This project is not affiliated with Jagex.

Neither upstream repository carries a licence, so this repository does not redistribute their files.
`server/install-server.sh` fetches ppetro08's repository at a pinned commit and patches one line.

## Licence

MIT — see [LICENSE](LICENSE). Applies to the code in this repository only.
