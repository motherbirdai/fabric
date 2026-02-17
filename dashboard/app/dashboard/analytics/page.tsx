'use client';

import { useState, useEffect } from 'react';
import { useProviders, useSubscription } from '@/lib/hooks';
import { evaluateProvider } from '@/lib/api';
import type { ProviderEvaluation } from '@/lib/api';
import { StatGridSkeleton } from '@/components/ui/loading';

export default function AnalyticsPage() {
  const { data: providers, loading: provLoading } = useProviders();
  const { data: sub, loading: subLoading } = useSubscription();

  const [evaluations, setEvaluations] = useState<ProviderEvaluation[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    if (!providers || providers.length === 0) return;
    setEvalLoading(true);
    Promise.allSettled(providers.map(p => evaluateProvider(p.id)))
      .then(results => {
        const evals = results
          .filter((r): r is PromiseFulfilledResult<ProviderEvaluation> => r.status === 'fulfilled')
          .map(r => r.value);
        setEvaluations(evals);
        setEvalLoading(false);
      });
  }, [providers]);

  const loading = provLoading || subLoading;
  const providerCount = providers?.length ?? 0;

  // Aggregated stats from evaluations
  const totalRequests = evaluations.reduce((sum, e) => sum + e.stats.totalRequests, 0);
  const last30dRequests = evaluations.reduce((sum, e) => sum + e.stats.last30dRequests, 0);
  const avgSuccessRate = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + e.stats.successRate, 0) / evaluations.length
    : 0;
  const avgLatency = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + e.stats.avgLatencyMs, 0) / evaluations.length
    : 0;

  // Top 8 providers by last 30d requests
  const topByRequests = [...evaluations]
    .sort((a, b) => b.stats.last30dRequests - a.stats.last30dRequests)
    .slice(0, 8);
  const maxRequests = topByRequests.length > 0 ? topByRequests[0].stats.last30dRequests : 1;

  // Top 8 providers by success rate
  const topBySuccess = [...evaluations]
    .sort((a, b) => b.stats.successRate - a.stats.successRate)
    .slice(0, 8);
  const maxSuccessRate = topBySuccess.length > 0 ? topBySuccess[0].stats.successRate : 1;

  return (
    <div>
      <div style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Usage metrics and performance data</p>
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        {loading ? (
          <StatGridSkeleton />
        ) : (
          <div className="stat-grid">
            {[
              { label: 'Plan', value: sub?.plan || '—', color: 'var(--blue)', sub: `$${sub?.priceUsd ?? 0}/mo` },
              { label: 'Total Requests', value: totalRequests.toLocaleString(), sub: `${last30dRequests.toLocaleString()} last 30d` },
              { label: 'Avg Success Rate', value: `${(avgSuccessRate * 100).toFixed(1)}%`, color: 'var(--green)', sub: 'across all providers' },
              { label: 'Avg Latency', value: `${avgLatency.toFixed(0)}ms`, sub: 'mean response time' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts — horizontal bar charts by provider */}
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3>Requests by Provider</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Last 30 days</span>
            </div>
            <div className="card-body-flush">
              {evalLoading ? (
                <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>Loading provider stats...</div>
              ) : topByRequests.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>No provider data available</div>
              ) : (
                topByRequests.map((e) => (
                  <div key={e.provider.id} className="setting-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <div style={{ fontSize: '13px', minWidth: '120px', flexShrink: 0 }}>{e.provider.name}</div>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg)' }}>
                        <div style={{ width: `${maxRequests > 0 ? (e.stats.last30dRequests / maxRequests) * 100 : 0}%`, height: '100%', borderRadius: '3px', background: 'var(--blue)', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', minWidth: '60px', textAlign: 'right' }}>{e.stats.last30dRequests.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Success Rate by Provider</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>All time</span>
            </div>
            <div className="card-body-flush">
              {evalLoading ? (
                <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>Loading provider stats...</div>
              ) : topBySuccess.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>No provider data available</div>
              ) : (
                topBySuccess.map((e) => (
                  <div key={e.provider.id} className="setting-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <div style={{ fontSize: '13px', minWidth: '120px', flexShrink: 0 }}>{e.provider.name}</div>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg)' }}>
                        <div style={{ width: `${maxSuccessRate > 0 ? (e.stats.successRate / maxSuccessRate) * 100 : 0}%`, height: '100%', borderRadius: '3px', background: 'var(--green)', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', minWidth: '60px', textAlign: 'right' }}>{(e.stats.successRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Provider Breakdown — real data with stats */}
        {providers && providers.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h3>Registered Providers</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>{providerCount} total</span>
            </div>
            <div className="card-body-flush">
              {providers.slice(0, 10).map((p) => {
                const evalData = evaluations.find(e => e.provider.id === p.id);
                return (
                  <div key={p.id} className="setting-row">
                    <div>
                      <div style={{ fontSize: '14px' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{p.category || 'Unknown'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {evalData && (
                        <>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                            {evalData.stats.totalRequests.toLocaleString()} reqs
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>
                            {(evalData.stats.successRate * 100).toFixed(1)}%
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                            {evalData.stats.avgLatencyMs}ms
                          </span>
                        </>
                      )}
                      {p.trustScore != null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)' }}>
                          {p.trustScore.toFixed(2)}
                        </span>
                      )}
                      {p.active && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--green-subtle)', color: 'var(--green)' }}>
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
