#!/bin/bash
# Shared settings. Every value can be overridden from the environment:
#   DW_LAN_IP=192.168.1.10 ./server/install-server.sh
# Copy to config.local.sh to keep your own values out of git (it is gitignored).

# --- Host paths (Unraid defaults) ---
: "${DW_APPDATA:=/mnt/cache/appdata}"          # appdata pool; use /mnt/user/appdata if not on cache
: "${DW_BUILD_DIR:=/mnt/user/appdata/build}"   # where this repo is deployed on the server
: "${DW_BACKUP_DIR:=/mnt/user/backup/dragonwilds_backups}"

# --- Game server ---
: "${DW_CONTAINER:=Dragonwilds}"
: "${DW_IMAGE:=rsdw-dedicated:local}"
: "${DW_SERVER_DIR:=$DW_APPDATA/rsdw-dedicated}"   # game files + Saved/
: "${DW_STEAMCMD_DIR:=$DW_APPDATA/steamcmd}"
: "${DW_GAME_PORT:=7777}"                          # game traffic (UDP)
: "${DW_BEACON_PORT:=8888}"                        # world settings beacon (UDP)
: "${DW_MEMORY:=8g}"
: "${DW_CPUS:=4}"
: "${DW_PIDS:=1024}"
: "${DW_UMASK:=027}"
: "${DW_PUID:=99}"                                 # Unraid's "nobody"
: "${DW_PGID:=100}"                                # Unraid's "users"
: "${DW_NETWORK:=dragonwilds-net}"
: "${DW_STEAM_APP_ID:=4019830}"

# Upstream image source, pinned. See server/README.md for what we change and why.
: "${DW_UPSTREAM_REPO:=https://github.com/ppetro08/dragonwilds.git}"
: "${DW_UPSTREAM_COMMIT:=b57e27c02df38c09164d86cdd32741414096bef7}"
: "${DW_BASE_IMAGE:=ich777/debian-baseimage:bookworm_amd64}"

# --- Dashboard ---
: "${DW_DASH_IMAGE:=dragonwilds-dash:local}"
: "${DW_DASH_DATA:=$DW_APPDATA/dragonwilds-dash}"
: "${DW_DASH_PORT:=8890}"
: "${DW_LAN_IP:=}"            # bind the dashboard to this address only; empty = all interfaces
: "${DW_DASH_MEMORY:=192m}"
: "${DW_CONTROL_MEMORY:=128m}"
: "${DW_INTERNAL_NETWORK:=dw-internal}"
: "${DW_WEB_NETWORK:=dw-web}"

# --- Backups ---
: "${DW_KEEP_BACKUPS:=7}"

[ -f "$(dirname "${BASH_SOURCE[0]}")/config.local.sh" ] && . "$(dirname "${BASH_SOURCE[0]}")/config.local.sh"
