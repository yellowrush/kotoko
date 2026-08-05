import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'kodoko-api',
      version: '0.0.0',
      time: new Date().toISOString(),
    };
  });
}