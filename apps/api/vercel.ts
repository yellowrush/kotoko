import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './src/app';

type InjectResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  rawPayload: Buffer;
};

// Vercel Functions 入口。
// 為了不依賴 Fastify 對外 listen（Serverless 沒有常駐 server），
// 用 fastify.inject 在本程序內跑完整請求。
// Node runtime 由 vercel.json 固定為 nodejs20.x（Fastify 5 需要 Node >= 20）。
const app = buildApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await app.ready();

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const payload = Buffer.concat(chunks);

  const result = (await app.inject({
    method: (req.method ?? 'GET') as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'HEAD'
      | 'OPTIONS',
    url: req.url ?? '/',
    headers: req.headers as Record<string, string | string[]>,
    payload: payload.length > 0 ? payload : undefined,
    remoteAddress: req.socket?.remoteAddress,
  })) as unknown as InjectResponse;

  res.statusCode = result.statusCode;
  for (const [key, value] of Object.entries(result.headers)) {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }
  res.end(result.rawPayload);
}