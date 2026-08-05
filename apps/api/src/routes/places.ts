import type { FastifyInstance, FastifyRequest } from 'fastify';
import { seedPlaces } from '../data/places';

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseCommaList(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type PlacesQuery = {
  category?: string;
  indoorOutdoor?: string;
  tags?: string;
  latitude?: string;
  longitude?: string;
  radius?: string;
  locale?: string;
};

export async function placesRoutes(app: FastifyInstance) {
  app.get('/places', async (request: FastifyRequest<{ Querystring: PlacesQuery }>) => {
    const { query } = request;

    const category = query.category;
    const indoorOutdoor = query.indoorOutdoor;
    const tags = parseCommaList(query.tags);
    const latitude = parseNumber(query.latitude);
    const longitude = parseNumber(query.longitude);
    const radius = parseNumber(query.radius);

    let places = seedPlaces.filter((place) => place.status === 'published');

    if (category) {
      places = places.filter((place) => place.category === category);
    }

    if (indoorOutdoor) {
      places = places.filter((place) => place.indoorOutdoor === indoorOutdoor);
    }

    if (tags && tags.length > 0) {
      places = places.filter(
        (place) => place.tags?.some((tag) => tags.includes(tag)),
      );
    }

    if (latitude !== undefined && longitude !== undefined) {
      const maxRadius = radius ?? 20;
      places = places.filter(
        (place) => haversineKm(latitude, longitude, place.latitude, place.longitude) <= maxRadius,
      );
    }

    return { places, total: places.length };
  });

  app.get('/places/:placeId', async (request, reply) => {
    const { placeId } = request.params as { placeId: string };
    const place = seedPlaces.find((p) => p.id === placeId && p.status === 'published');
    if (!place) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: `Place ${placeId} was not found.` },
      });
    }
    return place;
  });
}
