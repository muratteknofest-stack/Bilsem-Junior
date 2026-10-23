"""Offline safety/contract checks. These do not provision Google Cloud resources."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('play_cloud', Path(__file__).parents[1] / 'scripts/provision-google-play-cloud.py')
setup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(setup)


def valid_subscription(c, dead=False):
    if dead:
        return dict(name=c['dead_subscription'], topic=c['dead'], pushConfig={})
    return dict(name=c['subscription'], topic=c['topic'],
                pushConfig=dict(pushEndpoint=setup.ENDPOINT, oidcToken=dict(serviceAccountEmail=c['push'], audience=setup.ENDPOINT)),
                deadLetterPolicy=dict(deadLetterTopic=c['dead'], maxDeliveryAttempts=10),
                retryPolicy=dict(minimumBackoff='10s', maximumBackoff='600s'))


class CloudFixture:
    def __init__(self, config, existing=False):
        self.config = config
        self.calls = []
        self.project = dict(projectId=config['project'], lifecycleState='ACTIVE', projectNumber='123456789012')
        self.accounts = [dict(email=config['api']), dict(email=config['push'])] if existing else []
        self.topics = [dict(name=config['topic']), dict(name=config['dead'])] if existing else []
        self.subscriptions = [valid_subscription(config), valid_subscription(config, True)] if existing else []

    def run(self, *args):
        self.calls.append(args)
        if args[:2] == ('projects', 'describe'):
            return self.project
        if args[:3] == ('iam', 'service-accounts', 'list'):
            return self.accounts
        if args[:3] == ('pubsub', 'topics', 'list'):
            return self.topics
        if args[:3] == ('pubsub', 'subscriptions', 'list'):
            return self.subscriptions
        if args[:3] == ('pubsub', 'subscriptions', 'describe'):
            return valid_subscription(self.config, args[3] == self.config['dead_subscription'])
        if args[:4] == ('iam', 'service-accounts', 'keys', 'create'):
            Path(args[4]).write_text(json.dumps(dict(type='service_account', client_email=self.config['api'],
                                                   private_key='-----BEGIN PRIVATE KEY-----offline-fixture')))
        return {}


class CloudSetupTests(unittest.TestCase):
    def setUp(self):
        self.config = setup.resources('bilsem-cloud-fixture')

    def test_project_must_be_an_explicit_cloud_id(self):
        for value in ['8719423094329535468', '--project=another', 'x;echo secret', '../escape', 'Uppercase', 'a', 'x' * 31]:
            with self.subTest(value=value), self.assertRaises(setup.SetupError):
                setup.resources(value)

    def test_authentication_and_delivery_drift_is_rejected(self):
        for value in [None, [], {'pushConfig': None}, {'pushConfig': {'oidcToken': None}}]:
            with self.subTest(malformed=value), self.assertRaises(setup.SetupError):
                setup.validate_subscription(value, self.config)
        for field in ['pushEndpoint', 'serviceAccountEmail', 'audience', 'noWrapper', 'topic', 'deadLetterTopic', 'retry', 'filter', 'transform', 'bigquery']:
            value = valid_subscription(self.config)
            if field == 'pushEndpoint': value['pushConfig'][field] = 'https://other.example/api'
            elif field in ['serviceAccountEmail', 'audience']: value['pushConfig']['oidcToken'][field] = 'wrong'
            elif field == 'noWrapper': value['pushConfig'][field] = {}
            elif field == 'topic': value['topic'] = self.config['dead']
            elif field == 'deadLetterTopic': value['deadLetterPolicy'][field] = self.config['topic']
            elif field == 'retry': value['retryPolicy']['maximumBackoff'] = '0s'
            elif field == 'filter': value['filter'] = 'attributes.ignore="true"'
            elif field == 'transform': value['messageTransforms'] = [{'javascriptUdf': {}}]
            else: value['bigqueryConfig'] = {'table': 'other'}
            with self.subTest(field=field), self.assertRaises(setup.SetupError):
                setup.validate_subscription(value, self.config)

    def test_conflict_stops_before_iam_or_new_credentials(self):
        cloud = CloudFixture(self.config, existing=True)
        cloud.subscriptions[0]['pushConfig']['pushEndpoint'] = 'https://other.example/api'
        with self.assertRaises(setup.SetupError):
            setup.provision(self.config, cloud)
        self.assertFalse(any('add-iam-policy-binding' in call or 'create' in call for call in cloud.calls))

    def test_fresh_install_scopes_iam_and_verifies_configuration(self):
        cloud = CloudFixture(self.config)
        report = setup.provision(self.config, cloud)
        grants = [call for call in cloud.calls if 'add-iam-policy-binding' in call]
        self.assertEqual(len(grants), 4)
        self.assertTrue(all(call[0] != 'projects' for call in grants))
        # Stable Pub/Sub CLI commands do not accept IAM's --condition option.
        self.assertTrue(all(not any(arg.startswith('--condition') for arg in call) for call in grants if call[0] == 'pubsub'))
        self.assertTrue(all('--member=allUsers' not in call and '--member=allAuthenticatedUsers' not in call for call in grants))
        token_grant = next(call for call in grants if '--role=roles/iam.serviceAccountTokenCreator' in call)
        self.assertIn(self.config['push'], token_grant)
        self.assertFalse(any(call[:4] == ('iam', 'service-accounts', 'keys', 'create') for call in cloud.calls))
        self.assertTrue(report['cloudResourcesVerified'])
        self.assertEqual(report['realPurchase'], 'not_tested')
        self.assertEqual(report['playConsoleAccess'], 'requires_app_scoped_invitation')

    def test_repeat_run_does_not_duplicate_resources_or_rotate_keys(self):
        cloud = CloudFixture(self.config, existing=True)
        setup.provision(self.config, cloud)
        creates = [call for call in cloud.calls if 'create' in call]
        self.assertEqual(creates, [('beta', 'services', 'identity', 'create', '--service=pubsub.googleapis.com')])

    def test_wrong_project_and_disabled_accounts_are_not_modified(self):
        cloud = CloudFixture(self.config)
        cloud.project['projectId'] = 'another-project'
        with self.assertRaises(setup.SetupError): setup.provision(self.config, cloud)
        self.assertEqual(len(cloud.calls), 1)
        cloud = CloudFixture(self.config, existing=True)
        cloud.accounts[0]['disabled'] = True
        with self.assertRaises(setup.SetupError): setup.provision(self.config, cloud)
        self.assertFalse(any('add-iam-policy-binding' in call for call in cloud.calls))

    def test_key_file_refuses_repo_existing_files_symlinks_and_shared_directory(self):
        repo = Path(__file__).resolve().parents[1]
        with self.assertRaises(setup.SetupError): setup.private_key_path(str(repo / 'new-key.json'))
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            path = parent / 'key.json'
            self.assertEqual(setup.private_key_path(str(path)), path)
            path.write_text('existing secret')
            with self.assertRaises(setup.SetupError): setup.private_key_path(str(path))
            link = parent / 'linked.json'
            link.symlink_to(parent / 'absent.json')
            with self.assertRaises(setup.SetupError): setup.private_key_path(str(link))
            shared = parent / 'shared'
            shared.mkdir(mode=0o755)
            shared.chmod(0o755)
            with self.assertRaises(setup.SetupError): setup.private_key_path(str(shared / 'new.json'))

    def test_opt_in_key_is_written_privately_and_never_printed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = setup.private_key_path(str(Path(directory) / 'key.json'))
            report = setup.provision(self.config, CloudFixture(self.config), path)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertNotIn('offline-fixture', json.dumps(report))
            self.assertEqual(report['serviceAccountKeyFile'], str(path))

    def test_default_plan_performs_no_cloud_actions(self):
        output = io.StringIO()
        with patch.object(setup.Gcloud, 'run', side_effect=AssertionError('network used')), contextlib.redirect_stdout(output):
            setup.main(['--project', self.config['project']])
        report = json.loads(output.getvalue())
        self.assertEqual(report['mode'], 'plan_only')
        self.assertFalse(report['createPrivateKey'])

    def test_provider_error_details_never_enter_user_output(self):
        result = subprocess.CompletedProcess([], 403, 'private-provider-body', 'private-secret-value')
        with patch.object(setup.subprocess, 'run', return_value=result) as run:
            with self.assertRaises(setup.SetupError) as caught:
                setup.Gcloud(self.config['project']).run('projects', 'describe', self.config['project'])
        self.assertNotIn('private-', str(caught.exception))
        self.assertIsInstance(run.call_args.args[0], list)
        self.assertNotIn('shell', run.call_args.kwargs)
        self.assertIn('--project=' + self.config['project'], run.call_args.args[0])


if __name__ == '__main__':
    unittest.main()
