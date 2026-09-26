#!/bin/bash
# Unraid User Scripts: monthly image rebuild for base-image security updates.
# Suggested schedule: 30 4 1 * *
# Rebuilds both images from the pinned upstream commit and recreates the containers.
# It does NOT pull new upstream code: review changes there yourself before taking them.
REPO=/mnt/user/appdata/build/dragonwilds-unraid
. $REPO/config.sh

old_id=$(docker image inspect -f '{{.Id}}' "$DW_IMAGE" 2>/dev/null)
if ! $REPO/server/install-server.sh; then
  echo "Game server rebuild FAILED - existing container left running"
  exit 1
fi
new_id=$(docker image inspect -f '{{.Id}}' "$DW_IMAGE")
if [ -n "$old_id" ] && [ "$old_id" != "$new_id" ]; then
  docker rmi "$old_id" >/dev/null 2>&1 && echo "Removed old game server image"
fi

if docker build --pull -q -t "$DW_DASH_IMAGE" $REPO/dashboard >/dev/null; then
  $REPO/dashboard/run-dashboard.sh
else
  echo "Dashboard rebuild FAILED - existing containers left running"
fi
