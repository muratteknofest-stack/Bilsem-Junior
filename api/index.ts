import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/api-app';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const route = url.searchParams.get('__path');
  if (route !== null) {
    url.searchParams.delete('__path');
    req.url = `/api/${route}${url.search}`;
  }
  app(req, res);
}
