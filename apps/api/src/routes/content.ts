import type { FastifyInstance } from 'fastify';

export async function contentRoutes(app: FastifyInstance) {
  app.get('/content/version', async () => {
    return {
      places: 0,
      knowledge: 0,
      policies: 0,
      publishedAt: null,
    };
  });
}