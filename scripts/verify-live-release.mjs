import { pathToFileURL } from 'node:url';

export async function verifyHealthResponse(response, { commit, projectRef }) {
  if (response.status !== 200 || response.redirected ||
      !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new Error('Application health unavailable: redirect, protection page or invalid response.');
  }
  const health = await response.json();
  if (health.status !== 'ok' || health.database !== 'ready' ||
      health.projectRef !== projectRef || health.commit !== commit) {
    throw new Error('Release not ready: database, project or commit does not match.');
  }
  return health;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [originText, commit, projectRef] = process.argv.slice(2);
    const origin = new URL(originText);
    if (origin.protocol !== 'https:' || origin.username || origin.password ||
        origin.search || origin.hash || origin.pathname !== '/' ||
        !/^[a-f0-9]{40}$/.test(commit || '') || !/^[a-z0-9]{20}$/.test(projectRef || '')) {
      throw new Error('Usage: npm run verify:live -- https://site.example COMMIT_SHA SUPABASE_PROJECT_REF');
    }
    const response = await fetch(new URL('/api/health', origin), {
      redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' },
    });
    await verifyHealthResponse(response, { commit, projectRef });
    console.log('Release health verified: expected commit and database project are ready.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release verification failed.');
    process.exitCode = 1;
  }
}
