import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Render the real test components without booting authentication or editorial pages. */
export function createQuestionFixtureServer(port, entry = 'tests/browser/question-screen.html') {
  return createServer({
    configFile: false,
    plugins: [react(), tailwindcss()],
    cacheDir: `node_modules/.vite-question-fixture-${port}`,
    optimizeDeps: { entries: [entry] },
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: null },
  });
}
