import type { FastifyInstance } from 'fastify';
import { seedPlaces } from '../data/places';
import { seedKnowledge } from '../data/knowledge';
import { seedPolicies } from '../data/policies';

export async function contentRoutes(app: FastifyInstance) {
  app.get('/content/version', async () => {
    return {
      places: seedPlaces.filter((p) => p.status === 'published').length,
      knowledge: seedKnowledge.filter((k) => k.status === 'published').length,
      policies: seedPolicies.filter((p) => p.status === 'published').length,
      publishedAt: '2026-01-10T00:00:00.000Z',
    };
  });
}
