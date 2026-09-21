#!/usr/bin/env bash
set -euo pipefail

expected_project_id="gen-lang-client-0426617456"
project_id="${FIREBASE_PROJECT_ID:-}"
backup="${RESTORE_BACKUP:-}"
destination="${RESTORE_DATABASE_ID:-}"

if [[ "$project_id" != "$expected_project_id" ]]; then
  echo "FIREBASE_PROJECT_ID beklenen üretim projesiyle eşleşmiyor." >&2
  exit 1
fi
if [[ ! "$backup" =~ ^projects/${project_id}/locations/[a-z0-9-]+/backups/[A-Za-z0-9_-]+$ ]]; then
  echo "RESTORE_BACKUP tam ve aynı projeye ait bir yedek adı olmalıdır." >&2
  exit 1
fi
if [[ ! "$destination" =~ ^zekapark-restore-drill-[0-9]{8}(-[a-z0-9-]+)?$ ]]; then
  echo "RESTORE_DATABASE_ID zekapark-restore-drill-YYYYMMDD biçiminde olmalıdır." >&2
  exit 1
fi
if [[ "${CONFIRM_RESTORE_DRILL:-}" != "${project_id}:${destination}" ]]; then
  echo "CONFIRM_RESTORE_DRILL PROJECT_ID:DATABASE_ID biçiminde eşleşmelidir." >&2
  exit 1
fi
for command_name in gcloud npm; do
  command -v "$command_name" >/dev/null || { echo "$command_name bulunamadı." >&2; exit 1; }
done
if gcloud firestore databases describe --database "$destination" --project "$project_id" >/dev/null 2>&1; then
  echo "Hedef prova veritabanı zaten var; üzerine yazılmayacak." >&2
  exit 1
fi

gcloud firestore databases restore --source-backup "$backup" --destination-database "$destination" --project "$project_id" --quiet

for _attempt in $(seq 1 80); do
  state="$(gcloud firestore databases describe --database "$destination" --project "$project_id" --format='value(state)' 2>/dev/null || true)"
  if [[ "$state" == "READY" || "$state" == "ACTIVE" ]]; then
    break
  fi
  sleep 15
done
state="$(gcloud firestore databases describe --database "$destination" --project "$project_id" --format='value(state)')"
if [[ "$state" != "READY" && "$state" != "ACTIVE" ]]; then
  echo "Geri yüklenen veritabanı hazır duruma gelmedi: ${state}" >&2
  exit 1
fi

FIREBASE_DATABASE_ID="$destination" CONFIRM_RESTORE_VERIFICATION="${project_id}:${destination}" \
  npm exec -- tsx scripts/verify-restore-drill.ts

echo "Geri yükleme provası tamamlandı. Güvenlik kuralları ve TTL yedekte bulunmaz; hedefte ayrıca doğrulanmalıdır."
echo "Prova veritabanı otomatik silinmedi: ${destination}"
