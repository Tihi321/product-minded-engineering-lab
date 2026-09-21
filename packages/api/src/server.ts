import Fastify from 'fastify';
import cors from '@fastify/cors';
import { IngestRequest } from '@rb2/domain';
import { createAdapters } from './adapters.js';
import { config } from './config.js';
import { OrderService } from './workflow.js';

export function createApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  app.register(cors, { origin: true });
  const adapters = createAdapters();
  const service = new OrderService(adapters);
  app.addHook('onClose', async () => adapters.repo.close());

  app.get('/health', async () => ({ ok: true, service: 'order-intake-lab', mode: config.llmMode }));

  app.post('/api/orders', async (request, reply) => {
    const parsed = IngestRequest.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await service.ingest(parsed.data);
    return reply.code(result.duplicate ? 200 : 201).send(result);
  });

  app.get('/api/orders', async () => ({ orders: adapters.repo.list() }));

  app.get('/api/orders/:id', async (request, reply) => {
    const order = adapters.repo.get((request.params as { id: string }).id);
    return order ? order : reply.code(404).send({ error: 'Order not found' });
  });

  app.post('/api/orders/:id/review', async (request, reply) => {
    try {
      return service.review((request.params as { id: string }).id, request.body);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Review failed' });
    }
  });

  app.post('/api/orders/:id/export', async (request, reply) => {
    try {
      return await service.export((request.params as { id: string }).id);
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : 'Export failed' });
    }
  });

  app.get('/api/metrics', async () => adapters.repo.metrics());
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createApp().listen({ port: config.port, host: '0.0.0.0' }).then(() => console.log(`Order Intake Lab listening on http://localhost:${config.port}`));
}

