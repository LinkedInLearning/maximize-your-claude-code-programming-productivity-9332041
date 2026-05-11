#!/usr/bin/env bash
# Deliberately-broken twin of deploy.sh: starts the technician on port 8003
# but tells the elevator service to look for it on 8002 (where nothing is
# listening). Used to prove that the smoke suite catches the wiring-mismatch
# failure mode that produced today's 500s on /maintenance.
set -euo pipefail

export TECHNICIAN_PORT="${TECHNICIAN_PORT:-8003}"
# Intentionally wrong: point the elevator at a port where nothing listens.
# Defaults to 8002 (the elevator service's own built-in default) to mirror
# the real incident; can be overridden for tests that need a different port.
export TECHNICIAN_URL="${WRONG_TECHNICIAN_URL:-http://localhost:8002}"

exec "$(dirname "${BASH_SOURCE[0]}")/deploy.sh"
