'use client';

import { useProviders, useSubscription } from '@/lib/hooks';
import { StatGridSkeleton } from '@/components/ui/loading';

export default function AnalyticsPage() {
  const { data: providers, loading: provLoading } = useProviders();
  const { data: sub, loading: subLoading } = useSubscription();

  const loading = provLoading || subLoading;
  const providerCount = providers?.length ?? 0;
  const requestsToday = sub?.requests_today ?? 0;

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
              { label: 'Requests (24h)', value: String(requestsToday), color: 'var(--blue)', sub: 'from subscription' },
              { label: 'Providers', value: String(providerCount), sub: 'in registry' },
              { label: 'Plan', value: sub?.plan || '—', color: 'var(--green)', sub: `${sub?.requests_limit || '—'} daily limit` },
              { label: 'Total Spend (24h)', value: '—', sub: 'no aggregation endpoint' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts — partially placeholder (no time-series aggregation endpoint) */}
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3>Requests (7d)</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Daily volume</span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <svg viewBox="0 0 420 160" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1="40" y1="10" x2="410" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="47" x2="410" y2="47" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="84" x2="410" y2="84" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="120" x2="410" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x="32" y="124" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">0</text>
                <text x="210" y="80" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="11">No time-series data available</text>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => <text key={d} x={40+i*52.86} y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">{d}</text>)}
                <text x="410" y="140" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">Today</text>
              </svg>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Success Rate (7d)</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>—</span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <svg viewBox="0 0 420 160" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1="40" y1="10" x2="410" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="47" x2="410" y2="47" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="84" x2="410" y2="84" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="120" x2="410" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x="32" y="14" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">100%</text>
                <text x="32" y="124" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">90%</text>
                <text x="210" y="80" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="11">No time-series data available</text>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => <text key={d} x={40+i*52.86} y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">{d}</text>)}
                <text x="410" y="140" textAnchor="middle" fill="var(--green)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">Today</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Provider Breakdown — real data */}
        {providers && providers.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h3>Registered Providers</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>{providerCount} total</span>
            </div>
            <div className="card-body-flush">
              {providers.slice(0, 10).map((p) => (
                <div key={p.id} className="setting-row">
                  <div>
                    <div style={{ fontSize: '14px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{p.category || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.trust_score != null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)' }}>
                        {p.trust_score.toFixed(2)}
                      </span>
                    )}
                    {p.status === 'active' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--green-subtle)', color: 'var(--green)' }}>
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
