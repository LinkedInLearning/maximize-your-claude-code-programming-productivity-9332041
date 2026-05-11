#!/usr/bin/env bash
# Build the elevatortdd image inside minikube's docker daemon and deploy
# both services. After this completes, the elevator API is reachable at
# the URL printed by `minikube service elevator --url`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v minikube >/dev/null 2>&1; then
  echo "minikube not found on PATH" >&2
  exit 1
fi

if ! minikube status >/dev/null 2>&1; then
  echo "minikube is not running — start it with: minikube start" >&2
  exit 1
fi

# Build into minikube's in-cluster docker so no registry push is needed.
eval "$(minikube docker-env)"
docker build -t elevatortdd:dev .

kubectl apply -f k8s/technician.yaml
kubectl apply -f k8s/elevator.yaml

kubectl rollout status deploy/technician --timeout=120s
kubectl rollout status deploy/elevator   --timeout=120s

echo
echo "Elevator URL:"
minikube service elevator --url
