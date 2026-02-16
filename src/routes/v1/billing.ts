import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createCheckoutSession,
  createPortalSession,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  getSubscription,
} from '../../services/billing/subscriptions.js';
import { getOverageSummary } from '../../services/billing/overage.js';
import { listInvoices, getUpcomingEstimate } from '../../services/billing/invoices.js';
import { isStripeConfigured } from '../../services/billing/stripe-client.js';
import { PLAN_PRICES_USD, type PlanName } from '../../config.js';
import { toErrorResponse, ValidationError } from '../../utils/errors.js';

const checkoutSchema = z.object({
  plan: z.enum(['BUILDER', 'PRO', 'TEAM']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const changePlanSchema = z.object({
  plan: z.enum(['FREE', 'BUILDER', 'PRO', 'TEAM']),
});

export async function billingRoutes(app: FastifyInstance) {
  // ─── Subscription info ───
  app.get('/billing/subscription', async (request: FastifyRequest) => {
    const sub = await getSubscription(request.account!.id);

    return {
      plan: request.account!.plan,
      priceUsd: PLAN_PRICES_USD[request.account!.plan as PlanName] ?? 0,
      subscription: sub,
      stripeConfigured: isStripeConfigured(),
    };
  });

  // ─── Create checkout session ───
  app.post(
    '/billing/checkout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' },
        });
      }

      const parsed = checkoutSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(
          toErrorResponse(new ValidationError(parsed.error.issues[0].message))
        );
      }

      const { plan, successUrl, cancelUrl } = parsed.data;

      // Check if already on this plan
      if (request.account!.plan === plan) {
        return reply.status(400).send({
          error: { code: 'ALREADY_ON_PLAN', message: `Already on ${plan} plan` },
        });
      }

      const session = await createCheckoutSession(
        request.account!.id,
        plan,
        successUrl,
        cancelUrl
      );

      return { url: session.url, sessionId: session.sessionId };
    }
  );

  // ─── Billing portal ───
  app.post(
    '/billing/portal',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' },
        });
      }

      const { returnUrl } = (request.body as { returnUrl?: string }) || {};

      const session = await createPortalSession(
        request.account!.id,
        returnUrl || 'https://dashboard.fabric.computer/settings'
      );

      return { url: session.url };
    }
  );

  // ─── Change plan ───
  app.post(
    '/billing/plan',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' },
        });
      }

      const parsed = changePlanSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(
          toErrorResponse(new ValidationError(parsed.error.issues[0].message))
        );
      }

      const { plan } = parsed.data;

      if (plan === request.account!.plan) {
        return reply.status(400).send({
          error: { code: 'ALREADY_ON_PLAN', message: `Already on ${plan} plan` },
        });
      }

      if (plan === 'FREE') {
        const result = await cancelSubscription(request.account!.id);
        return {
          message: 'Subscription will be cancelled at end of billing period',
          cancelAtPeriodEnd: true,
        };
      }

      const result = await changePlan(request.account!.id, plan);
      return {
        plan,
        prorationAmount: result.prorationAmount,
        message: `Plan changed to ${plan}`,
      };
    }
  );

  // ─── Cancel subscription ───
  app.post(
    '/billing/cancel',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' },
        });
      }

      await cancelSubscription(request.account!.id);
      return {
        message: 'Subscription will be cancelled at end of billing period',
        note: 'You will retain access until the end of your current billing cycle',
      };
    }
  );

  // ─── Reactivate cancelled subscription ───
  app.post(
    '/billing/reactivate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' },
        });
      }

      await reactivateSubscription(request.account!.id);
      return { message: 'Subscription reactivated' };
    }
  );

  // ─── Invoices ───
  app.get('/billing/invoices', async (request: FastifyRequest) => {
    const invoices = await listInvoices(request.account!.id);
    return { invoices };
  });

  // ─── Upcoming invoice estimate ───
  app.get('/billing/upcoming', async (request: FastifyRequest) => {
    const estimate = await getUpcomingEstimate(request.account!.id);
    if (!estimate) {
      return { message: 'No active subscription' };
    }
    return { upcoming: estimate };
  });

  // ─── Overage summary ───
  app.get('/billing/overage', async (request: FastifyRequest) => {
    const overage = await getOverageSummary(request.account!.id);
    return { overage };
  });
}
