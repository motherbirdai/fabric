#!/usr/bin/env node

/**
 * Fabric Gateway Load Test
 *
 * Simulates concurrent agent requests against the gateway.
 * Usage:
 *   node scripts/load-test.mjs --url http://localhost:3100 --key fab_xxx --rps 100 --duration 60
 */

const DEFAULT_URL = 'http://localhost:3100';
const DEFAULT_RPS = 50;
const DEFAULT_DURATION = 30; // seconds

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    opts[args[i].replace('--', '')] = args[i + 1];
  }
  return {
    url: opts.url || DEFAULT_URL,
    key: opts.key || 'fab_seed_builder_key_001',
    rps: parseInt(opts.rps || DEFAULT_RPS, 10),
    duration: parseInt(opts.duration || DEFAULT_DURATION, 10),
  };
}

const CATEGORIES = ['image-generation', 'translation', 'code-review', 'transcription', 'data-analysis'];

async function makeRequest(baseUrl, apiKey, endpoint, method = 'GET', body = null) {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const latency = performance.now() - start;
    return { status: res.status, latency, success: res.ok };
  } catch (err) {
    return { status: 0, latency: performance.now() - start, success: false, error: err.message };
  }
}

async function runLoadTest() {
  const { url, key, rps, duration } = parseArgs();

  console.log(`\n🧵 Fabric Gateway Load Test`);
  console.log(`   URL:      ${url}`);
  console.log(`   RPS:      ${rps}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Total:    ~${rps * duration} requests\n`);

  const results = { total: 0, success: 0, errors: 0, latencies: [], statusCodes: {} };
  const intervalMs = 1000 / rps;
  const endTime = Date.now() + duration * 1000;

  // Warm up
  console.log('Warming up...');
  await makeRequest(url, key, '/health');
  await makeRequest(url, key, `/v1/discover?category=translation`);
  console.log('Starting load test...\n');

  const scenarios = [
    { weight: 0.4, fn: () => makeRequest(url, key, `/v1/discover?category=${CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]}`) },
    { weight: 0.25, fn: () => makeRequest(url, key, `/v1/route`, 'POST', { agentId: 'agent_seed_001', category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)], input: { prompt: 'load test' } }) },
    { weight: 0.2, fn: () => makeRequest(url, key, `/v1/evaluate/prov_flux_001`) },
    { weight: 0.1, fn: () => makeRequest(url, key, '/health') },
    { weight: 0.05, fn: () => makeRequest(url, key, '/v1/budget') },
  ];

  function pickScenario() {
    let r = Math.random();
    for (const s of scenarios) {
      r -= s.weight;
      if (r <= 0) return s.fn;
    }
    return scenarios[0].fn;
  }

  // Run
  let tick = 0;
  const promises = [];

  while (Date.now() < endTime) {
    const fn = pickScenario();
    promises.push(
      fn().then(result => {
        results.total++;
        if (result.success) results.success++;
        else results.errors++;
        results.latencies.push(result.latency);
        results.statusCodes[result.status] = (results.statusCodes[result.status] || 0) + 1;
      })
    );

    tick++;
    if (tick % rps === 0) {
      const elapsed = Math.floor((Date.now() - (endTime - duration * 1000)) / 1000);
      const errRate = results.total > 0 ? ((results.errors / results.total) * 100).toFixed(1) : '0';
      process.stdout.write(`\r  [${elapsed}s] ${results.total} requests | ${results.success} ok | ${results.errors} err (${errRate}%)`);
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  // Wait for stragglers
  await Promise.allSettled(promises);

  // ─── Results ───
  const sorted = results.latencies.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  console.log(`\n\n─── Results ───`);
  console.log(`Total requests:  ${results.total}`);
  console.log(`Success:         ${results.success} (${((results.success / results.total) * 100).toFixed(1)}%)`);
  console.log(`Errors:          ${results.errors} (${((results.errors / results.total) * 100).toFixed(1)}%)`);
  console.log(`Throughput:      ${(results.total / duration).toFixed(1)} req/s`);
  console.log(`\nLatency:`);
  console.log(`  avg:  ${avg.toFixed(1)}ms`);
  console.log(`  p50:  ${p50.toFixed(1)}ms`);
  console.log(`  p95:  ${p95.toFixed(1)}ms`);
  console.log(`  p99:  ${p99.toFixed(1)}ms`);
  console.log(`  min:  ${sorted[0]?.toFixed(1) || 0}ms`);
  console.log(`  max:  ${sorted[sorted.length - 1]?.toFixed(1) || 0}ms`);
  console.log(`\nStatus codes:`, results.statusCodes);

  // ─── Pass/fail ───
  const errorRate = results.errors / results.total;
  const pass = errorRate < 0.05 && p99 < 2000;
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'} — error rate: ${(errorRate * 100).toFixed(1)}%, p99: ${p99.toFixed(0)}ms`);
  process.exit(pass ? 0 : 1);
}

runLoadTest().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
