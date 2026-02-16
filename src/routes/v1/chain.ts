import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getBlockNumber, getGasPrice, chain } from '../../services/chain/client.js';
import {
  USDC_ADDRESS,
  FABRIC_IDENTITY_ADDRESS,
  FABRIC_REGISTRY_ADDRESS,
  FABRIC_FEE_WALLET,
  USE_TESTNET,
} from '../../config.js';
import { getQueueDepth } from '../../services/identity/reputation.js';

export async function chainRoutes(app: FastifyInstance) {
  app.get('/chain/status', async (request: FastifyRequest, reply: FastifyReply) => {
    let blockNumber: string | null = null;
    let gasPrice: string | null = null;

    try {
      const [block, gas] = await Promise.all([getBlockNumber(), getGasPrice()]);
      blockNumber = block.toString();
      gasPrice = `${(Number(gas) / 1e9).toFixed(4)} gwei`;
    } catch {}

    const reputationQueue = await getQueueDepth();

    return {
      chain: {
        name: chain.name,
        id: chain.id,
        testnet: USE_TESTNET,
        blockNumber,
        gasPrice,
      },
      contracts: {
        usdc: USDC_ADDRESS,
        fabricIdentity:
          FABRIC_IDENTITY_ADDRESS === '0x0000000000000000000000000000000000000000'
            ? null
            : FABRIC_IDENTITY_ADDRESS,
        fabricRegistry:
          FABRIC_REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000'
            ? null
            : FABRIC_REGISTRY_ADDRESS,
        feeWallet:
          FABRIC_FEE_WALLET === '0x0000000000000000000000000000000000000000'
            ? null
            : FABRIC_FEE_WALLET,
      },
      reputation: {
        queueDepth: reputationQueue,
        batchThreshold: 100,
      },
    };
  });
}
