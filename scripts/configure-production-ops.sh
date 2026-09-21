#!/usr/bin/env bash
set -euo pipefail

expected_project_id="gen-lang-client-0426617456"
expected_database_id="ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f"
project_id="${FIREBASE_PROJECT_ID:-}"
database_id="${FIREBASE_DATABASE_ID:-}"
region="${CLOUD_RUN_REGION:-europe-west1}"
app_base_url="${APP_BASE_URL:-}"
alert_email="${ALERT_EMAIL:-}"
billing_account_id="${BILLING_ACCOUNT_ID:-}"
budget_amount="${MONTHLY_BUDGET_AMOUNT:-}"

if [[ "$project_id" != "$expected_project_id" ]] || [[ "$database_id" != "$expected_database_id" ]]; then
  echo "Üretim proje/veritabanı hedefi eşleşmiyor." >&2
  exit 1
fi
if [[ "${CONFIRM_PRODUCTION_OPS:-}" != "${project_id}:${database_id}" ]]; then
  echo "CONFIRM_PRODUCTION_OPS PROJECT_ID:DATABASE_ID biçiminde eşleşmelidir." >&2
  exit 1
fi
if [[ ! "$app_base_url" =~ ^https://[^/]+/?$ ]] || [[ ! "$alert_email" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "APP_BASE_URL kesin HTTPS origin, ALERT_EMAIL geçerli e-posta olmalıdır." >&2
  exit 1
fi
if [[ -z "$billing_account_id" ]] || [[ ! "$budget_amount" =~ ^[0-9]+([.][0-9]{1,2})?[A-Z]{3}$ ]]; then
  echo "BILLING_ACCOUNT_ID ve MONTHLY_BUDGET_AMOUNT (ör. 1000TRY) zorunludur." >&2
  exit 1
fi
command -v gcloud >/dev/null || { echo "gcloud bulunamadı." >&2; exit 1; }

gcloud services enable monitoring.googleapis.com logging.googleapis.com cloudscheduler.googleapis.com \
  billingbudgets.googleapis.com firestore.googleapis.com run.googleapis.com secretmanager.googleapis.com \
  --project "$project_id" --quiet

api_sa_name="zekapark-api"
retention_sa_name="zekapark-retention"
scheduler_sa_name="zekapark-scheduler"
api_sa="${api_sa_name}@${project_id}.iam.gserviceaccount.com"
retention_sa="${retention_sa_name}@${project_id}.iam.gserviceaccount.com"
scheduler_sa="${scheduler_sa_name}@${project_id}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$api_sa" --project "$project_id" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$api_sa_name" --display-name="ZekaPark Cloud Run API" --project "$project_id"
fi
if ! gcloud iam service-accounts describe "$scheduler_sa" --project "$project_id" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$scheduler_sa_name" --display-name="ZekaPark Scheduler Invoker" --project "$project_id"
fi
if ! gcloud iam service-accounts describe "$retention_sa" --project "$project_id" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$retention_sa_name" --display-name="ZekaPark Retention Worker" --project "$project_id"
fi
for role in roles/datastore.user roles/firebaseauth.admin roles/firebaseappcheck.tokenVerifier; do
  gcloud projects add-iam-policy-binding "$project_id" --member="serviceAccount:${api_sa}" --role="$role" --quiet >/dev/null
done
gcloud projects add-iam-policy-binding "$project_id" --member="serviceAccount:${retention_sa}" --role=roles/datastore.user --quiet >/dev/null
gcloud projects add-iam-policy-binding "$project_id" --member="serviceAccount:${scheduler_sa}" --role=roles/run.invoker --quiet >/dev/null

for secret_var in GEMINI_API_KEY_SECRET SMTP_PASS_SECRET STRIPE_SECRET_KEY_SECRET STRIPE_WEBHOOK_SECRET_SECRET; do
  secret_name="${!secret_var:-}"
  if [[ -z "$secret_name" ]]; then
    echo "${secret_var} secret adı zorunludur." >&2
    exit 1
  fi
  gcloud secrets versions describe latest --secret "$secret_name" --project "$project_id" >/dev/null
  gcloud secrets add-iam-policy-binding "$secret_name" --member="serviceAccount:${api_sa}" \
    --role=roles/secretmanager.secretAccessor --project "$project_id" --quiet >/dev/null
done

daily_backup="$(gcloud firestore backups schedules list --database "$database_id" --project "$project_id" --filter='dailyRecurrence:*' --format='value(name)' | head -n 1)"
if [[ -z "$daily_backup" ]]; then
  gcloud firestore backups schedules create --database "$database_id" --recurrence=daily --retention=14w --project "$project_id" --quiet
fi

channel_name="$(gcloud beta monitoring channels list --project "$project_id" --filter='displayName="ZekaPark Production Alerts"' --format='value(name)' | head -n 1)"
if [[ -z "$channel_name" ]]; then
  channel_name="$(gcloud beta monitoring channels create --project "$project_id" \
    --display-name="ZekaPark Production Alerts" --description="Primary production incident contact" \
    --type=email --channel-labels="email_address=${alert_email}" --format='value(name)')"
fi

host="${app_base_url#https://}"
host="${host%/}"
uptime_name="$(gcloud monitoring uptime list --project "$project_id" --filter='displayName="ZekaPark production readiness"' --format='value(name)' | head -n 1)"
if [[ -z "$uptime_name" ]]; then
  uptime_name="$(gcloud monitoring uptime create "ZekaPark production readiness" --project "$project_id" \
    --resource-type=uptime-url --resource-labels="host=${host},project_id=${project_id}" \
    --protocol=https --path=/api/ready --request-method=get --validate-ssl=true \
    --matcher-type=contains-string --matcher-content='"status":"ready"' --period=1 --timeout=10 \
    --regions=europe,usa-iowa,asia-pacific --format='value(name)')"
fi
uptime_id="${uptime_name##*/}"

if [[ -z "$(gcloud monitoring policies list --project "$project_id" --filter='displayName="ZekaPark uptime failed"' --format='value(name)' | head -n 1)" ]]; then
  gcloud monitoring policies create --project "$project_id" --display-name="ZekaPark uptime failed" \
    --condition-display-name="Health endpoint unavailable" \
    --condition-filter="metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${uptime_id}\"" \
    --if='< 1' --duration=120s --trigger-count=1 --combiner=OR \
    --notification-channels="$channel_name" \
    --documentation="ZekaPark üretim sağlık uç noktası iki dakika boyunca başarısız oldu." >/dev/null
fi

if [[ -z "$(gcloud monitoring policies list --project "$project_id" --filter='displayName="ZekaPark Cloud Run 5xx"' --format='value(name)' | head -n 1)" ]]; then
  gcloud monitoring policies create --project "$project_id" --display-name="ZekaPark Cloud Run 5xx" \
    --condition-display-name="Cloud Run 5xx responses" \
    --condition-filter='metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.label.service_name="zekapark-api" AND metric.label.response_code_class="5xx"' \
    --aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_DELTA","crossSeriesReducer":"REDUCE_SUM","groupByFields":["resource.label.service_name"]}' \
    --if='> 0' --duration=60s --trigger-count=1 --combiner=OR \
    --notification-channels="$channel_name" \
    --documentation="ZekaPark Cloud Run API son bir dakikada 5xx yanıt üretti." >/dev/null
fi

if [[ -z "$(gcloud billing budgets list --billing-account "$billing_account_id" --filter='displayName="ZekaPark production monthly"' --format='value(name)' | head -n 1)" ]]; then
  gcloud billing budgets create --billing-account "$billing_account_id" \
    --display-name="ZekaPark production monthly" --budget-amount="$budget_amount" \
    --filter-projects="projects/${project_id}" --calendar-period=month \
    --threshold-rule=percent=0.50 --threshold-rule=percent=0.80 \
    --threshold-rule=percent=1.00 --threshold-rule=percent=1.00,basis=forecasted-spend \
    --notifications-rule-monitoring-notification-channels="$channel_name" >/dev/null
fi

if gcloud run jobs describe zekapark-retention --region "$region" --project "$project_id" >/dev/null 2>&1; then
  if ! gcloud scheduler jobs describe zekapark-retention-daily --location "$region" --project "$project_id" >/dev/null 2>&1; then
    gcloud scheduler jobs create http zekapark-retention-daily --location "$region" --project "$project_id" \
      --schedule='20 2 * * *' --time-zone='Europe/Istanbul' --http-method=POST \
      --uri="https://${region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${project_id}/jobs/zekapark-retention:run" \
      --oauth-service-account-email="$scheduler_sa" --oauth-token-scope='https://www.googleapis.com/auth/cloud-platform' >/dev/null
  fi
else
  echo "Retention job henüz dağıtılmadı; dağıtımdan sonra bu betiği yeniden çalıştırın." >&2
fi

echo "Üretim operasyonları yapılandırıldı. E-posta kanalını doğrulayın ve geri yükleme provasını çalıştırın."
echo "Cloud Run service account: ${api_sa}"
echo "Retention service account: ${retention_sa}"
