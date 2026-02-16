import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { webSearchBodySchema } from '../../utils/validation.js';
import { ValidationError, toErrorResponse } from '../../utils/errors.js';
import { BRAVE_API_KEY } from '../../config.js';

export async function webSearchRoutes(app: FastifyInstance) {
  app.post('/web-search', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!BRAVE_API_KEY) {
      return reply.status(503).send(
        toErrorResponse(new Error('Web search is not configured'))
      );
    }

    const parsed = webSearchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { query, count } = parsed.data;

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      request.log.error({ err }, 'Brave Search request failed');
      return reply.status(502).send(
        toErrorResponse(new Error('Search request failed'))
      );
    }

    if (!response.ok) {
      request.log.error({ status: response.status }, 'Brave Search returned error');
      return reply.status(502).send(
        toErrorResponse(new Error('Search upstream error'))
      );
    }

    const data = await response.json() as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };

    const results = (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));

    return {
      results,
      count: results.length,
      query,
      provider: {
        name: 'Brave Search',
        endpoint: '/v1/web-search',
        trustScore: 5,
      },
    };
  });
}
