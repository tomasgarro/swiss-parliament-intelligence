#!/usr/bin/env bash
# Pulls Canary receipts completed since the previous pull from every worker directory on the LaunchPad node,
# as one checksummed archive, then validates and imports them (scripts/import-public-processing.mjs).
# Receipts only: no media, credentials or worker databases leave the node. Run from the repository root.
set -euo pipefail
R=$(pwd)
KEY=(-i "$R/data/pilot-launchpad-key" -o IdentitiesOnly=yes -o BatchMode=yes -o UserKnownHostsFile="$R/data/launchpad-known-hosts")
HOST=nvidia@global.prd.ga.launchpad.nvidia.com
BASE=/home/nvidia/swiss-parliament-intelligence/handoffs
DIRS="cleisthenes-20260922-131027 next-20260924/shard-0 next-20260924/shard-1 next-20260924/shard-2"
NAME=receipts-$(date +%Y%m%d-%H%M%S)
ssh "${KEY[@]}" -p 12516 "$HOST" "set -e; S=~/checkpoints/$NAME; mkdir -p \$S
  M=~/checkpoints/.last-pull; [ -f \$M ] || touch -d '2026-09-24 14:00' \$M; touch ~/checkpoints/.this-pull
  for d in $DIRS; do find $BASE/\$d/session-output -maxdepth 1 -regextype egrep -regex '.*/[0-9]+-canary\.json' -newer \$M -exec cp -l {} \$S/ \; ; done
  ls \$S | wc -l; tar -czf \$S.tar.gz -C \$S .; sha256sum \$S.tar.gz | cut -d' ' -f1" > /tmp/pull.remote
COUNT=$(head -1 /tmp/pull.remote); REMOTE_SHA=$(tail -1 /tmp/pull.remote)
echo "receipts since last pull: $COUNT"
mkdir -p data/gpu-processing/checkpoints
scp -q "${KEY[@]}" -P 12516 "$HOST:checkpoints/$NAME.tar.gz" "data/gpu-processing/checkpoints/$NAME.tar.gz"
LOCAL_SHA=$(sha256sum "data/gpu-processing/checkpoints/$NAME.tar.gz" | cut -d' ' -f1)
[ "$REMOTE_SHA" = "$LOCAL_SHA" ] || { echo "SHA_MISMATCH remote=$REMOTE_SHA local=$LOCAL_SHA"; exit 1; }
echo "sha256 $LOCAL_SHA verified"
if tar -tzf "data/gpu-processing/checkpoints/$NAME.tar.gz" | grep -vE '^(\./)?$|^(\./)?[0-9]+-canary\.json$'; then echo UNEXPECTED_FILES; exit 1; fi
D=data/gpu-processing/checkpoints/$NAME; mkdir -p "$D"; tar -xzf "$D.tar.gz" -C "$D"
node scripts/import-public-processing.mjs "$D" 2>&1 | grep -v -i warning | tail -3
# Advance the marker only after a verified, imported pull.
ssh "${KEY[@]}" -p 12516 "$HOST" "mv ~/checkpoints/.this-pull ~/checkpoints/.last-pull"
