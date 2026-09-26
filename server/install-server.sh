#!/bin/bash
# Builds the game server image from ppetro08/dragonwilds (pinned commit) with our base-image fix,
# then creates the container. Safe to re-run: it rebuilds and recreates, keeping game data.
set -e
cd "$(dirname "$0")/.."
. ./config.sh

SRC="$DW_BUILD_DIR/dragonwilds-upstream"

echo "==> Fetching upstream image source"
mkdir -p "$DW_BUILD_DIR"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --quiet origin
else
  git clone --quiet "$DW_UPSTREAM_REPO" "$SRC"
fi
git -C "$SRC" checkout --quiet --force "$DW_UPSTREAM_COMMIT"
git -C "$SRC" clean -qfd

# Upstream pins Debian 11 (bullseye). Its security repository has been archived, so apt-get in the
# build now 404s. Debian 12 (bookworm) builds cleanly and runs the same scripts.
echo "==> Applying base image fix ($DW_BASE_IMAGE)"
sed -i "s|^FROM .*|FROM $DW_BASE_IMAGE|" "$SRC/Dockerfile"
head -1 "$SRC/Dockerfile"

echo "==> Building $DW_IMAGE"
docker build --pull -t "$DW_IMAGE" "$SRC"

echo "==> Creating container"
./server/run-server.sh
