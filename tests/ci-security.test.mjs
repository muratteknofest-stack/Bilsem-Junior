import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workflowSecurityIssues, checkRepositoryWorkflows, retiredRulesDenyAll, retiredFirebaseIssues } from '../scripts/check-workflow-security.mjs';

const approved = JSON.parse(readFileSync('config/github-actions.json', 'utf8'));
const checkout = `actions/checkout@${approved['actions/checkout'].sha}`;
const workflow = `name: Fixture
on: pull_request
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-24.04
    steps:
      - uses: ${checkout}
        with:
          persist-credentials: false
      - run: npm ci
`;

test('all repository workflows use approved full pins, read-only permissions and constrained secret access', () => {
  const results = checkRepositoryWorkflows();
  assert.ok(results.length > 0);
  for (const result of results) assert.deepEqual(result.issues, [], result.name);
  assert.ok(Object.values(approved).every(action => /^[a-f0-9]{40}$/.test(action.sha) && action.runtime === 'node24'));
  assert.deepEqual(workflowSecurityIssues(workflow, null), ['INVALID_ACTION_INVENTORY']);
  assert.deepEqual(workflowSecurityIssues(workflow, { 'actions/checkout': { sha: 'v7', runtime: 'node24' } }), ['INVALID_ACTION_INVENTORY']);
});

test('moving tags, unreviewed commit SHAs, local actions and tagged containers cannot replace reviewed actions', () => {
  assert.deepEqual(workflowSecurityIssues(workflow, approved), []);
  for (const action of ['actions/checkout@v7', 'actions/checkout@main', `actions/checkout@${'a'.repeat(40)}`,
    `untrusted/checkout@${approved['actions/checkout'].sha}`, './local-action', 'docker://image:latest']) {
    assert.ok(workflowSecurityIssues(workflow.replace(checkout, action), approved).length > 0, action);
  }
});

test('duplicate keys, YAML aliases and non-workflow structures fail closed', () => {
  for (const source of ['name: test\npermissions: {}\npermissions: write-all',
    'on: pull_request\npermissions: &p {contents: read}\njobs: {test: {permissions: *p, steps: []}}',
    'on: pull_request\njobs: []', workflow.replace('    steps:', '    steps: invalid\n    ignored:')]) {
    assert.ok(workflowSecurityIssues(source, approved).length > 0);
  }
});

test('credential persistence, privileged events and permission escalation are rejected', () => {
  for (const source of [workflow.replace('persist-credentials: false', 'persist-credentials: true'),
    workflow.replace('contents: read', 'contents: write'), workflow.replace('on: pull_request', 'on: pull_request_target'),
    workflow.replace('on: pull_request', 'on: workflow_run'), workflow.replace('    steps:', '    permissions: write-all\n    steps:')]) {
    assert.ok(workflowSecurityIssues(source, approved).length > 0);
  }
});

test('implicit downloads, lockfile bypass and direct untrusted shell interpolation are rejected', () => {
  for (const command of ['npx playwright install', 'npm install', 'npm update', 'echo "${{ github.event.pull_request.title }}"']) {
    assert.ok(workflowSecurityIssues(workflow.replace('npm ci', command), approved).length > 0, command);
  }
  assert.deepEqual(workflowSecurityIssues(workflow.replace('npm ci', 'npx --no-install playwright install'), approved), []);
});

test('secret jobs require both the exact main-branch gate and a declared protected environment', () => {
  const secret = workflow.replace('on: pull_request', 'on: workflow_dispatch')
    .replace('    runs-on:', "    if: github.ref == 'refs/heads/main'\n    environment: production-backup\n    runs-on:")
    .replace('      - run: npm ci', '      - run: node backup.mjs\n        env:\n          BACKUP_KEY: ${{ secrets.BACKUP_KEY }}');
  assert.deepEqual(workflowSecurityIssues(secret, approved), []);
  assert.ok(workflowSecurityIssues(secret.replace('    environment: production-backup\n', ''), approved).length);
  assert.ok(workflowSecurityIssues(secret.replace("github.ref == 'refs/heads/main'", "github.ref == 'refs/heads/main' || true"), approved).length);
});

test('artifact and Node setup options must explicitly disable hidden files and automatic package-manager caching', () => {
  for (const [name, option] of [['actions/upload-artifact', 'include-hidden-files'], ['actions/setup-node', 'package-manager-cache']]) {
    const source = workflow.replace(checkout, `${name}@${approved[name].sha}`).replace('persist-credentials', option);
    assert.deepEqual(workflowSecurityIssues(source, approved), []);
    assert.ok(workflowSecurityIssues(source.replace(`${option}: false`, `${option}: true`), approved).length);
  }
});

test('retired Firebase policies and explicit named-database targets cannot restore client access or hosting', () => {
  assert.deepEqual(retiredFirebaseIssues(), []);
  for (const [file, service] of [['firestore.rules', 'firestore'], ['storage.rules', 'storage']]) {
    const source = readFileSync(file, 'utf8');
    assert.equal(retiredRulesDenyAll(source, service), true);
    for (const mutation of [source.replace('if false', 'if true'), source.replace('if false', "if request.auth != null"),
      source.replace('if false', "if request.auth.token.email == 'fixture@example.invalid'"),
      source.replace('allow read, write: if false;', 'allow read, write: if false; allow read: if true;')]) {
      assert.equal(retiredRulesDenyAll(mutation, service), false);
    }
  }
});
