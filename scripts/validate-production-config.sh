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
if [[ "${ENABLE_ALERTMANAGER:-false}" == "true" ]]; then
  image_vars+=(ALERTMANAGER_IMAGE)
fi
for name in "${image_vars[@]}"; do
  value="${!name:-}"
  if [[ ! "$value" =~ @sha256:[a-f0-9]{64}$ ]]; then
    echo "$name must be pinned to an approved sha256 image digest" >&2
    exit 1
  fi
done

secret_file_vars=(
  DATABASE_URL_SECRET_FILE JWT_SECRET_FILE POSTGRES_PASSWORD_FILE
  MINIO_ROOT_PASSWORD_FILE GRAFANA_ADMIN_PASSWORD_FILE
)
for name in "${secret_file_vars[@]}"; do
  file_path="${!name:-}"
  if [[ -z "$file_path" || ! -f "$file_path" || ! -r "$file_path" ]]; then
    echo "$name must point to a readable secret file" >&2
    exit 1
  fi
  if [[ ! -s "$file_path" ]]; then
    echo "$name must not point to an empty file" >&2
    exit 1
  fi
done

jwt_secret="$(< "$JWT_SECRET_FILE")"
if (( ${#jwt_secret} < 32 )); then
  echo "JWT_SECRET_FILE must contain at least 32 characters" >&2
  exit 1
fi

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../infrastructure/docker" && pwd)"
compose_files=(-f "$compose_dir/compose.yaml" -f "$compose_dir/compose.production.yaml")
if [[ "${ENABLE_ALERTMANAGER:-false}" == "true" ]]; then
  : "${ALERTMANAGER_CONFIG_FILE:?Set ALERTMANAGER_CONFIG_FILE to a configured Alertmanager file}"
  compose_files+=(-f "$compose_dir/compose.alertmanager.yaml")
fi
if [[ "${ENABLE_OPS_UI:-false}" == "true" ]]; then
  compose_files+=(-f "$compose_dir/compose.ops-access.yaml")
fi
docker compose --env-file "$DEPLOY_ENV_FILE" \
  "${compose_files[@]}" config --quiet
rendered_config="$(docker compose --env-file "$DEPLOY_ENV_FILE" \
  "${compose_files[@]}" config --format json)"
if ! jq -e -f "$(dirname "${BASH_SOURCE[0]}")/production-compose-ports.jq" <<<"$rendered_config" >/dev/null; then
  echo "Production Compose must publish only Caddy 80/443 publicly; other published ports must bind to 127.0.0.1" >&2
  exit 1
fi
