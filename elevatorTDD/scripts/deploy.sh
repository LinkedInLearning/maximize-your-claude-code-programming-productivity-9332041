#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="/tmp/elevatorTDD"
ELEVATOR_PORT="${ELEVATOR_PORT:-8001}"
TECHNICIAN_PORT="${TECHNICIAN_PORT:-8002}"
TECHNICIAN_URL_VAR="${TECHNICIAN_URL:-http://localhost:${TECHNICIAN_PORT}}"
READY_TIMEOUT="${READY_TIMEOUT:-15}"

UVICORN="${REPO_ROOT}/.venv/bin/uvicorn"
[ -x "$UVICORN" ] || UVICORN="uvicorn"

mkdir -p "$PID_DIR"

check_port_free() {
  local port="$1" label="$2"
  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "ERROR: port $port already in use (needed for $label). Run scripts/stop.sh first, or check for stray processes." >&2
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >&2 || true
    exit 1
  fi
}

wait_ready() {
  local url="$1" label="$2"
  local deadline=$(( $(date +%s) + READY_TIMEOUT ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if curl -sf -o /dev/null "$url"; then
      echo "  $label ready"
      return 0
    fi
    sleep 0.3
  done
  echo "ERROR: $label not ready at $url after ${READY_TIMEOUT}s" >&2
  return 1
}

check_port_free "$TECHNICIAN_PORT" "technician"
check_port_free "$ELEVATOR_PORT" "elevator"

# Start technician.
TECH_LOG="$PID_DIR/technician.log"
: > "$TECH_LOG"
( cd "$REPO_ROOT" && exec "$UVICORN" app.technician_service:app --port "$TECHNICIAN_PORT" ) >"$TECH_LOG" 2>&1 &
TECH_PID=$!
echo "$TECH_PID" > "$PID_DIR/technician.pid"
echo "started technician on :$TECHNICIAN_PORT (pid $TECH_PID, log $TECH_LOG)"

# Start elevator with TECHNICIAN_URL set in its env (not the parent shell's).
ELEV_LOG="$PID_DIR/elevator.log"
: > "$ELEV_LOG"
( cd "$REPO_ROOT" && export TECHNICIAN_URL="$TECHNICIAN_URL_VAR" && exec "$UVICORN" app.elevator_service:app --port "$ELEVATOR_PORT" ) >"$ELEV_LOG" 2>&1 &
ELEV_PID=$!
echo "$ELEV_PID" > "$PID_DIR/elevator.pid"
echo "started elevator on :$ELEVATOR_PORT (pid $ELEV_PID, log $ELEV_LOG)"

if ! wait_ready "http://localhost:${TECHNICIAN_PORT}/docs" "technician"; then
  tail -n 40 "$TECH_LOG" >&2 || true
  exit 1
fi
if ! wait_ready "http://localhost:${ELEVATOR_PORT}/elevators" "elevator"; then
  tail -n 40 "$ELEV_LOG" >&2 || true
  exit 1
fi

echo "deploy ok: elevator=:${ELEVATOR_PORT} → technician=${TECHNICIAN_URL_VAR}"
