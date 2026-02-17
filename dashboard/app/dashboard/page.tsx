'use client';

import { Zap, DollarSign, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
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

function safe(val: any, decimals: number = 2): string {
  if (val == null || typeof val !== 'number' || isNaN(val)) return '—';
  return val.toFixed(decimals);
}

export default function DashboardPage() {
  const health = usePolling(() => api.health(), 15000);
  const sub = useQuery(() => api.getSubscription());
  const budgets = useQuery(() => api.getBudgets());
  const wallets = useQuery(() => api.getWallets());
  const overage = useQuery(() => api.getOverage());

  const isHealthy = health.data?.status === 'ok';

  // Safely extract nested data — API response shapes may vary
  const subData = sub.data as any;
  const overageData = (overage.data as any)?.overage ?? overage.data;
  const budgetList = budgets.data?.budgets ?? [];
  const walletList = wallets.data?.wallets ?? [];

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
          value={subData?.plan || '—'}
          sub={subData?.usedToday != null ? `${subData.usedToday.toLocaleString()} / ${(subData.dailyLimit ?? 0).toLocaleString()} today` : undefined}
          icon={<Shield className="w-4 h-4" />}
          color="text-fabric-blue"
        />
        <MetricCard
          label="Wallets"
          value={String(walletList.length)}
          sub={subData?.maxWallets != null ? `${subData.maxWallets} max on plan` : undefined}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricCard
          label="Overage Today"
          value={overageData?.todayCount != null ? String(overageData.todayCount) : '0'}
          sub={overageData?.periodCost != null ? `$${safe(overageData.periodCost, 3)} this period` : undefined}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          label="Uptime"
          value={health.data?.uptime != null ? `${Math.floor(health.data.uptime / 3600)}h` : '—'}
          sub={health.data?.memoryMb != null ? `${safe(health.data.memoryMb, 0)}MB memory` : undefined}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Health checks */}
        <div className="xl:col-span-2 metric-card">
          <h2 className="text-sm font-semibold mb-4">System Health</h2>
          {health.data?.checks ? (
            <div className="space-y-3">
              {Object.entries(health.data.checks).map(([name, check]: [string, any]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-fabric-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${check?.status === 'ok' || check?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{name}</span>
                  </div>
                  <span className="text-[12px] text-fabric-gray-500">
                    {check?.latencyMs != null ? `${check.latencyMs}ms` : check?.status ?? '—'}
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
            {budgetList.length ? (
              <div className="space-y-3">
                {budgetList.slice(0, 4).map((b: any) => {
                  const spent = b?.spentUsd ?? 0;
                  const limit = b?.limitUsd ?? 1;
                  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span>{b.label || b.periodType || 'Budget'}</span>
                        <span className="text-fabric-gray-500">${safe(spent)} / ${safe(limit)}</span>
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
