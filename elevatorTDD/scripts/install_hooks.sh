#!/usr/bin/env bash
# Points the surrounding git repo's hooksPath at this project's .githooks
# directory using an absolute path, because the parent git repo
# (/Users/linkedin/Code) contains many sibling projects and a relative
# .githooks path would resolve to the wrong place. The hook itself filters
# by staged-file prefix so commits to sibling projects are unaffected.
set -euo pipefail
HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.githooks" && pwd)"
git config core.hooksPath "$HOOKS_DIR"
echo "git core.hooksPath -> $HOOKS_DIR"
echo "pre-commit smoke gate enabled for elevatorTDD/ changes only."
