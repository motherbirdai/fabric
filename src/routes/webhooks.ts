import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getStripe, isStripeConfigured } from '../../services/billing/stripe-client.js';
import { handleWebhookEvent } from '../../services/billing/webhooks.js';
import { STRIPE_WEBHOOK_SECRET } from '../../config.js';
import { increment } from '../../utils/metrics.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Add raw body content type parser for webhook
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      // Store raw body for signature verification
      (req as any).rawBody = body;
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  app.post(
    '/webhooks/stripe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured() || !STRIPE_WEBHOOK_SECRET) {
        return reply.status(503).send({
          error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook not configured' },
        });
      }

      const sig = request.headers['stripe-signature'];
      if (!sig) {
        return reply.status(400).send({
          error: { code: 'NO_SIGNATURE', message: 'Missing stripe-signature header' },
        });
      }

      const rawBody = (request as any).rawBody;
      if (!rawBody) {
        return reply.status(400).send({
          error: { code: 'NO_BODY', message: 'Missing request body' },
        });
      }

      const stripe = getStripe();

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig as string,
          STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        increment('stripe.webhook.invalid');
        return reply.status(400).send({
          error: {
            code: 'INVALID_SIGNATURE',
            message: `Webhook signature verification failed: ${(err as Error).message}`,
          },
        });
      }

      try {
        const eventType = await handleWebhookEvent(event);
        return { received: true, type: eventType };
      } catch (err) {
        request.log.error(
          { error: (err as Error).message, eventType: event.type },
          'Webhook handler failed'
        );

        // Return 200 to prevent Stripe from retrying
        // (we log the error and handle it internally)
        return { received: true, type: event.type, error: 'Handler failed' };
      }
    }
  );
}
