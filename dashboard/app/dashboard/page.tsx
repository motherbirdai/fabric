'use client';

import Link from 'next/link';
import { Shield, DollarSign, Layers, Clock } from 'lucide-react';
import { useTitle, useSubscription, useWallets, useHealth, useBudgets, useProviders } from '@/lib/hooks';
import { StatGridSkeleton, CardSkeleton } from '@/components/ui/loading';

function formatUptime(seconds?: number): string {
  if (!seconds) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function OverviewPage() {
  useTitle('Overview');
  const { data: sub, loading: subLoading } = useSubscription();
  const { data: wallets, loading: walletsLoading } = useWallets();
  const { data: healthData, loading: healthLoading } = useHealth();
  const { data: budgets, loading: budgetsLoading } = useBudgets();
  const { data: providers, loading: providersLoading } = useProviders();

  const loading = subLoading || walletsLoading || healthLoading || budgetsLoading || providersLoading;

  const plan = sub?.plan || '—';
  const walletCount = wallets?.wallets?.length ?? 0;
  const maxWallets = wallets?.maxWallets ?? 0;

  // Health checks
  const checks = healthData?.checks || {};
  const allHealthy = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'healthy');

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Overview</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Your Fabric gateway at a glance
          </p>
        </div>
      </div>

      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        {loading ? (
          <>
            <StatGridSkeleton />
            <div style={{ marginTop: '20px' }}><CardSkeleton /></div>
            <div style={{ marginTop: '20px' }}><CardSkeleton rows={2} /></div>
          </>
        ) : (
          <>
            {/* Metric grid */}
            <div className="metric-grid" style={{ marginBottom: '28px' }}>
              <div className="metric-card">
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)' }}>
                    Plan
                  </span>
                  <Shield size={14} style={{ opacity: 0.35 }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, color: 'var(--blue)' }}>
                  {plan}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                  ${sub?.priceUsd ?? 0}/mo
                </div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)' }}>
                    Wallets
                  </span>
                  <DollarSign size={14} style={{ opacity: 0.35 }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>
                  {walletCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                  {maxWallets} max on plan
                </div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)' }}>
                    Providers
                  </span>
                  <Layers size={14} style={{ opacity: 0.35 }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>
                  {providers?.length ?? 0}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                  registered services
                </div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)' }}>
                    Uptime
                  </span>
                  <Clock size={14} style={{ opacity: 0.35 }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, color: 'var(--green)' }}>
                  {formatUptime(healthData?.uptime)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                  {healthData?.version ? `v${healthData.version}` : 'gateway'}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="card">
              <div className="card-header">
                <span>System Health</span>
                <span className={`status-pill ${allHealthy ? 'online' : ''}`} style={{ fontSize: '11px', padding: '3px 10px' }}>
                  {allHealthy ? 'All systems operational' : 'Issues detected'}
                </span>
              </div>
              <div className="card-body-flush">
                {Object.keys(checks).length > 0 ? (
                  Object.entries(checks).map(([name, check]) => {
                    const ok = check.status === 'ok' || check.status === 'healthy';
                    return (
                      <div key={name} className="health-row">
                        <div className="flex items-center gap-[10px] text-[14px]">
                          <div className="w-[7px] h-[7px] rounded-full" style={{ background: ok ? 'var(--green)' : 'var(--red)' }} />
                          {name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
                          {check.latencyMs != null ? `${check.latencyMs}ms` : check.status}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="health-row">
                    <div className="flex items-center gap-[10px] text-[14px]">
                      <div className="w-[7px] h-[7px] rounded-full" style={{ background: healthData?.status === 'ok' ? 'var(--green)' : 'var(--amber)' }} />
                      gateway
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
                      {healthData?.status || 'unknown'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Budgets */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <span>Active Budgets</span>
                {budgets && budgets.length > 0 && (
                  <Link href="/dashboard/budgets" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blue)', textDecoration: 'none' }}>View all</Link>
                )}
              </div>
              <div className="card-body">
                {budgets && budgets.length > 0 ? (
                  budgets.slice(0, 3).map((b) => {
                    const pct = b.limitUsd > 0 ? (b.spentUsd / b.limitUsd) * 100 : 0;
                    return (
                      <div key={b.id} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span>{b.agentId || 'All Agents'} — {b.period}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
                            ${b.spentUsd.toFixed(2)} / ${b.limitUsd.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 80 ? 'var(--red)' : 'var(--blue)', borderRadius: '2px' }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No budgets configured</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <span>Quick Actions</span>
              </div>
              <div className="card-body">
                <Link href="/dashboard/providers" className="quick-action">Browse Providers</Link>
                <Link href="/dashboard/register" className="quick-action">+ Register Provider</Link>
                <Link href="/dashboard/wallets" className="quick-action">View Wallets</Link>
                <Link href="/dashboard/analytics" className="quick-action">View Analytics</Link>
                <Link href="/dashboard/api-keys" className="quick-action">API Keys</Link>
                <Link href="/dashboard/billing" className="quick-action">Manage Billing</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
