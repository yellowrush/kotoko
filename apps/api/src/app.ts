import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { contentRoutes } from './routes/content';
import { placesRoutes } from './routes/places';
import { reportRoutes } from './routes/reports';
import { knowledgeRoutes } from './routes/knowledge';
import { policiesRoutes } from './routes/policies';

export const API_PREFIX = '/api/v1';

const LOCAL_WEB_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const PRODUCTION_WEB_ORIGINS = ['https://yellowrush.github.io'];

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
}

function allowedWebOrigins(): Set<string> {
  const configured = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
  return new Set([...LOCAL_WEB_ORIGINS, ...PRODUCTION_WEB_ORIGINS, ...configured]);
}

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return allowedWebOrigins().has(normalizeOrigin(origin));
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(helmet);
  void app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
  });

  const prefixOptions = { prefix: API_PREFIX };
  void app.register(healthRoutes, prefixOptions);
  void app.register(authRoutes, prefixOptions);
  void app.register(contentRoutes, prefixOptions);
  void app.register(placesRoutes, prefixOptions);
  void app.register(reportRoutes, prefixOptions);
  void app.register(knowledgeRoutes, prefixOptions);
  void app.register(policiesRoutes, prefixOptions);

  return app;
}
