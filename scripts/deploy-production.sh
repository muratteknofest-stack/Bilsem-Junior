#!/usr/bin/env bash
set -euo pipefail

expected_project_id="gen-lang-client-0426617456"
expected_database_id="ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f"
project_id="${FIREBASE_PROJECT_ID:-}"
database_id="${FIREBASE_DATABASE_ID:-}"
region="${CLOUD_RUN_REGION:-europe-west1}"
service_name="${CLOUD_RUN_SERVICE:-zekapark-api}"
repository="${ARTIFACT_REPOSITORY:-zekapark}"
runtime_service_account="${CLOUD_RUN_SERVICE_ACCOUNT:-}"
retention_service_account="${RETENTION_SERVICE_ACCOUNT:-}"
runtime_env_file="${CLOUD_RUN_ENV_FILE:-ops/cloud-run.env.yaml}"
release_env_file="${RELEASE_ENV_FILE:-.env.production}"

if [[ "$project_id" != "$expected_project_id" ]] || [[ "$database_id" != "$expected_database_id" ]]; then
  echo "Üretim proje/veritabanı hedefi eşleşmiyor." >&2
  exit 1
fi
if [[ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "${project_id}:${database_id}" ]]; then
  echo "CONFIRM_PRODUCTION_DEPLOY PROJECT_ID:DATABASE_ID biçiminde eşleşmelidir." >&2
  exit 1
fi
if [[ "$release_env_file" != ".env.production" ]]; then
  echo "Vite güvenli ve tekrarlanabilir derleme için RELEASE_ENV_FILE .env.production olmalıdır." >&2
  exit 1
fi
if [[ -z "$runtime_service_account" ]] || [[ -z "$retention_service_account" ]] || [[ ! -f "$runtime_env_file" ]] || [[ ! -f "$release_env_file" ]]; then
  echo "CLOUD_RUN_SERVICE_ACCOUNT, RETENTION_SERVICE_ACCOUNT, CLOUD_RUN_ENV_FILE ve RELEASE_ENV_FILE zorunludur." >&2
  exit 1
fi
for secret_var in GEMINI_API_KEY_SECRET SMTP_PASS_SECRET STRIPE_SECRET_KEY_SECRET STRIPE_WEBHOOK_SECRET_SECRET; do
  if [[ -z "${!secret_var:-}" ]]; then
    echo "${secret_var} secret adı zorunludur." >&2
    exit 1
  fi
done
for command_name in gcloud firebase npm node curl git; do
  command -v "$command_name" >/dev/null || { echo "$command_name bulunamadı." >&2; exit 1; }
done

RELEASE_ENV_FILE="$release_env_file" CLOUD_RUN_ENV_FILE="$runtime_env_file" \
  RELEASE_VALIDATION_PHASE=predeploy npm run release:validate
npm run check
npm run build:client

gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com firebaseappcheck.googleapis.com recaptchaenterprise.googleapis.com \
  --project "$project_id" --quiet

if ! gcloud artifacts repositories describe "$repository" --location "$region" --project "$project_id" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$repository" --repository-format=docker --location "$region" --project "$project_id" --quiet
fi

for secret_name in "$GEMINI_API_KEY_SECRET" "$SMTP_PASS_SECRET" "$STRIPE_SECRET_KEY_SECRET" "$STRIPE_WEBHOOK_SECRET_SECRET"; do
  gcloud secrets versions describe latest --secret "$secret_name" --project "$project_id" >/dev/null
done

revision="$(git rev-parse --short=12 HEAD)"
image="${region}-docker.pkg.dev/${project_id}/${repository}/${service_name}:${revision}"
gcloud builds submit --tag "$image" --project "$project_id" --quiet

secret_mappings="GEMINI_API_KEY=${GEMINI_API_KEY_SECRET}:latest,SMTP_PASS=${SMTP_PASS_SECRET}:latest,STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_SECRET}:latest,STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET_SECRET}:latest"
gcloud run deploy "$service_name" \
  --image "$image" --region "$region" --project "$project_id" \
  --service-account "$runtime_service_account" --env-vars-file "$runtime_env_file" \
  --set-secrets "$secret_mappings" --allow-unauthenticated \
  --concurrency 40 --cpu 1 --memory 512Mi --timeout 60 \
  --min 1 --max-instances 10 --no-cpu-throttling --quiet

gcloud run jobs deploy zekapark-retention \
  --image "$image" --region "$region" --project "$project_id" \
  --service-account "$retention_service_account" \
  --command node --args build/ops/enforce-retention.js \
  --set-env-vars "FIREBASE_PROJECT_ID=${project_id},FIREBASE_DATABASE_ID=${database_id},CONFIRM_RETENTION_ENFORCEMENT=${project_id},ACTIVITY_RETENTION_DAYS=180,AUDIT_RETENTION_DAYS=365,AI_LOG_RETENTION_DAYS=365,PRIVACY_REQUEST_RETENTION_DAYS=1095" \
  --max-retries 1 --task-timeout 30m --quiet

firebase deploy --only firestore:rules,firestore:indexes --project "$project_id" --non-interactive

app_check_site_key="$(RELEASE_ENV_FILE="$release_env_file" node --input-type=module -e "import dotenv from 'dotenv'; dotenv.config({path:process.env.RELEASE_ENV_FILE}); process.stdout.write(process.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '')")"
firebase_web_app_id="$(node --input-type=module -e "import config from './firebase-applet-config.json' with {type:'json'}; process.stdout.write(config.appId)")"
FIREBASE_WEB_APP_ID="$firebase_web_app_id" APP_CHECK_SITE_KEY="$app_check_site_key" \
  APP_CHECK_ACTION=register CONFIRM_APP_CHECK_CONFIGURATION="$project_id" \
  bash scripts/configure-app-check.sh

firebase deploy --only hosting --project "$project_id" --non-interactive

cloud_run_url="$(gcloud run services describe "$service_name" --region "$region" --project "$project_id" --format='value(status.url)')"
curl --fail --silent --show-error "${cloud_run_url}/api/health" >/dev/null

FIREBASE_WEB_APP_ID="$firebase_web_app_id" APP_CHECK_SITE_KEY="$app_check_site_key" \
  APP_CHECK_ACTION=enforce CONFIRM_APP_CHECK_CONFIGURATION="$project_id" \
  CONFIRM_APP_CHECK_ENFORCEMENT="${CONFIRM_APP_CHECK_ENFORCEMENT:-}" \
  bash scripts/configure-app-check.sh

app_base_url="${APP_BASE_URL:-}"
if [[ -z "$app_base_url" ]]; then
  echo "APP_BASE_URL smoke testi için dış ortamda tanımlanmalıdır." >&2
  exit 1
fi
curl --fail --silent --show-error "${app_base_url%/}/api/health" >/dev/null
curl --fail --silent --show-error "${app_base_url%/}/api/ready" >/dev/null

echo "Üretim dağıtımı ve smoke testleri tamamlandı: ${image}"
