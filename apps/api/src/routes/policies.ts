import type { FastifyInstance, FastifyRequest } from 'fastify';
import { seedPolicies } from '../data/policies';

type PoliciesQuery = {
  locale?: string;
};

type PolicyParams = {
  policyId: string;
};

export async function policiesRoutes(app: FastifyInstance) {
  app.get(
    '/policies',
    async (request: FastifyRequest<{ Querystring: PoliciesQuery }>) => {
      const locale = request.query.locale ?? 'ja';
      const policies = seedPolicies.filter(
        (item) => item.status === 'published' && item.locale === locale,
      );
      return { policies, total: policies.length };
    },
  );

  app.get(
    '/policies/:policyId',
    async (
      request: FastifyRequest<{ Params: PolicyParams; Querystring: PoliciesQuery }>,
      reply,
    ) => {
      const { policyId } = request.params;
      const locale = request.query.locale ?? 'ja';
      const entry =
        seedPolicies.find((item) => item.id === policyId && item.locale === locale) ??
        seedPolicies.find((item) => item.id === policyId && item.locale === 'ja');
      if (!entry) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Policy ${policyId} was not found.` },
        });
      }
      return entry;
    },
  );
}