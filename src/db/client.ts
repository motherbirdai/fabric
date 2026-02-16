import { PrismaClient } from '@prisma/client';
import { IS_PROD } from '../config.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: IS_PROD ? ['error'] : ['query', 'error', 'warn'],
  });

if (!IS_PROD) globalForPrisma.prisma = prisma;
