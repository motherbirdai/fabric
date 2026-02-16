import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

const SENTRY_DSN = process.env.SENTRY_DSN || '';

interface SentryLike {
  captureException(err: Error, context?: Record<string, any>): void;
  captureMessage(msg: string, level?: string): void;
  setTag(key: string, value: string): void;
}

let sentry: SentryLike | null = null;

/**
 * Initialize Sentry for error tracking.
 * Uses a lightweight wrapper — swap for @sentry/node in production.
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured — error tracking disabled');
    return;
  }

  // In production, replace with:
  // import * as Sentry from '@sentry/node';
  // Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
  // sentry = Sentry;

  sentry = {
    captureException(err: Error, context?: Record<string, any>) {
      console.error('[Sentry]', err.message, context);
    },
    captureMessage(msg: string, level = 'info') {
      console.log(`[Sentry:${level}]`, msg);
    },
    setTag(key: string, value: string) {
      // no-op in stub
    },
  };

  console.log('[Sentry] Error tracking initialized');
}

/**
 * Capture an exception to Sentry.
 */
export function captureException(
  err: Error,
  context?: Record<string, any>
): void {
  sentry?.captureException(err, context);
}

/**
 * Capture a message to Sentry.
 */
export function captureMessage(msg: string, level = 'info'): void {
  sentry?.captureMessage(msg, level);
}

/**
 * Fastify error handler plugin — sends unhandled errors to Sentry.
 */
async function sentryPluginFn(app: FastifyInstance) {
  app.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    captureException(error, {
      url: request.url,
      method: request.method,
      accountId: request.account?.id,
      statusCode: reply.statusCode,
    });
  });
}

export const sentryPlugin = fp(sentryPluginFn, {
  name: 'fabric-sentry',
});
