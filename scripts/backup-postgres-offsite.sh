#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DEPLOY_ENV_FILE:?Set DEPLOY_ENV_FILE to the production deployment env file}"
: "${BACKUP_S3_URI:?Set BACKUP_S3_URI to an s3://bucket/prefix destination}"
: "${AGE_RECIPIENT:?Set AGE_RECIPIENT to the off-host backup recipient public key}"

if [[ ! -r "$DEPLOY_ENV_FILE" ]]; then
  echo "Cannot read deployment env file: $DEPLOY_ENV_FILE" >&2
  exit 1
fi
if [[ "$BACKUP_S3_URI" != s3://* || "$BACKUP_S3_URI" == s3:// ]]; then
  echo "BACKUP_S3_URI must be an s3://bucket/prefix destination" >&2
  exit 1
fi
for command_name in docker age aws sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
done

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../infrastructure/docker" && pwd)"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="developer-wiki-${timestamp}.dump.age"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT
encrypted_dump="$temp_dir/$backup_name"

docker compose --env-file "$DEPLOY_ENV_FILE" \
  -f "$compose_dir/compose.yaml" \
  -f "$compose_dir/compose.production.yaml" \
  exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  | age --encrypt --recipient "$AGE_RECIPIENT" --output "$encrypted_dump"

checksum="$(sha256sum "$encrypted_dump" | cut -d ' ' -f 1)"
printf '%s  %s\n' "$checksum" "$backup_name" > "$temp_dir/$backup_name.sha256"

destination="${BACKUP_S3_URI%/}/$backup_name"
aws s3 cp "$encrypted_dump" "$destination" --only-show-errors
aws s3 cp "$temp_dir/$backup_name.sha256" "$destination.sha256" --only-show-errors
destination_without_scheme="${destination#s3://}"
bucket="${destination_without_scheme%%/*}"
object_key="${destination_without_scheme#*/}"
aws s3api head-object --bucket "$bucket" --key "$object_key" >/dev/null
aws s3api head-object --bucket "$bucket" --key "$object_key.sha256" >/dev/null

echo "Encrypted PostgreSQL backup uploaded: $destination"
echo "SHA-256: $checksum"
