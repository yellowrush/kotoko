import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { PlaceReportType } from '@kodoko/domain';
import { seedPlaces } from '../data/places';

export type PlaceReportRecord = {
  id: string;
  placeId: string;
  type: PlaceReportType;
  detail?: string;
  contactEmail?: string;
  ip: string;
  createdAt: string;
};

const reportBodySchema = z
  .object({
    type: z.enum([
      'business_hours',
      'price',
      'reservation',
      'address',
      'media',
      'outdated',
      'closed',
      'other',
    ]),
    detail: z.string().trim().max(2000).optional(),
    contactEmail: z.string().email().optional(),
  })
  .strict();

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 分
const RATE_LIMIT_MAX = 5; // 同一 IP 每 10 分钟内最多 5 条

/** 报告队列。正式后台（apps/admin）接入前保存在内存中。 */
const reportStore: PlaceReportRecord[] = [];
const ipHits = new Map<string, number[]>();

function prune(now: number) {
  for (const [key, times] of ipHits) {
    const kept = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (kept.length === 0) ipHits.delete(key);
    else ipHits.set(key, kept);
  }
}

function consumeRateLimit(ip: string, now: number): boolean {
  prune(now);
  const hits = ipHits.get(ip) ?? [];
  if (hits.length >= RATE_LIMIT_MAX) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

function parseReportBody(body: unknown, reply: FastifyReply) {
  const parsed = reportBodySchema.safeParse(body);
  if (!parsed.success) {
    reply.status(400).send({
      error: {
        code: 'INVALID_BODY',
        message: 'Report body is invalid.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return null;
  }
  return parsed.data;
}

/** 仅在测试中重置内存状态，避免跨用例的限流/队列泄漏。 */
export function resetReportState() {
  reportStore.length = 0;
  ipHits.clear();
}

export async function reportRoutes(app: FastifyInstance) {
  app.post('/places/:placeId/reports', async (request, reply) => {
    const { placeId } = request.params as { placeId: string };
    const place = seedPlaces.find((p) => p.id === placeId);
    if (!place) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: `Place ${placeId} was not found.` },
      });
    }

    if (!consumeRateLimit(request.ip, Date.now())) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many reports. Try again later.' },
      });
    }

    const body = parseReportBody(request.body, reply);
    if (!body) return;

    const record: PlaceReportRecord = {
      id: crypto.randomUUID(),
      placeId,
      type: body.type,
      detail: body.detail,
      contactEmail: body.contactEmail,
      ip: request.ip,
      createdAt: new Date().toISOString(),
    };
    reportStore.push(record);

    return { id: record.id, status: 'received' };
  });

  // 审核队列。正式后台接入前仅提供最小查询。
  app.get('/admin/reports', async () => ({ reports: reportStore }));
}