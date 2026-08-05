import type { FastifyInstance } from 'fastify';
import { seedPlaces } from '../data/places';

export async function contentRoutes(app: FastifyInstance) {
  app.get('/content/version', async () => {
    return {
      places: seedPlaces.filter((p) => p.status === 'published').length,
      knowledge: 0,
      policies: 0,
      publishedAt: '2026-01-10T00:00:00.000Z',
    };
  });
}
