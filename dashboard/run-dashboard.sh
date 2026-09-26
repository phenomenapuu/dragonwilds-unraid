#!/bin/bash
# Creates (or recreates) the two dashboard containers.
#   dw-control  the only container with Docker access; internal network, no internet, no ports
#   dw-dash     the web UI; no Docker access, published on the LAN only
# The login password and player history live in DW_DASH_DATA and survive recreation.
set -e
cd "$(dirname "$0")/.."
. ./config.sh

DOCKER_GID=$(stat -c %g /var/run/docker.sock)

mkdir -p "$DW_DASH_DATA/data"
chown "$DW_PUID:$DW_PGID" "$DW_DASH_DATA/data" && chmod 700 "$DW_DASH_DATA/data"
mkdir -p "$DW_BACKUP_DIR" && chown "$DW_PUID:$DW_PGID" "$DW_BACKUP_DIR"

# Shared secret between the two containers.
if [ ! -s "$DW_DASH_DATA/control.token" ]; then
  (umask 077; head -c 48 /dev/urandom | base64 | tr -d '/+=\n' > "$DW_DASH_DATA/control.token")
fi
TOKEN=$(cat "$DW_DASH_DATA/control.token")

docker network inspect "$DW_INTERNAL_NETWORK" >/dev/null 2>&1 || docker network create --internal "$DW_INTERNAL_NETWORK" >/dev/null
docker network inspect "$DW_WEB_NETWORK" >/dev/null 2>&1 || docker network create "$DW_WEB_NETWORK" >/dev/null

for c in dw-dash dw-control; do docker rm -f $c >/dev/null 2>&1 || true; done

docker run -d --name dw-control --restart unless-stopped \
  --network "$DW_INTERNAL_NETWORK" \
  --user "$DW_PUID:$DW_PGID" --group-add "$DOCKER_GID" \
  --read-only --tmpfs /tmp:size=16m \
  --cap-drop=ALL --security-opt no-new-privileges:true \
  --memory="$DW_CONTROL_MEMORY" --pids-limit=64 \
  -e CONTROL_TOKEN="$TOKEN" -e DW_CONTAINER="$DW_CONTAINER" -e DW_STEAM_APP_ID="$DW_STEAM_APP_ID" \
  -e DW_KEEP_BACKUPS="$DW_KEEP_BACKUPS" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$DW_SERVER_DIR/RSDragonwilds/Saved:/game/Saved:ro" \
  -v "$DW_SERVER_DIR/steamapps:/steamapps:ro" \
  -v "$DW_BACKUP_DIR:/backups" \
  "$DW_DASH_IMAGE" node /app/control.js >/dev/null

docker run -d --name dw-dash --restart unless-stopped \
  --network "$DW_WEB_NETWORK" \
  --user "$DW_PUID:$DW_PGID" \
  --read-only --tmpfs /tmp:size=16m \
  --cap-drop=ALL --security-opt no-new-privileges:true \
  --memory="$DW_DASH_MEMORY" --pids-limit=64 \
  -e CONTROL_TOKEN="$TOKEN" -e DW_STEAM_APP_ID="$DW_STEAM_APP_ID" \
  -v "$DW_DASH_DATA/data:/data" \
  -p "${DW_LAN_IP:+$DW_LAN_IP:}$DW_DASH_PORT:8890" \
  "$DW_DASH_IMAGE" node /app/web.js >/dev/null
docker network connect "$DW_INTERNAL_NETWORK" dw-dash

echo "Dashboard: http://${DW_LAN_IP:-<server-ip>}:$DW_DASH_PORT"
echo "Password:  $DW_DASH_DATA/data/INITIAL_PASSWORD.txt (first run only)"
