import { createVercelConfig } from './scripts/vercel-config.mjs';

// Loading this entry point always means a Vercel deployment. Missing system
// metadata must never select the local-production fallback.
export const config = createVercelConfig({ ...process.env, VERCEL: '1' });
