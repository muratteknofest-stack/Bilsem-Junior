import { createVercelConfig } from './scripts/vercel-config.mjs';

// Routing stays environment-specific; Vercel must statically discover build settings.
const generated = createVercelConfig({ ...process.env, VERCEL: '1' });
export const config = {
  buildCommand: "npm run vercel-build",
  outputDirectory: "dist",
  framework: "vite",
  functions: {"api/index.js": {"maxDuration": 60}},
  regions: ["fra1"],
  routes: generated.routes,
  rewrites: generated.rewrites,
  headers: generated.headers,
};
