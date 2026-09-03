#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-${1:-8765}}"
HOST="${HOST:-127.0.0.1}"

cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD=(python3)
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD=(python)
elif command -v py >/dev/null 2>&1; then
    PYTHON_CMD=(py)
else
    echo "No Python found. Install Python or run another static file server from this folder."
    exit 1
fi

echo "Hollywood Animal Calculator"
echo "Serving $ROOT_DIR"
echo "Open: http://$HOST:$PORT/index.html"
echo "Stop: Ctrl+C"
echo

"${PYTHON_CMD[@]}" -m http.server "$PORT" --bind "$HOST"
