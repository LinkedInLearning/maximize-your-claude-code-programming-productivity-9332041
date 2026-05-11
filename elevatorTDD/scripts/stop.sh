#!/usr/bin/env bash
set -euo pipefail

PID_DIR="/tmp/elevatorTDD"

if [ ! -d "$PID_DIR" ]; then
  echo "nothing to stop (no $PID_DIR)"
  exit 0
fi

for pidfile in "$PID_DIR"/*.pid; do
  [ -e "$pidfile" ] || continue
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  name="$(basename "$pidfile" .pid)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "stopped $name (pid $pid)"
  fi
  rm -f "$pidfile"
done

rm -rf "$PID_DIR"
