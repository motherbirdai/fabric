import { PrismaClient, Plan } from '@prisma/client';
import { nanoid } from 'nanoid';
import { API_KEY_PREFIX } from '../config.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create test account ───
  const apiKey = `${API_KEY_PREFIX}_${nanoid(24)}`;
  const account = await prisma.account.upsert({
    where: { email: 'dev@fabriclayer.dev' },
    update: {},
    create: {
      email: 'dev@fabriclayer.dev',
      plan: Plan.PRO,
      apiKey,
      apiKeyPrefix: apiKey.slice(0, 8),
      dailyLimit: 15_000,
      routingFeePct: 0.4,
    },
  });
  console.log(`  Account: ${account.email} (${account.plan})`);
  console.log(`  API Key: ${apiKey}`);

  // ─── Create test agent ───
  const agent = await prisma.agent.upsert({
    where: { id: 'agent_seed_001' },
    update: {},
    create: {
      id: 'agent_seed_001',
      accountId: account.id,
      name: 'Test Agent',
    },
  });
  console.log(`  Agent: ${agent.name} (${agent.id})`);

  // ─── Create mock providers ───
  const providers = [
    // ─── Real Motherbird-operated wrappers ───
    {
      registryId: 'fab_brave_search',
      name: 'Brave Web Search',
      category: 'web-search',
      endpoint: 'https://api.search.brave.com/res/v1/web/search',
      pricingModel: 'per-request',
      basePrice: 0.002,
      walletAddress: '0x0000000000000000000000000000000000000000',
      trustScore: 4.9,
      totalRequests: 0,
      successRate: 1.0,
      avgLatencyMs: 350,
      uptimePercent: 99.9,
    },
    {
      registryId: 'fab_tavily_search',
      name: 'Tavily AI Search',
      category: 'web-search',
      endpoint: 'https://api.tavily.com/search',
      pricingModel: 'per-request',
      basePrice: 0.003,
      walletAddress: '0x0000000000000000000000000000000000000000',
      trustScore: 4.8,
      totalRequests: 0,
      successRate: 1.0,
      avgLatencyMs: 400,
      uptimePercent: 99.8,
    },
    {
      registryId: 'fab_coingecko',
      name: 'CoinGecko Prices',
      category: 'market-data',
      endpoint: 'https://api.coingecko.com/api/v3',
      pricingModel: 'per-request',
      basePrice: 0.001,
      walletAddress: '0x0000000000000000000000000000000000000000',
      trustScore: 4.7,
      totalRequests: 0,
      successRate: 1.0,
      avgLatencyMs: 200,
      uptimePercent: 99.8,
    },
    {
      registryId: 'fab_firecrawl',
      name: 'Firecrawl Scraper',
      category: 'web-scraping',
      endpoint: 'https://api.firecrawl.dev/v1/scrape',
      pricingModel: 'per-request',
      basePrice: 0.005,
      walletAddress: '0x0000000000000000000000000000000000000000',
      trustScore: 4.6,
      totalRequests: 0,
      successRate: 1.0,
      avgLatencyMs: 1500,
      uptimePercent: 99.5,
    },
    {
      registryId: 'fab_sendgrid',
      name: 'SendGrid Email',
      category: 'email',
      endpoint: 'https://api.sendgrid.com/v3/mail/send',
      pricingModel: 'per-request',
      basePrice: 0.003,
      walletAddress: '0x0000000000000000000000000000000000000000',
      trustScore: 4.8,
      totalRequests: 0,
      successRate: 1.0,
      avgLatencyMs: 300,
      uptimePercent: 99.9,
    },
    // ─── Mock providers for testing ───
    {
      registryId: 'reg_flux_pro',
      name: 'Flux Pro',
      category: 'image-generation',
      endpoint: 'https://api.flux.example/v1/generate',
      pricingModel: 'per-request',
      basePrice: 0.02,
      walletAddress: '0x1111111111111111111111111111111111111111',
      trustScore: 4.9,
      totalRequests: 84201,
      successRate: 0.998,
      avgLatencyMs: 1200,
      uptimePercent: 99.8,
    },
    {
      registryId: 'reg_dalle_3',
      name: 'DALL·E 3',
      category: 'image-generation',
      endpoint: 'https://api.openai.example/v1/images',
      pricingModel: 'per-request',
      basePrice: 0.04,
      walletAddress: '0x2222222222222222222222222222222222222222',
      trustScore: 4.7,
      totalRequests: 120450,
      successRate: 0.995,
      avgLatencyMs: 2800,
      uptimePercent: 99.5,
    },
    {
      registryId: 'reg_codex_review',
      name: 'Codex Review',
      category: 'code-review',
      endpoint: 'https://api.codex.example/v1/review',
      pricingModel: 'per-token',
      basePrice: 0.003,
      walletAddress: '0x3333333333333333333333333333333333333333',
      trustScore: 4.5,
      totalRequests: 31200,
      successRate: 0.992,
      avgLatencyMs: 3200,
      uptimePercent: 99.2,
    },
    {
      registryId: 'reg_deepl_agent',
      name: 'DeepL Agent',
      category: 'translation',
      endpoint: 'https://api.deepl.example/v1/translate',
      pricingModel: 'per-token',
      basePrice: 0.001,
      walletAddress: '0x4444444444444444444444444444444444444444',
      trustScore: 4.8,
      totalRequests: 215600,
      successRate: 0.999,
      avgLatencyMs: 400,
      uptimePercent: 99.9,
    },
    {
      registryId: 'reg_whisper_pro',
      name: 'Whisper Pro',
      category: 'transcription',
      endpoint: 'https://api.whisper.example/v1/transcribe',
      pricingModel: 'per-minute',
      basePrice: 0.006,
      walletAddress: '0x5555555555555555555555555555555555555555',
      trustScore: 4.3,
      totalRequests: 8900,
      successRate: 0.988,
      avgLatencyMs: 5200,
      uptimePercent: 98.5,
    },
    {
      registryId: 'reg_sentiment_ai',
      name: 'Sentiment AI',
      category: 'data-analysis',
      endpoint: 'https://api.sentiment.example/v1/analyze',
      pricingModel: 'per-request',
      basePrice: 0.005,
      walletAddress: '0x6666666666666666666666666666666666666666',
      trustScore: 4.1,
      totalRequests: 5200,
      successRate: 0.975,
      avgLatencyMs: 800,
      uptimePercent: 97.8,
    },
  ];

  for (const p of providers) {
    await prisma.provider.upsert({
      where: { registryId: p.registryId },
      update: { ...p },
      create: { ...p },
    });
  }
  console.log(`  Providers: ${providers.length} seeded`);

  console.log('\n✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
