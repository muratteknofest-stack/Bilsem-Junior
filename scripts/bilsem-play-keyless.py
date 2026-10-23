"""Cloud Shell setup for this Bilsem Junior production deployment. Default: plan only."""
import argparse
import json
import shutil
import subprocess
import sys

PROJECT = 'bilsem-junior-512517'
NUMBER = '367829590893'
TEAM = 'dyds-projects-c415ba7a'
TEAM_ID = 'team_OCPzh4sUtUTDyhohl2KeH6C0'
APP = 'bilsemjunior'
APP_ID = 'prj_ND56b92OVuvJdw2y09hR3nMStcoQ'
POOL = 'bilsem-vercel'
PROVIDER = 'bilsem-production'
ACCOUNT = f'bilsem-play-api@{PROJECT}.iam.gserviceaccount.com'
SUBJECT = f'owner:{TEAM}:project:{APP}:environment:production'
POOL_RESOURCE = f'projects/{NUMBER}/locations/global/workloadIdentityPools/{POOL}'
RESOURCE = f'{POOL_RESOURCE}/providers/{PROVIDER}'
MEMBER = f'principal://iam.googleapis.com/{POOL_RESOURCE}/subject/{SUBJECT}'
DESCRIPTION = f'Bilsem Junior production only; Vercel project {APP_ID}'
CONDITION = (f"assertion.sub == '{SUBJECT}' && assertion.owner_id == '{TEAM_ID}' "
             f"&& assertion.project_id == '{APP_ID}' && assertion.environment == 'production'")


class SetupError(Exception):
    pass


class Gcloud:
    def run(self, *args):
        try:
            result = subprocess.run(['gcloud', *args, f'--project={PROJECT}', '--quiet', '--format=json'],
                                    capture_output=True, text=True, timeout=180, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise SetupError('Cloud komutu tamamlanamadı. Oturumu ve proje yetkilerini kontrol edin.') from None
        if result.returncode:
            raise SetupError('Cloud işlemi reddedildi: ' + ' '.join(args[:3]) + '. Kaynaklar otomatik silinmedi.')
        try:
            return json.loads(result.stdout) if result.stdout.strip() else None
        except json.JSONDecodeError:
            raise SetupError('Cloud yanıtı doğrulanamadı.') from None


def validate_provider(value, issuer):
    if (not isinstance(value, dict) or value.get('name') != RESOURCE or value.get('state') != 'ACTIVE'
            or value.get('disabled') or value.get('oidc') != dict(issuerUri=issuer, allowedAudiences=[f'https://vercel.com/{TEAM}'])
            or value.get('attributeMapping') != {'google.subject': 'assertion.sub'}
            or value.get('attributeCondition') != CONDITION):
        raise SetupError('Mevcut kimlik sağlayıcısı beklenen üretim sınırlarıyla eşleşmiyor. Üzerine yazılmadı.')


def provision(cloud, issuer):
    project = cloud.run('projects', 'describe', PROJECT)
    if (not isinstance(project, dict) or project.get('projectId') != PROJECT
            or str(project.get('projectNumber')) != NUMBER or project.get('lifecycleState') != 'ACTIVE'):
        raise SetupError('Bilsem Junior Cloud proje kimliği veya numarası eşleşmiyor.')
    account = cloud.run('iam', 'service-accounts', 'describe', ACCOUNT)
    if not isinstance(account, dict) or account.get('email') != ACCOUNT or account.get('disabled'):
        raise SetupError('Mevcut Play API hizmet hesabı doğrulanamadı.')
    cloud.run('services', 'enable', 'iam.googleapis.com', 'iamcredentials.googleapis.com', 'sts.googleapis.com')
    pools = cloud.run('iam', 'workload-identity-pools', 'list', '--location=global')
    if not isinstance(pools, list):
        raise SetupError('Kimlik havuzları okunamadı.')
    pool = next((p for p in pools if p.get('name') == POOL_RESOURCE), None)
    providers = []
    if pool:
        if pool.get('disabled') or pool.get('state') != 'ACTIVE' or pool.get('description') != DESCRIPTION:
            raise SetupError('Mevcut kimlik havuzu bu kuruluma ait değil veya etkin değil. Değiştirilmedi.')
        providers = cloud.run('iam', 'workload-identity-pools', 'providers', 'list',
                              '--location=global', f'--workload-identity-pool={POOL}')
        if not isinstance(providers, list) or any(p.get('name') != RESOURCE for p in providers):
            raise SetupError('Havuzda başka bir sağlayıcı var; erişim genişletilmedi.')
        for provider in providers:
            validate_provider(provider, issuer)
    if not pool:
        cloud.run('iam', 'workload-identity-pools', 'create', POOL, '--location=global',
                  '--display-name=Bilsem Vercel Production', f'--description={DESCRIPTION}')
    if not providers:
        cloud.run('iam', 'workload-identity-pools', 'providers', 'create-oidc', PROVIDER,
                  '--location=global', f'--workload-identity-pool={POOL}', f'--issuer-uri={issuer}',
                  f'--allowed-audiences=https://vercel.com/{TEAM}',
                  '--attribute-mapping=google.subject=assertion.sub', f'--attribute-condition={CONDITION}')
    validate_provider(cloud.run('iam', 'workload-identity-pools', 'providers', 'describe', PROVIDER,
                               '--location=global', f'--workload-identity-pool={POOL}'), issuer)
    # One production principal, on one existing service account; no project-level role.
    cloud.run('iam', 'service-accounts', 'add-iam-policy-binding', ACCOUNT,
              f'--member={MEMBER}', '--role=roles/iam.workloadIdentityUser', '--condition=None')
    policy = cloud.run('iam', 'service-accounts', 'get-iam-policy', ACCOUNT)
    if (not isinstance(policy, dict) or not any(b.get('role') == 'roles/iam.workloadIdentityUser'
            and MEMBER in b.get('members', []) and not b.get('condition') for b in policy.get('bindings', []))):
        raise SetupError('Hizmet hesabı üretim izni doğrulanamadı.')
    return dict(wifTrustVerified=True, tokenExchange='not_tested', privateKeyCreated=False,
                organizationPolicyChanged=False, salesSettingsChanged=False,
                GOOGLE_PLAY_AUTH_MODE='workload_identity', GOOGLE_PLAY_WIF_PROVIDER=RESOURCE,
                GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=ACCOUNT)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Sadece belirtilen üretim güven ilişkisini oluştur')
    parser.add_argument('--issuer-mode', choices=['team', 'global'], default='team')
    args = parser.parse_args(argv)
    issuer = 'https://oidc.vercel.com' + (f'/{TEAM}' if args.issuer_mode == 'team' else '')
    if not args.apply:
        print(json.dumps(dict(mode='plan_only', project=PROJECT, projectNumber=NUMBER, issuer=issuer,
                              provider=RESOURCE, serviceAccount=ACCOUNT, principal=MEMBER,
                              attributeCondition=CONDITION, privateKeyCreated=False), indent=2))
        return
    if not shutil.which('gcloud'):
        raise SetupError('Oturum açılmış Google Cloud Shell gerekir.')
    print(json.dumps(provision(Gcloud(), issuer), indent=2))


if __name__ == '__main__':
    try:
        main()
    except (SetupError, OSError, ValueError, KeyError, TypeError):
        error = sys.exc_info()[1]
        print(str(error) if isinstance(error, SetupError) else 'Kurulum doğrulanamadı; kaynaklar otomatik silinmedi.', file=sys.stderr)
        sys.exit(1)
