"""Google Cloud Shell installer for Bilsem Junior; prints a plan unless --apply.

Only runs the installed Google Cloud CLI against an explicitly selected existing
project. No passwords, keys, or tokens are accepted on the command line.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

PACKAGE = 'com.quantumtech.bilsemjunior'
ENDPOINT = 'https://bilsemjunior.vercel.app/api/google-play/notifications'
PLAY_PUBLISHER = 'google-play-developer-notifications@system.gserviceaccount.com'


class SetupError(Exception):
    pass


def resources(project):
    if not re.fullmatch(r'[a-z][a-z0-9-]{4,28}[a-z0-9]', project):
        raise SetupError('Gerçek Google Cloud proje kimliğini kullanın; Play hesap numarası geçerli değildir.')
    prefix = f'projects/{project}'
    return dict(project=project, package=PACKAGE, endpoint=ENDPOINT,
                api=f'bilsem-play-api@{project}.iam.gserviceaccount.com',
                push=f'bilsem-play-push@{project}.iam.gserviceaccount.com',
                topic=f'{prefix}/topics/bilsem-junior-rtdn',
                dead=f'{prefix}/topics/bilsem-junior-rtdn-dead',
                subscription=f'{prefix}/subscriptions/bilsem-junior-rtdn-push',
                dead_subscription=f'{prefix}/subscriptions/bilsem-junior-rtdn-dead-inspect')


def validate_subscription(value, config, dead=False):
    if not isinstance(value, dict):
        raise SetupError('Pub/Sub abonelik yanıtı doğrulanamadı.')
    expected_topic = config['dead'] if dead else config['topic']
    push = value.get('pushConfig', {})
    if not isinstance(push, dict):
        raise SetupError('Pub/Sub push yapılandırması doğrulanamadı.')
    valid = value.get('topic') == expected_topic and not value.get('filter')
    # Do not silently adopt another destination, unwrapped payloads or transforms.
    valid = valid and not value.get('messageTransforms') and not value.get('detached')
    if dead:
        valid = valid and not push and not value.get('bigqueryConfig') and not value.get('cloudStorageConfig')
    else:
        oidc = push.get('oidcToken', {})
        policy = value.get('deadLetterPolicy', {})
        retry = value.get('retryPolicy', {})
        if not all(isinstance(part, dict) for part in (oidc, policy, retry)):
            raise SetupError('Pub/Sub kimlik veya yeniden deneme yapılandırması doğrulanamadı.')
        valid = valid and push.get('pushEndpoint') == ENDPOINT and oidc.get('serviceAccountEmail') == config['push']
        valid = valid and oidc.get('audience') == ENDPOINT and 'noWrapper' not in push
        valid = valid and policy.get('deadLetterTopic') == config['dead'] and policy.get('maxDeliveryAttempts') == 10
        valid = valid and retry.get('minimumBackoff') == '10s' and retry.get('maximumBackoff') == '600s'
        valid = valid and not value.get('bigqueryConfig') and not value.get('cloudStorageConfig')
    if not valid:
        raise SetupError('Aynı adlı mevcut Pub/Sub aboneliği beklenen yapılandırmayla eşleşmiyor. Üzerine yazılmadı.')


def private_key_path(raw):
    original = Path(raw).expanduser()
    if original.is_symlink() or original.exists():
        raise SetupError('Mevcut anahtar dosyasının üzerine yazılmaz. Yeni bir özel dosya yolu seçin.')
    path = original.resolve()
    repo = Path(__file__).resolve().parent.parent
    if path.is_relative_to(repo):
        raise SetupError('Hizmet hesabı anahtarı kod deposuna yazılamaz.')
    if path.parent.exists() and path.parent.stat().st_mode & 0o077:
        raise SetupError('Anahtar için yalnız sizin erişebildiğiniz ayrı bir dizin kullanın (0700).')
    return path


class Gcloud:
    def __init__(self, project):
        self.project = project

    def run(self, *args):
        try:
            result = subprocess.run(['gcloud', *args, f'--project={self.project}', '--quiet', '--format=json'],
                                    capture_output=True, text=True, timeout=180, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise SetupError('Google Cloud komutu tamamlanamadı. Oturum ve proje yetkilerini kontrol edin.') from None
        if result.returncode:
            # Provider output can contain sensitive diagnostics; do not echo it.
            raise SetupError('Google Cloud işlemi reddedildi: ' + ' '.join(args[:2]) +
                             '. Proje yetkilerini ve kuruluş politikalarını kontrol edin.')
        try:
            return json.loads(result.stdout) if result.stdout.strip() else None
        except json.JSONDecodeError:
            raise SetupError('Google Cloud yanıtı doğrulanamadı.') from None


def provision(config, cli, key_path=None):
    project = cli.run('projects', 'describe', config['project'])
    if (not isinstance(project, dict) or project.get('projectId') != config['project']
            or project.get('lifecycleState') != 'ACTIVE'
            or not re.fullmatch(r'[0-9]+', str(project.get('projectNumber', '')))):
        raise SetupError('Seçilen mevcut Cloud projesi etkin değil veya kimliği eşleşmiyor.')
    cli.run('services', 'enable', 'androidpublisher.googleapis.com', 'pubsub.googleapis.com', 'iam.googleapis.com')
    accounts = cli.run('iam', 'service-accounts', 'list')
    topics = cli.run('pubsub', 'topics', 'list')
    subscriptions = cli.run('pubsub', 'subscriptions', 'list')
    if not all(isinstance(value, list) for value in (accounts, topics, subscriptions)):
        raise SetupError('Mevcut kaynaklar okunamadı; yeni kaynak oluşturulmadı.')
    # Resolve all conflicts before creating credentials or changing IAM policies.
    by_subscription = {s['name']: s for s in subscriptions}
    for name, dead in [(config['subscription'], False), (config['dead_subscription'], True)]:
        if name in by_subscription:
            validate_subscription(by_subscription[name], config, dead)
    by_account = {a['email']: a for a in accounts}
    for email in (config['api'], config['push']):
        if by_account.get(email, {}).get('disabled'):
            raise SetupError('Bilsem Junior hizmet hesabı devre dışı. Otomatik yeniden etkinleştirilmedi.')
    for email, title in [(config['api'], 'Bilsem Junior Play API'), (config['push'], 'Bilsem Junior RTDN Push')]:
        if email not in by_account:
            cli.run('iam', 'service-accounts', 'create', email.split('@')[0],
                    f'--display-name={title}', f'--description={PACKAGE}')
    known_topics = {t['name'] for t in topics}
    for topic in (config['topic'], config['dead']):
        if topic not in known_topics:
            cli.run('pubsub', 'topics', 'create', topic, '--labels=app=bilsem-junior')
    cli.run('beta', 'services', 'identity', 'create', '--service=pubsub.googleapis.com')
    agent = f"service-{project['projectNumber']}@gcp-sa-pubsub.iam.gserviceaccount.com"
    # Token creation is scoped to the dedicated push identity, never the project.
    cli.run('iam', 'service-accounts', 'add-iam-policy-binding', config['push'],
            f'--member=serviceAccount:{agent}', '--role=roles/iam.serviceAccountTokenCreator', '--condition=None')
    cli.run('pubsub', 'topics', 'add-iam-policy-binding', config['topic'],
            f'--member=serviceAccount:{PLAY_PUBLISHER}', '--role=roles/pubsub.publisher')
    cli.run('pubsub', 'topics', 'add-iam-policy-binding', config['dead'],
            f'--member=serviceAccount:{agent}', '--role=roles/pubsub.publisher')
    if config['dead_subscription'] not in by_subscription:
        cli.run('pubsub', 'subscriptions', 'create', config['dead_subscription'], f"--topic={config['dead']}",
                '--message-retention-duration=7d', '--expiration-period=never')
    if config['subscription'] not in by_subscription:
        cli.run('pubsub', 'subscriptions', 'create', config['subscription'], f"--topic={config['topic']}",
                f'--push-endpoint={ENDPOINT}', f"--push-auth-service-account={config['push']}",
                f'--push-auth-token-audience={ENDPOINT}', '--ack-deadline=60',
                '--min-retry-delay=10s', '--max-retry-delay=600s', '--message-retention-duration=7d',
                '--expiration-period=never', f"--dead-letter-topic={config['dead']}", '--max-delivery-attempts=10')
    cli.run('pubsub', 'subscriptions', 'add-iam-policy-binding', config['subscription'],
            f'--member=serviceAccount:{agent}', '--role=roles/pubsub.subscriber')
    for name, dead in [(config['subscription'], False), (config['dead_subscription'], True)]:
        validate_subscription(cli.run('pubsub', 'subscriptions', 'describe', name), config, dead)
    if key_path:
        key_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        # Creation is opt-in, after Cloud resources have been verified; never rotate on rerun.
        cli.run('iam', 'service-accounts', 'keys', 'create', str(key_path), f"--iam-account={config['api']}")
        key_path.chmod(0o600)
        credential = json.loads(key_path.read_text())
        if (credential.get('type') != 'service_account' or credential.get('client_email') != config['api']
                or not credential.get('private_key', '').startswith('-----BEGIN PRIVATE KEY-----')):
            raise SetupError('Oluşturulan özel anahtar doğrulanamadı; yeniden anahtar üretilmedi.')
    return dict(cloudResourcesVerified=True, playConsoleAccess='requires_app_scoped_invitation',
                rtdnDelivery='not_tested', monitoringAlarm='not_configured', realPurchase='not_tested',
                GOOGLE_PLAY_RTDN_EMAIL=config['push'], GOOGLE_PLAY_RTDN_AUDIENCE=ENDPOINT,
                playConsoleTopic=config['topic'], apiServiceAccount=config['api'],
                serviceAccountKeyFile=str(key_path) if key_path else None)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Bilsem Junior Google Play Cloud kurulumu. Varsayılan: yalnız plan.')
    parser.add_argument('--project', required=True, help='Mevcut Google Cloud proje kimliği; Play hesap numarası değil')
    parser.add_argument('--apply', action='store_true', help='Seçilen projede kaynakları ve sınırlı IAM izinlerini oluştur')
    parser.add_argument('--key-file', help='İsteğe bağlı YENİ özel hizmet hesabı dosyası; mevcut dosya değiştirilmez')
    args = parser.parse_args(argv)
    config = resources(args.project)
    key = private_key_path(args.key_file) if args.key_file else None
    if not args.apply:
        print(json.dumps(dict(mode='plan_only', **config, createPrivateKey=bool(key),
                              note='Cloud kaynağı oluşturulmadı; Vercel anahtarları ve satış ayarları değiştirilmez.'), indent=2))
        return
    if not shutil.which('gcloud'):
        raise SetupError('Google Cloud Shell veya oturum açılmış Google Cloud CLI gereklidir.')
    os.umask(0o077)
    report = provision(config, Gcloud(args.project), key)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (SetupError, OSError, ValueError, KeyError, TypeError):
        # Never emit file contents, subprocess output or credentials in tracebacks.
        error = sys.exc_info()[1]
        print(str(error) if isinstance(error, SetupError) else 'Kurulum tamamlanamadı; kaynaklar otomatik silinmedi.', file=sys.stderr)
        sys.exit(1)
