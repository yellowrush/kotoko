import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './src/app';

// Vercel Functions 入口（官方 Fastify on Vercel 模式）：
// 每個請求直接餵給 Fastify 的 Node HTTP server，不需要 listen。
const app = buildApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await app.ready();
  app.server.emit('request', req, res);
}
