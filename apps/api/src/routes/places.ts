import type { FastifyInstance, FastifyRequest } from 'fastify';
import { seedPlaces } from '../data/places';

const DEFAULT_PLACE_RADIUS_KM = 3;

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
  municipality?: string;
  rail?: string;
  locale?: string;
};

type PublicPlace = (typeof seedPlaces)[number];

function filterPublishedPlaces(query: PlacesQuery): PublicPlace[] {
  const category = query.category;
  const indoorOutdoor = query.indoorOutdoor;
  const tags = parseCommaList(query.tags);
  const municipality = query.municipality;
  const rail = query.rail;

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

  if (municipality) {
    places = places.filter((place) => place.municipalityCode === municipality);
  }

  if (rail) {
    places = places.filter((place) =>
      place.transitAccess?.some((access) => access.lineId === rail),
    );
  }

  return places;
}

export async function placesRoutes(app: FastifyInstance) {
  app.get('/places', async (request: FastifyRequest<{ Querystring: PlacesQuery }>) => {
    const { query } = request;

    const latitude = parseNumber(query.latitude);
    const longitude = parseNumber(query.longitude);
    const radius = parseNumber(query.radius);

    let places = filterPublishedPlaces(query);

    if (latitude !== undefined && longitude !== undefined) {
      const maxRadius = radius ?? DEFAULT_PLACE_RADIUS_KM;
      places = places.filter(
        (place) => haversineKm(latitude, longitude, place.latitude, place.longitude) <= maxRadius,
      );
    }

    return { places, total: places.length };
  });

  app.get('/places/facets', async (request: FastifyRequest<{ Querystring: PlacesQuery }>) => {
    const places = filterPublishedPlaces({
      category: request.query.category,
      indoorOutdoor: request.query.indoorOutdoor,
      tags: request.query.tags,
    });
    const municipalities: Record<string, number> = {};
    const railLines: Record<string, number> = {};

    for (const place of places) {
      municipalities[place.municipalityCode] =
        (municipalities[place.municipalityCode] ?? 0) + 1;

      const seenLineIds = new Set<string>();
      for (const access of place.transitAccess ?? []) {
        if (seenLineIds.has(access.lineId)) continue;
        railLines[access.lineId] = (railLines[access.lineId] ?? 0) + 1;
        seenLineIds.add(access.lineId);
      }
    }

    return { municipalities, railLines, total: places.length };
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
