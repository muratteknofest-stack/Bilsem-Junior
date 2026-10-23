"""Offline trust-boundary checks; no Google Cloud access or credentials required."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('play_wif', Path(__file__).parents[1] / 'scripts/bilsem-play-keyless.py')
setup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(setup)
ISSUER = f'https://oidc.vercel.com/{setup.TEAM}'


def provider():
    return dict(name=setup.RESOURCE, state='ACTIVE', oidc=dict(issuerUri=ISSUER, allowedAudiences=[f'https://vercel.com/{setup.TEAM}']),
                attributeMapping={'google.subject': 'assertion.sub'}, attributeCondition=setup.CONDITION)


class Cloud:
    def __init__(self, existing=False):
        self.calls = []
        self.project = dict(projectId=setup.PROJECT, projectNumber=setup.NUMBER, lifecycleState='ACTIVE')
        self.pools = [dict(name=setup.POOL_RESOURCE, state='ACTIVE', description=setup.DESCRIPTION)] if existing else []
        self.providers = [provider()] if existing else []
        self.account = dict(email=setup.ACCOUNT)

    def run(self, *args):
        self.calls.append(args)
        if args[:2] == ('projects', 'describe'): return self.project
        if args[:3] == ('iam', 'service-accounts', 'describe'): return self.account
        if args[:3] == ('iam', 'workload-identity-pools', 'list'): return self.pools
        if args[:4] == ('iam', 'workload-identity-pools', 'providers', 'list'): return self.providers
        if args[:4] == ('iam', 'workload-identity-pools', 'providers', 'describe'): return provider()
        if args[:3] == ('iam', 'service-accounts', 'get-iam-policy'):
            return dict(bindings=[dict(role='roles/iam.workloadIdentityUser', members=[setup.MEMBER])])
        return {}


class WifTests(unittest.TestCase):
    def test_plan_does_not_call_cloud_or_write_a_key(self):
        with patch.object(setup, 'Gcloud', side_effect=AssertionError('Cloud must not be used')), contextlib.redirect_stdout(io.StringIO()) as output:
            setup.main([])
        self.assertEqual(json.loads(output.getvalue())['mode'], 'plan_only')

    def test_fresh_install_is_scoped_to_exact_production_principal(self):
        cloud = Cloud()
        result = setup.provision(cloud, ISSUER)
        grants = [call for call in cloud.calls if 'add-iam-policy-binding' in call]
        self.assertEqual(len(grants), 1)
        self.assertIn(setup.ACCOUNT, grants[0])
        self.assertIn(f'--member={setup.MEMBER}', grants[0])
        self.assertIn('--role=roles/iam.workloadIdentityUser', grants[0])
        self.assertNotIn('principalSet', ' '.join(grants[0]))
        creation = next(call for call in cloud.calls if 'create-oidc' in call)
        for required in [setup.SUBJECT, setup.TEAM_ID, setup.APP_ID, "assertion.environment == 'production'"]:
            self.assertIn(required, ' '.join(creation))
        self.assertTrue(result['wifTrustVerified'])
        self.assertEqual(result['tokenExchange'], 'not_tested')
        self.assertFalse(result['privateKeyCreated'])
        self.assertFalse(result['organizationPolicyChanged'])
        self.assertFalse(any('org-policies' in call or 'keys' in call for call in cloud.calls))

    def test_repeat_reuses_matching_provider_and_never_creates_credentials(self):
        cloud = Cloud(existing=True)
        setup.provision(cloud, ISSUER)
        self.assertFalse(any('create' in call or 'create-oidc' in call for call in cloud.calls))

    def test_wrong_or_disabled_project_and_account_are_rejected_before_mutation(self):
        for field, value in [('projectNumber', '123'), ('projectId', 'other'), ('lifecycleState', 'DELETE_REQUESTED')]:
            cloud = Cloud(); cloud.project[field] = value
            with self.assertRaises(setup.SetupError): setup.provision(cloud, ISSUER)
            self.assertEqual(len(cloud.calls), 1)
        cloud = Cloud(); cloud.account['disabled'] = True
        with self.assertRaises(setup.SetupError): setup.provision(cloud, ISSUER)
        self.assertEqual(len(cloud.calls), 2)

    def test_existing_broad_or_wrong_trust_is_not_adopted_or_overwritten(self):
        for field in ['attributeCondition', 'attributeMapping', 'issuer', 'audience', 'disabled', 'state', 'extra-provider', 'pool']:
            cloud = Cloud(existing=True)
            if field == 'issuer': cloud.providers[0]['oidc']['issuerUri'] = 'https://other.example'
            elif field == 'audience': cloud.providers[0]['oidc']['allowedAudiences'].append('https://other.example')
            elif field == 'attributeMapping': cloud.providers[0][field] = {'google.subject': 'assertion.owner'}
            elif field == 'disabled': cloud.providers[0][field] = True
            elif field == 'state': cloud.providers[0][field] = 'DELETED'
            elif field == 'extra-provider': cloud.providers.append(dict(name='another-provider'))
            elif field == 'pool': cloud.pools[0]['description'] = 'not owned by this setup'
            else: cloud.providers[0][field] = 'true'
            with self.subTest(field=field), self.assertRaises(setup.SetupError): setup.provision(cloud, ISSUER)
            self.assertFalse(any('add-iam-policy-binding' in call or 'create-oidc' in call for call in cloud.calls))

    def test_invalid_provider_response_cannot_be_marked_verified(self):
        for value in [None, [], {}, {'oidc': None}]:
            with self.subTest(value=value), self.assertRaises(setup.SetupError): setup.validate_provider(value, ISSUER)

    def test_google_cli_failure_does_not_echo_provider_details(self):
        response = type('Result', (), dict(returncode=1, stdout='private-jwt', stderr='private-key'))()
        with patch.object(setup.subprocess, 'run', return_value=response) as run, self.assertRaises(setup.SetupError) as error:
            setup.Gcloud().run('projects', 'describe', setup.PROJECT)
        self.assertNotIn('private-', str(error.exception))
        self.assertNotIn('shell', run.call_args.kwargs)


if __name__ == '__main__':
    unittest.main()
