import { createApiApp } from '../server/generated-api.mjs';

const app = createApiApp();

export default function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const route = url.searchParams.get('__path');
  if (route !== null) {
    url.searchParams.delete('__path');
    req.url = `/api/${route}${url.search}`;
  }
  app(req, res);
}
