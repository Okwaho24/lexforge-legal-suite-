#!/usr/bin/env bash
# LexForge™ + AcerbE™ co-located launcher (one container / one machine).
# AcerbE listens on loopback only; LexForge is the only public listener.
set -euo pipefail

: "${DATA_DIR:?DATA_DIR must point at a persistent volume (e.g. /data/lexforge)}"
: "${ACERBE_API_KEY:?}" "${ACERBE_SECRET_KEY:?}" "${ACERBE_REGISTRY_KEY:?}"
: "${RAPAX_WEBHOOK_SECRET:?}" "${DOWNLOAD_SIGNING_SECRET:?}"

ACERBE_SRC="${ACERBE_SRC:-$(cd "$(dirname "$0")/.." && pwd)/acerbe}"
PY="${PYTHON:-python3}"
[ -f "$ACERBE_SRC/server.py" ] || { echo "AcerbE server not found at $ACERBE_SRC/server.py" >&2; exit 1; }

WORK_DIR="${WORK_DIR:-$DATA_DIR/work}"
umask 077
mkdir -p "$DATA_DIR" "$WORK_DIR" "$DATA_DIR/acerbe/output" "$DATA_DIR/acerbe"

export ACERBE_HOST=127.0.0.1
export ACERBE_PORT="${ACERBE_PORT:-7749}"
export ACERBE_ENV=production
export ACERBE_ALLOWED_INPUT_DIRS="$WORK_DIR"
export ACERBE_OUTPUT_DIR="$DATA_DIR/acerbe/output"
export ACERBE_REGISTRY="${ACERBE_REGISTRY:-$DATA_DIR/acerbe/acerbe_registry.db}"
export ACERBE_BASE_URL="http://127.0.0.1:${ACERBE_PORT}"
export WORK_DIR

"$PY" "$ACERBE_SRC/server.py" &
ACERBE_PID=$!
cleanup() { kill "$ACERBE_PID" "${NODE_PID:-}" 2>/dev/null || true; }
trap cleanup TERM INT EXIT

for _ in $(seq 1 60); do
  if "$PY" - <<PYEOF 2>/dev/null
import os, sys, urllib.request
r = urllib.request.Request("http://127.0.0.1:${ACERBE_PORT}/health", headers={"X-AcerbE-Key": os.environ["ACERBE_API_KEY"]})
sys.exit(0 if urllib.request.urlopen(r, timeout=2).status == 200 else 1)
PYEOF
  then READY=1; break; fi
  kill -0 "$ACERBE_PID" 2>/dev/null || { echo "AcerbE exited during startup" >&2; exit 1; }
  sleep 0.5
done
[ "${READY:-0}" = 1 ] || { echo "AcerbE did not become healthy in 30s" >&2; exit 1; }

node --disable-warning=ExperimentalWarning "$(cd "$(dirname "$0")/.." && pwd)/src/index.js" &
NODE_PID=$!

# If either process dies, stop the other and exit non-zero so the platform restarts the container.
wait -n "$ACERBE_PID" "$NODE_PID"
echo "a child process exited — shutting down" >&2
exit 1
