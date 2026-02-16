import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../../db/client.js';
import { verifyMessage } from 'viem';

// In-memory nonce store (use Redis in production)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

const NONCE_TTL = 300_000; // 5 minutes
const SESSION_TTL = 86400_000; // 24 hours

/**
 * SIWE (Sign-In with Ethereum) authentication routes.
 * Allows wallet-based authentication alongside API key auth.
 */
export async function siweRoutes(app: FastifyInstance) {

  // ─── Get nonce for SIWE message ───
  app.get('/auth/siwe/nonce', async (request: FastifyRequest, reply: FastifyReply) => {
    const nonce = randomBytes(16).toString('hex');
    const address = (request.query as any).address;

    if (!address || typeof address !== 'string') {
      return reply.status(400).send({ error: { code: 'INVALID_ADDRESS', message: 'Wallet address is required' } });
    }

    nonceStore.set(address.toLowerCase(), {
      nonce,
      expiresAt: Date.now() + NONCE_TTL,
    });

    // Clean expired nonces
    for (const [key, val] of nonceStore) {
      if (val.expiresAt < Date.now()) nonceStore.delete(key);
    }

    return {
      nonce,
      message: buildSiweMessage(address, nonce),
    };
  });

  // ─── Verify SIWE signature and create session ───
  app.post('/auth/siwe/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { address, signature, nonce } = request.body as {
      address: string;
      signature: string;
      nonce: string;
    };

    if (!address || !signature || !nonce) {
      return reply.status(400).send({ error: { code: 'MISSING_FIELDS', message: 'address, signature, nonce required' } });
    }

    const addrLower = address.toLowerCase();

    // Verify nonce
    const stored = nonceStore.get(addrLower);
    if (!stored || stored.nonce !== nonce) {
      return reply.status(401).send({ error: { code: 'INVALID_NONCE', message: 'Nonce expired or invalid' } });
    }
    if (stored.expiresAt < Date.now()) {
      nonceStore.delete(addrLower);
      return reply.status(401).send({ error: { code: 'NONCE_EXPIRED', message: 'Nonce expired — request a new one' } });
    }

    // Verify signature
    const message = buildSiweMessage(address, nonce);
    let valid = false;
    try {
      valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' } });
    }

    if (!valid) {
      return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Signature does not match address' } });
    }

    // Consume nonce
    nonceStore.delete(addrLower);

    // Find or create account for this wallet
    let account = await prisma.account.findFirst({
      where: { walletAddress: addrLower },
    });

    if (!account) {
      // Auto-create account with FREE plan
      const apiKey = `fab_sk_${randomBytes(24).toString('hex')}`;
      account = await prisma.account.create({
        data: {
          walletAddress: addrLower,
          apiKey: apiKey,
          apiKeyPrefix: apiKey.slice(0, 8),
          apiKeyHash: createHash('sha256').update(apiKey).digest('hex'),
          plan: 'FREE',
        },
      });

      // Return the newly generated API key (only shown once)
      return reply.status(201).send({
        authenticated: true,
        apiKey,
        account: {
          id: account.id,
          plan: account.plan,
          address: addrLower,
          isNew: true,
        },
      });
    }

    // Existing account — generate session API key
    const sessionKey = `fab_sess_${randomBytes(24).toString('hex')}`;

    // Store session (in production, use a sessions table or JWT)
    await prisma.session.create({
      data: {
        accountId: account.id,
        token: createHash('sha256').update(sessionKey).digest('hex'),
        walletAddress: addrLower,
        expiresAt: new Date(Date.now() + SESSION_TTL),
      },
    });

    return {
      authenticated: true,
      apiKey: sessionKey,
      account: {
        id: account.id,
        plan: account.plan,
        address: addrLower,
        isNew: false,
      },
    };
  });

  // ─── Logout ───
  app.post('/auth/siwe/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const hash = createHash('sha256').update(apiKey).digest('hex');
      await prisma.session.deleteMany({ where: { token: hash } }).catch(() => {});
    }
    return { success: true };
  });
}

// ─── Helpers ───

function buildSiweMessage(address: string, nonce: string): string {
  const domain = process.env.DASHBOARD_DOMAIN || 'localhost:3000';
  const uri = `https://${domain}`;
  const issuedAt = new Date().toISOString();

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to Fabric Gateway dashboard.',
    '',
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: 8453`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
