import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { contentRoutes } from './routes/content';
import { placesRoutes } from './routes/places';
import { knowledgeRoutes } from './routes/knowledge';

export const API_PREFIX = '/api/v1';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true, credentials: true });

  const prefixOptions = { prefix: API_PREFIX };
  void app.register(healthRoutes, prefixOptions);
  void app.register(authRoutes, prefixOptions);
  void app.register(contentRoutes, prefixOptions);
  void app.register(placesRoutes, prefixOptions);
  void app.register(knowledgeRoutes, prefixOptions);

  return app;
}