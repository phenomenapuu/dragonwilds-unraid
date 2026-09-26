#!/bin/bash
# Copies this repository to the Unraid server and rebuilds the dashboard there.
# Usage: DW_HOST=unraid ./deploy.sh [--server]
#   --server also rebuilds and recreates the game server container (brief downtime).
set -e
cd "$(dirname "$0")"
: "${DW_HOST:=unraid}"
: "${DW_REMOTE_DIR:=/mnt/user/appdata/build/dragonwilds-unraid}"

echo "==> Copying to $DW_HOST:$DW_REMOTE_DIR"
ssh "$DW_HOST" "mkdir -p $DW_REMOTE_DIR"
tar --exclude=.git --exclude=config.local.sh -cf - . | ssh "$DW_HOST" "tar -xf - -C $DW_REMOTE_DIR"
ssh "$DW_HOST" "cd $DW_REMOTE_DIR && find . -type f \( -name '*.sh' -o -name '*.js' \) -exec sed -i 's/\r\$//' {} + && chmod +x *.sh */*.sh"

echo "==> Rebuilding dashboard"
ssh "$DW_HOST" "cd $DW_REMOTE_DIR && docker build -q -t dragonwilds-dash:local dashboard >/dev/null && ./dashboard/run-dashboard.sh"

if [ "$1" = "--server" ]; then
  echo "==> Rebuilding game server (downtime)"
  ssh "$DW_HOST" "cd $DW_REMOTE_DIR && ./server/install-server.sh"
fi

echo "==> Done"
ssh "$DW_HOST" "docker ps --filter name=dw- --filter name=Dragonwilds --format '{{.Names}} | {{.Status}}'"
