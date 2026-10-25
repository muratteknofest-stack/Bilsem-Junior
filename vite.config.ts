import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';
import { blogPlugin } from './scripts/blog-vite-plugin';
import { blogConfig } from './scripts/blog-engine';
import { publicBuildSettings } from './scripts/public-build-settings';
import { androidBuildSettings, androidViewportHtml } from './scripts/android-build-settings';
import { browserDirectives } from './server/browser-security';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(({ mode }) => {
  const native = mode === 'android';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const publicSettings = native ? androidBuildSettings(env) : publicBuildSettings(env, mode === 'production', process.env.VERCEL === '1', blogConfig().origin);
  const nativePolicy = Object.entries({ ...browserDirectives, connectSrc: [...browserDirectives.connectSrc, publicSettings.VITE_API_BASE_URL, publicSettings.VITE_SUPABASE_URL, publicSettings.VITE_SUPABASE_URL.replace('https:', 'wss:')] })
    .map(([key, values]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}${values.length ? ` ${[...new Set(values)].filter(Boolean).join(' ')}` : ''}`)
    .filter(value => !value.startsWith('frame-ancestors')).join('; ');
  return {
    // Empty prefix list disables automatic exports, including similarly named secrets.
    envPrefix: [],
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), ...(native ? [{ name: 'android-content-policy', apply: 'build' as const, transformIndexHtml: (html: string) => ({ html: androidViewportHtml(html), tags: [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: nativePolicy }, injectTo: 'head-prepend' as const }] }) }] : [blogPlugin()])],
    // Vercel serves /api in this project. Ignore stale external API settings there.
    define: {
      ...Object.fromEntries(Object.entries(publicSettings).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(native ? 'android' : 'web'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: native ? 'dist-android' : 'dist',
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        input: Object.fromEntries([['main', path.resolve(__dirname, 'index.html')], ...(native ? [] : [['english', path.resolve(__dirname, 'en/index.html')]])]),
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/@supabase/')) return 'supabase';
            if (id.includes('/motion/') || id.includes('/framer-motion/')) return 'motion';
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/android/**', '**/dist-android/**', '**/build/**', '**/test-artifacts/**', '**/server/generated-api.mjs'],
      },
    },
  };
});


