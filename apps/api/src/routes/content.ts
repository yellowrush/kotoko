import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { seedPlaces } from '../data/places';
import { seedKnowledge } from '../data/knowledge';
import { seedPolicies } from '../data/policies';

type VersionableContent = {
  id: string;
  status: string;
  sourceCheckedAt?: string;
  reviewedAt?: string;
  version?: number;
};

type ContentCollectionVersion = {
  count: number;
  latestSourceCheckedAt: string | null;
  latestReviewedAt: string | null;
  maxVersion: number;
  signature: string;
};

function latest(values: Array<string | null | undefined>): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted.at(-1) ?? null;
}

function hash(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

function collectionVersion(items: VersionableContent[]): ContentCollectionVersion {
  const published = items.filter((item) => item.status === 'published');
  const maxVersion = published.reduce((max, item) => Math.max(max, item.version ?? 0), 0);
  const signature = hash(
    published
      .map((item) =>
        [
          item.id,
          item.sourceCheckedAt ?? '',
          item.reviewedAt ?? '',
          String(item.version ?? 0),
        ].join('|'),
      )
      .sort(),
  );

  return {
    count: published.length,
    latestSourceCheckedAt: latest(published.map((item) => item.sourceCheckedAt)),
    latestReviewedAt: latest(published.map((item) => item.reviewedAt)),
    maxVersion,
    signature,
  };
}

export function buildContentVersion(input: {
  places: VersionableContent[];
  knowledge: VersionableContent[];
  policies: VersionableContent[];
}) {
  const places = collectionVersion(input.places);
  const knowledge = collectionVersion(input.knowledge);
  const policies = collectionVersion(input.policies);
  const publishedAt = latest([
    places.latestSourceCheckedAt,
    places.latestReviewedAt,
    knowledge.latestSourceCheckedAt,
    knowledge.latestReviewedAt,
    policies.latestSourceCheckedAt,
    policies.latestReviewedAt,
  ]);

  return {
    places,
    knowledge,
    policies,
    publishedAt,
    signature: hash([places.signature, knowledge.signature, policies.signature]),
  };
}

export async function contentRoutes(app: FastifyInstance) {
  app.get('/content/version', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return buildContentVersion({
      places: seedPlaces,
      knowledge: seedKnowledge,
      policies: seedPolicies,
    });
  });
}
