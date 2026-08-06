import type { FastifyInstance, FastifyRequest } from 'fastify';
import { seedKnowledge } from '../data/knowledge';

type KnowledgeQuery = {
  locale?: string;
};

type KnowledgeDetailQuery = {
  locale?: string;
};

export async function knowledgeRoutes(app: FastifyInstance) {
  app.get(
    '/knowledge',
    async (request: FastifyRequest<{ Querystring: KnowledgeQuery }>) => {
      const locale = request.query.locale ?? 'ja';
      const knowledge = seedKnowledge.filter(
        (item) => item.status === 'published' && item.locale === locale,
      );
      return { knowledge, total: knowledge.length };
    },
  );

  app.get(
    '/knowledge/:knowledgeId',
    async (request: FastifyRequest<{ Params: { knowledgeId: string }; Querystring: KnowledgeDetailQuery }>, reply) => {
      const { knowledgeId } = request.params;
      const locale = request.query.locale ?? 'ja';
      const entry =
        seedKnowledge.find((item) => item.id === knowledgeId && item.locale === locale) ??
        // 指定語言沒有翻譯時，回退到日文原本，避免 404。
        seedKnowledge.find((item) => item.id === knowledgeId && item.locale === 'ja');
      if (!entry) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Knowledge ${knowledgeId} was not found.` },
        });
      }
      return entry;
    },
  );
}