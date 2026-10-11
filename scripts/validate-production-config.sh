#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_ENV_FILE:?Set DEPLOY_ENV_FILE to the deployment env file}"
if [[ ! -r "$DEPLOY_ENV_FILE" ]]; then
  echo "Cannot read deployment env file: $DEPLOY_ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$DEPLOY_ENV_FILE"
set +a

image_vars=(
  WEB_IMAGE API_IMAGE CADDY_IMAGE POSTGRES_IMAGE REDIS_IMAGE MINIO_IMAGE
  PROMETHEUS_IMAGE GRAFANA_IMAGE
)
for name in "${image_vars[@]}"; do
  value="${!name:-}"
  if [[ ! "$value" =~ @sha256:[a-f0-9]{64}$ ]]; then
    echo "$name must be pinned to an approved sha256 image digest" >&2
    exit 1
  fi
done

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../infrastructure/docker" && pwd)"
docker compose --env-file "$DEPLOY_ENV_FILE" \
  -f "$compose_dir/compose.yaml" \
  -f "$compose_dir/compose.production.yaml" config --quiet
