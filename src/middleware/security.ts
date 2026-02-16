import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { IS_PROD } from '../config.js';
import { increment, observe } from '../utils/metrics.js';

/**
 * Security headers middleware.
 * Adds production security headers beyond what Helmet provides.
 */
async function securityPluginFn(app: FastifyInstance) {
  // ─── Request ID ───
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.headers['x-request-id'] as string
      || crypto.randomUUID();
    reply.header('X-Request-Id', requestId);
    (request as any).fabricRequestId = requestId;
  });

  // ─── Security headers ───
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (IS_PROD) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Remove server identification
    reply.removeHeader('X-Powered-By');
  });

  // ─── Request timing ───
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime as bigint | undefined;
    if (startTime) {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      observe('http.response_time_ms', durationMs);
      increment('http.requests_total');

      if (reply.statusCode >= 500) {
        increment('http.5xx');
      } else if (reply.statusCode >= 400) {
        increment('http.4xx');
      } else {
        increment('http.2xx');
      }
    }
  });

  // ─── Payload size limit ───
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

    if (contentLength > MAX_BODY_SIZE) {
      return reply.status(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds ${MAX_BODY_SIZE / 1024 / 1024}MB limit`,
        },
      });
    }
  });
}

export const securityPlugin = fp(securityPluginFn, {
  name: 'fabric-security',
});
