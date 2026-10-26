import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const isFalse = value => value === false || value === 'false';
const readOnly = permissions => isRecord(permissions) && Object.values(permissions).every(value => ['read', 'none'].includes(value));

/** Offline repository policy. YAML parsing rejects duplicates, aliases and tags.
 * Diagnostics contain only fixed codes, never workflow bodies or secret expressions.
 */
export function workflowSecurityIssues(source, approved) {
  if (!isRecord(approved) || !Object.values(approved).every(action => isRecord(action)
    && /^[a-f0-9]{40}$/.test(action.sha) && action.runtime === 'node24')) return ['INVALID_ACTION_INVENTORY'];
  let workflow;
  try {
    const doc = parseDocument(source, { uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length) return ['INVALID_WORKFLOW_YAML'];
    workflow = doc.toJS({ maxAliasCount: 0 });
  } catch { return ['INVALID_WORKFLOW_YAML']; }
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) return ['INVALID_WORKFLOW_STRUCTURE'];
  const issues = new Set();
  if (!readOnly(workflow.permissions)) issues.add('EXPLICIT_READ_ONLY_PERMISSIONS_REQUIRED');
  const events = typeof workflow.on === 'string' ? [workflow.on] : Array.isArray(workflow.on) ? workflow.on : Object.keys(workflow.on || {});
  if (!events.length) issues.add('EXPLICIT_WORKFLOW_EVENT_REQUIRED');
  if (events.some(event => ['pull_request_target', 'workflow_run'].includes(event))) issues.add('PRIVILEGED_EVENT_REQUIRES_SEPARATE_REVIEW');
  function checkAction(value, step) {
    const match = typeof value === 'string' && value.match(/^([\w.-]+\/[\w./-]+)@([a-f0-9]{40})$/);
    if (!match) { issues.add('FULL_ACTION_SHA_REQUIRED'); return; }
    if (approved[match[1]]?.sha !== match[2]) issues.add('ACTION_PIN_NOT_REVIEWED');
    if (match[1] === 'actions/checkout' && !isFalse(step?.with?.['persist-credentials'])) issues.add('CHECKOUT_CREDENTIAL_PERSISTENCE_FORBIDDEN');
    if (match[1] === 'actions/setup-node' && !isFalse(step?.with?.['package-manager-cache'])) issues.add('IMPLICIT_PACKAGE_MANAGER_CACHE_FORBIDDEN');
    if (match[1] === 'actions/upload-artifact' && !isFalse(step?.with?.['include-hidden-files'])) issues.add('HIDDEN_ARTIFACT_FILES_FORBIDDEN');
  }
  for (const job of Object.values(workflow.jobs)) {
    if (!isRecord(job)) { issues.add('INVALID_JOB'); continue; }
    if (job.permissions !== undefined && !readOnly(job.permissions)) issues.add('JOB_PERMISSION_ESCALATION');
    if (job.uses !== undefined) checkAction(job.uses);
    const secretInputs = JSON.stringify([workflow.env, job.env, job.steps]);
    if (/\bsecrets\s*(?:\.|\[)/.test(secretInputs)) {
      const gate = typeof job.if === 'string' ? job.if.trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '') : '';
      if (gate !== "github.ref == 'refs/heads/main'" || !job.environment) issues.add('SECRETS_REQUIRE_MAIN_AND_PROTECTED_ENVIRONMENT');
    }
    if (job.steps !== undefined && !Array.isArray(job.steps)) { issues.add('INVALID_JOB_STEPS'); continue; }
    for (const step of job.steps || []) {
      if (!isRecord(step)) { issues.add('INVALID_STEP'); continue; }
      if (step.uses !== undefined) checkAction(step.uses, step);
      if (typeof step.run === 'string') {
        if (/\bnpx\s+(?!--no-install(?:\s|$))/.test(step.run)) issues.add('NPX_IMPLICIT_DOWNLOAD_FORBIDDEN');
        if (/\bnpm\s+(?:i|install|update|add)\b/.test(step.run)) issues.add('LOCKFILE_INSTALL_REQUIRED');
        if (/\$\{\{[^}]*\b(?:github\.event(?:\.|\[)|github\.head_ref|inputs(?:\.|\[))/.test(step.run)) issues.add('UNTRUSTED_SHELL_INTERPOLATION');
      }
    }
  }
  return [...issues];
}

export function checkRepositoryWorkflows(root = process.cwd()) {
  const approved = JSON.parse(readFileSync(`${root}/config/github-actions.json`, 'utf8'));
  const directory = `${root}/.github/workflows`;
  return readdirSync(directory).filter(name => /\.ya?ml$/.test(name)).map(name => ({ name,
    issues: workflowSecurityIssues(readFileSync(`${directory}/${name}`, 'utf8'), approved) }));
}

/** The retired backend accepts only the small, unconditional recursive deny policy. */
export function retiredRulesDenyAll(source, service) {
  const compact = source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/\s/g, '');
  const policy = service === 'firestore'
    ? "rules_version='2';servicecloud.firestore{match/databases/{database}/documents{match/{document=**}{allowread,write:iffalse;}}}"
    : "rules_version='2';servicefirebase.storage{match/b/{bucket}/o{match/{allPaths=**}{allowread,write:iffalse;}}}";
  return compact === policy;
}

export const RETIRED_LEGACY_FILES = [
  '.firebaserc',
  'firebase.json',
  'firebase.emulator.json',
  'firebase-blueprint.json',
  'firebase-applet-config.json',
  'firestore.rules',
  'firestore.indexes.json',
  '.openai/hosting.json',
  'BILSEM_Gemini_Soru_Motoru_Guncelleme_Promptu.txt',
];

export function retiredFirebaseIssues(root = process.cwd()) {
  const issues = [];
  for (const file of RETIRED_LEGACY_FILES) {
    if (existsSync(`${root}/${file}`)) issues.push(`RETIRED_LEGACY_FILE_PRESENT:${file}`);
  }
  if (existsSync(`${root}/storage.rules`) && !retiredRulesDenyAll(readFileSync(`${root}/storage.rules`, 'utf8'), 'storage')) {
    issues.push('STORAGE_MUST_DENY_ALL_CLIENTS');
  }
  const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
  const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (Object.keys(dependencies).some(name => /^(?:firebase(?:-admin)?|@firebase\/)/.test(name))) issues.push('RETIRED_FIREBASE_RUNTIME_DEPENDENCY');
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const results = checkRepositoryWorkflows();
    for (const result of results) console.log(`${result.issues.length ? 'FAIL' : 'PASS'} ${result.name}${result.issues.length ? ': ' + result.issues.join(', ') : ''}`);
    const legacy = retiredFirebaseIssues();
    console.log(`${legacy.length ? 'FAIL' : 'PASS'} retired Firebase configuration${legacy.length ? ': ' + legacy.join(', ') : ''}`);
    process.exitCode = results.some(result => result.issues.length) || legacy.length ? 1 : 0;
  } catch {
    console.error('FAIL CI_SECURITY_CHECK_UNAVAILABLE');
    process.exitCode = 1;
  }
}
