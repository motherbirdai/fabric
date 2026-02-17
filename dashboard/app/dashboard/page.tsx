'use client';

import { Activity, Zap, DollarSign, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery, usePolling } from '@/lib/hooks';

function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-fabric-gray-500 uppercase tracking-wider">{label}</span>
        <div className="text-fabric-gray-400">{icon}</div>
      </div>
      <div className={`text-2xl font-semibold ${color || 'text-fabric-gray-900'}`}>{value}</div>
      {sub && <div className="text-[11px] text-fabric-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const health = usePolling(() => api.health(), 15000);
  const sub = useQuery(() => api.getSubscription());
  const budgets = useQuery(() => api.getBudgets());
  const wallets = useQuery(() => api.getWallets());
  const overage = useQuery(() => api.getOverage());

  const isHealthy = health.data?.status === 'ok';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-fabric-gray-900">Overview</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">Your Fabric gateway at a glance</p>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          {isHealthy ? (
            <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Connected</span></>
          ) : health.loading ? (
            <span className="text-fabric-gray-400">Connecting...</span>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-red-500" /><span className="text-red-600">Disconnected</span></>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Plan"
          value={sub.data?.plan || '—'}
          sub={sub.data?.usedToday != null ? `${sub.data.usedToday.toLocaleString()} / ${sub.data.dailyLimit.toLocaleString()} today` : undefined}
          icon={<Shield className="w-4 h-4" />}
          color="text-fabric-blue"
        />
        <MetricCard
          label="Wallets"
          value={wallets.data ? String(wallets.data.wallets.length) : '—'}
          sub={sub.data ? `${sub.data.maxWallets} max on plan` : undefined}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricCard
          label="Overage Today"
          value={overage.data ? String(overage.data.todayCount) : '0'}
          sub={overage.data?.periodCost != null ? `$${overage.data.periodCost.toFixed(3)} this period` : undefined}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          label="Uptime"
          value={health.data?.uptime != null ? `${Math.floor(health.data.uptime / 3600)}h` : '—'}
          sub={health.data?.memoryMb != null ? `${health.data.memoryMb.toFixed(0)}MB memory` : undefined}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Health checks */}
        <div className="xl:col-span-2 metric-card">
          <h2 className="text-sm font-semibold mb-4">System Health</h2>
          {health.data?.checks ? (
            <div className="space-y-3">
              {Object.entries(health.data.checks).map(([name, check]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-fabric-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${check.status === 'ok' || check.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{name}</span>
                  </div>
                  <span className="text-[12px] text-fabric-gray-500">
                    {check.latencyMs != null ? `${check.latencyMs}ms` : check.status}
                  </span>
                </div>
              ))}
            </div>
          ) : health.loading ? (
            <div className="text-[13px] text-fabric-gray-400">Loading...</div>
          ) : (
            <div className="text-[13px] text-red-500">Unable to connect to gateway</div>
          )}
        </div>

        {/* Budgets summary */}
        <div className="space-y-4">
          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-3">Active Budgets</h2>
            {budgets.data?.budgets.length ? (
              <div className="space-y-3">
                {budgets.data.budgets.slice(0, 4).map((b) => {
                  const pct = b.limitUsd ? Math.min(100, ((b.spentUsd ?? 0) / b.limitUsd) * 100) : 0;
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span>{b.label || b.periodType}</span>
                        <span className="text-fabric-gray-500">${(b.spentUsd ?? 0).toFixed(2)} / ${(b.limitUsd ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-fabric-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct > 80 ? '#ef4444' : pct > 60 ? '#eab308' : '#068cff',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[13px] text-fabric-gray-400">No budgets configured</div>
            )}
          </div>

          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <a href="/dashboard/providers" className="block w-full text-left text-[12px] px-3 py-2 rounded-lg bg-fabric-gray-50 hover:bg-fabric-gray-100 transition-colors">
                Browse Providers
              </a>
              <a href="/dashboard/providers/register" className="block w-full text-left text-[12px] px-3 py-2 rounded-lg bg-fabric-gray-50 hover:bg-fabric-gray-100 transition-colors">
                + Register Provider
              </a>
              <a href="/dashboard/billing" className="block w-full text-left text-[12px] px-3 py-2 rounded-lg bg-fabric-gray-50 hover:bg-fabric-gray-100 transition-colors">
                Manage Billing
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
