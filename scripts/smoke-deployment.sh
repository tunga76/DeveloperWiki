#!/usr/bin/env bash
set -euo pipefail

: "${SITE_URL:?Set SITE_URL to the public HTTPS application URL}"
: "${DEPLOY_ENV_FILE:?Set DEPLOY_ENV_FILE to the deployment env file}"
if [[ ! -r "$DEPLOY_ENV_FILE" ]]; then
  echo "Cannot read deployment env file: $DEPLOY_ENV_FILE" >&2
  exit 1
fi

site_url="${SITE_URL%/}"
if [[ "$site_url" != https://* ]]; then
  echo "SITE_URL must use HTTPS" >&2
  exit 1
fi
curl_opts=(--proto '=https' --tlsv1.2 --connect-timeout 5 --max-time 20)
status="$(curl "${curl_opts[@]}" --silent --show-error --output /dev/null --write-out '%{http_code}' "$site_url/")"
if [[ "$status" != 200 ]]; then
  echo "Web landing returned HTTP $status" >&2
  exit 1
fi

headers="$(curl "${curl_opts[@]}" --silent --show-error --dump-header - --output /dev/null "$site_url/")"
for header in Strict-Transport-Security X-Content-Type-Options X-Frame-Options Referrer-Policy Permissions-Policy; do
  if ! grep -Eiq "^$header:" <<<"$headers"; then
    echo "Required security response header is missing: $header" >&2
    exit 1
  fi
done

curl "${curl_opts[@]}" --fail --silent --show-error "$site_url/api/v1/auth/csrf" --output /dev/null
status="$(curl "${curl_opts[@]}" --silent --show-error --output /dev/null --write-out '%{http_code}' "$site_url/api/v1/auth/me")"
if [[ "$status" != 401 ]]; then
  echo "Unauthenticated auth/me returned HTTP $status (expected 401)" >&2
  exit 1
fi

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../infrastructure/docker" && pwd)"
docker compose --env-file "$DEPLOY_ENV_FILE" \
  -f "$compose_dir/compose.yaml" \
  -f "$compose_dir/compose.production.yaml" \
  exec -T api node -e \
  'fetch("http://127.0.0.1:3001/ready").then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'

echo "Deployment smoke checks passed for $site_url"
