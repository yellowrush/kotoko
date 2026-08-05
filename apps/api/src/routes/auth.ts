import type { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/session', async () => {
    // Sprint 7: session 尚未实现。保持最小范围（仅登录与账号身份）。
    return { authenticated: false };
  });

  app.post('/auth/login', async (_request, reply) => {
    reply.status(501).send({
      error: { code: 'NOT_IMPLEMENTED', message: 'Login is not implemented yet.' },
    });
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.status(501).send({
      error: { code: 'NOT_IMPLEMENTED', message: 'Logout is not implemented yet.' },
    });
  });
}