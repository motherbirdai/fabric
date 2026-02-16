import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { createHash } from 'crypto';
import { registerAgentOnChain, mintIdentityOnChain } from '../../services/chain/writer.js';
import { emitEvent } from '../../services/events/websocket.js';

export async function providerRoutes(app: FastifyInstance) {

  // ─── Register a new provider ───
  app.post('/providers/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      category: string;
      endpoint: string;
      description?: string;
      priceUsd?: number;
      walletAddress?: string;
      x402Enabled?: boolean;
    };

    if (!body.name || body.name.length < 2) {
      return reply.status(400).send({ error: { code: 'INVALID_NAME', message: 'Name must be at least 2 characters' } });
    }
    if (!body.category) {
      return reply.status(400).send({ error: { code: 'INVALID_CATEGORY', message: 'Category is required' } });
    }
    if (!body.endpoint || !body.endpoint.startsWith('http')) {
      return reply.status(400).send({ error: { code: 'INVALID_ENDPOINT', message: 'Valid HTTPS endpoint is required' } });
    }

    // Deterministic IDs
    const registryId = '0x' + createHash('sha256').update(`${body.name}:${body.endpoint}`).digest('hex');

    // Check duplicate
    const existing = await prisma.provider.findFirst({
      where: { OR: [{ registryId }, { endpoint: body.endpoint }] },
    });
    if (existing) {
      return reply.status(409).send({
        error: {
          code: 'PROVIDER_EXISTS',
          message: existing.endpoint === body.endpoint
            ? 'A provider with this endpoint is already registered'
            : 'A provider with this identity already exists',
        },
      });
    }

    const provider = await prisma.provider.create({
      data: {
        registryId,
        name: body.name.trim(),
        category: body.category,
        endpoint: body.endpoint.trim(),
        description: body.description?.trim() || null,
        priceUsd: body.priceUsd || 0,
        basePrice: body.priceUsd || 0,
        walletAddress: body.walletAddress?.trim() || null,
        x402Wallet: body.walletAddress?.trim() || null,
        paymentType: (body.x402Enabled ?? true) ? 'x402' : 'free',
        trustScore: 3.0,
        totalInteractions: 0,
        active: true,
      },
    });

    // Attempt on-chain registration (non-blocking — succeeds even if chain unavailable)
    let txHash: string | null = null;
    let onChainId: bigint | null = null;
    try {
      const chainResult = await registerAgentOnChain(
        body.name.trim(),
        body.category,
        body.endpoint.trim()
      );
      if (chainResult) {
        txHash = chainResult.txHash;
        onChainId = chainResult.onChainId;
        // Store on-chain ID back to DB
        await prisma.provider.update({
          where: { id: provider.id },
          data: { registryId: `${registryId}:${onChainId}` },
        });

        // Mint identity NFT if wallet provided
        if (body.walletAddress) {
          try {
            await mintIdentityOnChain(
              body.walletAddress.trim() as `0x${string}`,
              onChainId
            );
          } catch {}
        }
      }
    } catch (err) {
      // On-chain registration failed — provider still registered off-chain
      console.warn('[Providers] On-chain registration failed, continuing off-chain:', err);
    }

    // Emit real-time event
    emitEvent({ type: 'provider.registered', data: { providerId: provider.id, name: provider.name, category: provider.category, txHash: txHash || undefined } });

    return reply.status(201).send({
      agentId: provider.id,
      registryId: provider.registryId,
      onChainId: onChainId ? onChainId.toString() : null,
      name: provider.name,
      category: provider.category,
      endpoint: provider.endpoint,
      trustScore: provider.trustScore,
      txHash,
    });
  });
  });

  // ─── List providers ───
  app.get('/providers/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { category?: string; limit?: string; offset?: string };
    const where: any = { active: true };
    if (query.category) where.category = query.category;

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        orderBy: { trustScore: 'desc' },
        take: Math.min(Number(query.limit) || 50, 100),
        skip: Number(query.offset) || 0,
        select: {
          id: true,
          registryId: true,
          name: true,
          category: true,
          endpoint: true,
          description: true,
          priceUsd: true,
          trustScore: true,
          totalInteractions: true,
          active: true,
          walletAddress: true,
          createdAt: true,
        },
      }),
      prisma.provider.count({ where }),
    ]);

    return { providers, total };
  });

  // ─── Get single provider ───
  app.get('/providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const provider = await prisma.provider.findFirst({
      where: { OR: [{ id }, { registryId: id }] },
    });
    if (!provider) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
    }
    return provider;
  });

  // ─── Update provider ───
  app.patch('/providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      endpoint?: string;
      description?: string;
      priceUsd?: number;
      active?: boolean;
    };

    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
    }

    const updated = await prisma.provider.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.endpoint !== undefined && { endpoint: body.endpoint }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priceUsd !== undefined && { priceUsd: body.priceUsd, basePrice: body.priceUsd }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    return updated;
  });

  // ─── Deactivate provider ───
  app.delete('/providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
    }

    await prisma.provider.update({ where: { id }, data: { active: false } });
    return { success: true, message: 'Provider deactivated' };
  });
}
