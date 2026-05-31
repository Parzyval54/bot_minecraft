#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  migrate_player_data.sh [--dry-run] <server_root> <world_name> <player_name> <old_uuid>

Examples:
  ./migrate_player_data.sh /opt/minecraft world Kkyuune 1df075c9-faac-44b6-9f1b-36083c9edc28
  ./migrate_player_data.sh --dry-run /opt/minecraft world Kkyuune 1df075c9-faac-44b6-9f1b-36083c9edc28

This script renames:
  <world>/playerdata/<old_uuid>.dat -> <world>/playerdata/<offline_uuid>.dat
  <world>/stats/<old_uuid>.json -> <world>/stats/<offline_uuid>.json
  <world>/advancements/<old_uuid>.json -> <world>/advancements/<offline_uuid>.json
EOF
}

dry_run=false
if [[ ${1:-} == "--dry-run" ]]; then
  dry_run=true
  shift
fi

if [[ $# -ne 4 ]]; then
  usage
  exit 1
fi

server_root=$1
world_name=$2
player_name=$3
old_uuid=$4
world_dir="$server_root/$world_name"

if [[ ! -d "$world_dir" ]]; then
  echo "World directory not found: $world_dir" >&2
  exit 1
fi

offline_uuid=$(python3 - "$player_name" <<'PY'
import hashlib
import sys
import uuid

name = sys.argv[1]
digest = bytearray(hashlib.md5(("OfflinePlayer:" + name).encode("utf-8")).digest())
digest[6] = (digest[6] & 0x0F) | 0x30
digest[8] = (digest[8] & 0x3F) | 0x80
print(uuid.UUID(bytes=bytes(digest)))
PY
)

echo "Player: $player_name"
echo "Old UUID: $old_uuid"
echo "Offline UUID: $offline_uuid"
echo "World: $world_dir"

files=(
  "playerdata/$old_uuid.dat:playerdata/$offline_uuid.dat"
  "stats/$old_uuid.json:stats/$offline_uuid.json"
  "advancements/$old_uuid.json:advancements/$offline_uuid.json"
)

for entry in "${files[@]}"; do
  source_rel=${entry%%:*}
  target_rel=${entry#*:}
  source_path="$world_dir/$source_rel"
  target_path="$world_dir/$target_rel"

  if [[ ! -e "$source_path" ]]; then
    echo "Skip missing file: $source_path"
    continue
  fi

  if $dry_run; then
    echo "Would move: $source_path -> $target_path"
  else
    mv "$source_path" "$target_path"
    echo "Moved: $source_path -> $target_path"
  fi
done

if $dry_run; then
  echo "Dry run complete."
else
  echo "Migration complete."
fi