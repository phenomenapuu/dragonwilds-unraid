#!/bin/bash
# Creates (or recreates) the game server container. Game files, world saves and settings live in
# appdata and are kept. This is the single source of truth for the container's settings.
set -e
cd "$(dirname "$0")/.."
. ./config.sh

if docker inspect "$DW_CONTAINER" >/dev/null 2>&1; then
  echo "Stopping $DW_CONTAINER (the game saves the world on shutdown)"
  docker stop -t 60 "$DW_CONTAINER" >/dev/null
  docker rm "$DW_CONTAINER" >/dev/null
fi

docker network inspect "$DW_NETWORK" >/dev/null 2>&1 || docker network create "$DW_NETWORK" >/dev/null

docker run -d --name="$DW_CONTAINER" --restart unless-stopped \
  --network "$DW_NETWORK" \
  -e UID="$DW_PUID" -e GID="$DW_PGID" -e UMASK="$DW_UMASK" \
  -e GAME_PORT="$DW_GAME_PORT" -e GAME_PARAMS="-log -NewConsole" \
  --memory="$DW_MEMORY" --cpus="$DW_CPUS" --pids-limit="$DW_PIDS" \
  --security-opt no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=CHOWN --cap-add=DAC_OVERRIDE --cap-add=FOWNER \
  --cap-add=SETUID --cap-add=SETGID --cap-add=KILL \
  -v "$DW_STEAMCMD_DIR:/serverdata/steamcmd:rw" \
  -v "$DW_SERVER_DIR:/serverdata/serverfiles:rw" \
  -p "$DW_GAME_PORT:$DW_GAME_PORT/udp" \
  -p "$DW_BEACON_PORT:$DW_BEACON_PORT/udp" \
  "$DW_IMAGE" 2>&1 | grep -v 'swap limit' || true

docker ps --filter "name=$DW_CONTAINER" --format '{{.Names}} | {{.Status}} | {{.Ports}}'
echo "First start downloads ~5.5 GB. Follow it with: docker logs -f $DW_CONTAINER"
