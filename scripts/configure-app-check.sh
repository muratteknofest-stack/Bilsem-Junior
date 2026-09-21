#!/usr/bin/env bash
set -euo pipefail

expected_project_id="gen-lang-client-0426617456"
project_id="${FIREBASE_PROJECT_ID:-}"
firebase_app_id="${FIREBASE_WEB_APP_ID:-}"
site_key="${APP_CHECK_SITE_KEY:-}"
action="${APP_CHECK_ACTION:-all}"

if [[ "$project_id" != "$expected_project_id" ]]; then
  echo "FIREBASE_PROJECT_ID beklenen üretim projesiyle eşleşmiyor." >&2
  exit 1
fi
if [[ ! "$firebase_app_id" =~ ^[A-Za-z0-9:._-]+$ ]] || [[ ! "$site_key" =~ ^[A-Za-z0-9_-]{10,}$ ]]; then
  echo "FIREBASE_WEB_APP_ID veya APP_CHECK_SITE_KEY geçersiz." >&2
  exit 1
fi
if [[ "$action" != "register" && "$action" != "enforce" && "$action" != "all" ]]; then
  echo "APP_CHECK_ACTION register, enforce veya all olmalıdır." >&2
  exit 1
fi
if [[ "${CONFIRM_APP_CHECK_CONFIGURATION:-}" != "$project_id" ]]; then
  echo "CONFIRM_APP_CHECK_CONFIGURATION proje kimliğiyle eşleşmelidir." >&2
  exit 1
fi
if [[ "$action" != "register" && "${CONFIRM_APP_CHECK_ENFORCEMENT:-}" != "$project_id" ]]; then
  echo "Enforcement için CONFIRM_APP_CHECK_ENFORCEMENT proje kimliğiyle eşleşmelidir." >&2
  exit 1
fi

for command_name in gcloud curl node; do
  command -v "$command_name" >/dev/null || { echo "$command_name bulunamadı." >&2; exit 1; }
done

project_number="$(gcloud projects describe "$project_id" --format='value(projectNumber)')"
access_token="$(gcloud auth print-access-token)"
base_url="https://firebaseappcheck.googleapis.com/v1/projects/${project_number}"

if [[ "$action" == "register" || "$action" == "all" ]]; then
  config_name="projects/${project_number}/apps/${firebase_app_id}/recaptchaEnterpriseConfig"
  curl --fail-with-body --silent --show-error --request PATCH \
    --header "Authorization: Bearer ${access_token}" \
    --header "Content-Type: application/json" \
    --data "{\"name\":\"${config_name}\",\"siteKey\":\"${site_key}\",\"tokenTtl\":\"3600s\",\"riskAnalysis\":{\"minValidScore\":0.5}}" \
    "${base_url}/apps/${firebase_app_id}/recaptchaEnterpriseConfig?updateMask=siteKey,tokenTtl,riskAnalysis" \
    >/dev/null
  curl --fail-with-body --silent --show-error \
    --header "Authorization: Bearer ${access_token}" \
    "${base_url}/apps/${firebase_app_id}/recaptchaEnterpriseConfig" \
    | EXPECTED_SITE_KEY="$site_key" node -e "let body=''; process.stdin.on('data', chunk => body += chunk); process.stdin.on('end', () => { const value=JSON.parse(body); if (value.siteKey !== process.env.EXPECTED_SITE_KEY || value.tokenTtl !== '3600s' || Number(value.riskAnalysis?.minValidScore) !== 0.5) process.exit(1); });"
fi

if [[ "$action" == "enforce" || "$action" == "all" ]]; then
  for service_id in identitytoolkit.googleapis.com firestore.googleapis.com; do
    service_name="projects/${project_number}/services/${service_id}"
    curl --fail-with-body --silent --show-error --request PATCH \
      --header "Authorization: Bearer ${access_token}" \
      --header "Content-Type: application/json" \
      --data "{\"name\":\"${service_name}\",\"enforcementMode\":\"ENFORCED\"}" \
      "${base_url}/services/${service_id}?updateMask=enforcementMode" \
      >/dev/null
    curl --fail-with-body --silent --show-error \
      --header "Authorization: Bearer ${access_token}" \
      "${base_url}/services/${service_id}" \
      | node -e "let body=''; process.stdin.on('data', chunk => body += chunk); process.stdin.on('end', () => { const value=JSON.parse(body); if (value.enforcementMode !== 'ENFORCED') process.exit(1); });"
  done
fi

echo "App Check yapılandırması doğrulandı: ${action}."
