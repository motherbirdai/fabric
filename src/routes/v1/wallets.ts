import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import {
  PlanFeatureError,
  ValidationError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';
import {
  createManagedWallet,
  getWalletBalance,
  listAccountWallets,
} from '../../services/payments/wallets.js';
import { PLAN_CONFIG, type PlanName } from '../../config.js';

const createWalletSchema = z.object({
  agentId: z.string().min(1),
});

export async function walletRoutes(app: FastifyInstance) {
  // ─── List wallets ───
  app.get('/wallets', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canRoute) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('managed wallets'))
      );
    }

    const wallets = await listAccountWallets(request.account!.id);
    const planConfig = PLAN_CONFIG[request.account!.plan];

    return {
      wallets,
      maxWallets: planConfig.maxWallets,
      used: wallets.filter((w) => w.address).length,
    };
  });

  // ─── Create wallet ───
  app.post('/wallets', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canRoute) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('managed wallets'))
      );
    }

    const parsed = createWalletSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('agentId is required'))
      );
    }

    const { agentId } = parsed.data;

    // Verify agent belongs to account
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, accountId: request.account!.id },
    });

    if (!agent) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Agent'))
      );
    }

    // Check wallet limit
    const planConfig = PLAN_CONFIG[request.account!.plan];
    const existingWallets = await prisma.agent.count({
      where: {
        accountId: request.account!.id,
        walletAddress: { not: null },
      },
    });

    if (existingWallets >= planConfig.maxWallets) {
      return reply.status(403).send({
        error: {
          code: 'WALLET_LIMIT',
          message: `Your ${request.account!.plan} plan allows ${planConfig.maxWallets} wallets. Upgrade for more.`,
        },
      });
    }

    // Create wallet
    const wallet = await createManagedWallet(agentId);

    return reply.status(201).send({
      wallet: {
        address: wallet.address,
        agentId: wallet.agentId,
        createdAt: wallet.createdAt,
        chain: 'base',
        note: 'Fund this wallet with USDC on Base to enable on-chain payments',
      },
    });
  });

  // ─── Get wallet balance ───
  app.get(
    '/wallets/:agentId/balance',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.account?.config.canRoute) {
        return reply.status(403).send(
          toErrorResponse(new PlanFeatureError('managed wallets'))
        );
      }

      const { agentId } = request.params as { agentId: string };

      // Verify agent belongs to account
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, accountId: request.account!.id },
      });

      if (!agent) {
        return reply.status(404).send(
          toErrorResponse(new NotFoundError('Agent'))
        );
      }

      if (!agent.walletAddress) {
        return reply.status(404).send({
          error: {
            code: 'NO_WALLET',
            message: 'Agent has no managed wallet. Create one via POST /v1/wallets',
          },
        });
      }

      const balance = await getWalletBalance(agentId);

      return {
        agentId,
        address: agent.walletAddress,
        chain: 'base',
        balances: balance || { usdc: 0, eth: 0 },
      };
    }
  );
}
