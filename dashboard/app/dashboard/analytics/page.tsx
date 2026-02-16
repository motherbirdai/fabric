'use client';

import { BarChart3, TrendingUp, Clock, DollarSign, Activity, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery, usePolling } from '@/lib/hooks';

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-fabric-gray-400">{icon}</div>
        <span className="text-[11px] text-fabric-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${color || ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-fabric-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-fabric-gray-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const sub = useQuery(() => api.getSubscription());
  const overage = useQuery(() => api.getOverage());
  const upcoming = useQuery(() => api.getUpcomingInvoice());
  const health = usePolling(() => api.health(), 30000);
  const wallets = useQuery(() => api.getWallets());
  const favorites = useQuery(() => api.getFavorites());

  const plan = sub.data;
  const usagePct = plan ? Math.min(100, (plan.usedToday / plan.dailyLimit) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-[13px] text-fabric-gray-500 mt-1">Usage, costs, and performance metrics</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Requests Today"
          value={plan ? plan.usedToday.toLocaleString() : '—'}
          sub={plan ? `of ${plan.dailyLimit.toLocaleString()} daily limit` : undefined}
          icon={<Activity className="w-4 h-4" />}
          color={usagePct > 80 ? 'text-red-500' : 'text-fabric-gray-900'}
        />
        <StatCard
          label="Overage This Period"
          value={overage.data ? overage.data.periodCount.toLocaleString() : '0'}
          sub={overage.data ? `$${overage.data.periodCost.toFixed(3)} cost` : undefined}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Est. Next Invoice"
          value={upcoming.data ? `$${upcoming.data.estimatedTotal.toFixed(2)}` : '—'}
          sub={upcoming.data ? `${upcoming.data.daysRemaining} days left` : undefined}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Gateway Uptime"
          value={health.data ? `${Math.floor(health.data.uptime / 3600)}h ${Math.floor((health.data.uptime % 3600) / 60)}m` : '—'}
          sub={health.data ? `${health.data.memoryMb.toFixed(0)}MB memory` : undefined}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Usage bar */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4">Daily Usage</h2>
          {plan ? (
            <div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-fabric-gray-500">{plan.usedToday.toLocaleString()} used</span>
                <span className="font-medium">{plan.dailyLimit.toLocaleString()} limit</span>
              </div>
              <div className="w-full bg-fabric-gray-100 rounded-full h-5 mb-3">
                <div
                  className="h-5 rounded-full transition-all flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(usagePct, 3)}%`,
                    backgroundColor: usagePct > 80 ? '#ef4444' : usagePct > 60 ? '#eab308' : '#068cff',
                  }}
                >
                  {usagePct > 10 && (
                    <span className="text-[10px] text-white font-medium">{usagePct.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 text-center text-[11px]">
                <div>
                  <div className="font-medium">{plan.plan}</div>
                  <div className="text-fabric-gray-500">plan</div>
                </div>
                <div>
                  <div className="font-medium">{plan.routingFeePct}%</div>
                  <div className="text-fabric-gray-500">routing fee</div>
                </div>
                <div>
                  <div className="font-medium">{plan.maxWallets}</div>
                  <div className="text-fabric-gray-500">max wallets</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">Loading...</div>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4">Cost Projection</h2>
          {upcoming.data ? (
            <div className="space-y-3">
              {[
                { label: 'Subscription', value: upcoming.data.subscriptionCost, color: '#068cff' },
                { label: 'Overage', value: upcoming.data.estimatedOverage, color: '#eab308' },
                { label: 'Routing fees', value: upcoming.data.routingFees, color: '#fe83e0' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-fabric-gray-500">{item.label}</span>
                    <span className="font-medium">${item.value.toFixed(3)}</span>
                  </div>
                  <MiniBar value={item.value} max={upcoming.data!.estimatedTotal || 1} color={item.color} />
                </div>
              ))}
              <div className="border-t border-fabric-gray-200 pt-3 flex justify-between text-sm font-semibold">
                <span>Estimated total</span>
                <span>${upcoming.data.estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">No billing data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Wallet balances */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Wallet Balances
          </h2>
          {wallets.data?.wallets.length ? (
            <div className="space-y-3">
              {wallets.data.wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-fabric-gray-100 last:border-0">
                  <div>
                    <div className="text-[13px] font-medium">{w.label}</div>
                    <code className="text-[10px] text-fabric-gray-500">{w.address.slice(0, 8)}...{w.address.slice(-6)}</code>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">${w.balanceUsdc.toFixed(2)}</div>
                    <div className="text-[10px] text-fabric-gray-500">USDC</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">No wallets</div>
          )}
        </div>

        {/* Favorites */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Favorite Providers
          </h2>
          {favorites.data?.favorites.length ? (
            <div className="space-y-3">
              {favorites.data.favorites.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-fabric-gray-100 last:border-0">
                  <div>
                    <div className="text-[13px] font-medium">{f.providerName}</div>
                    <div className="text-[11px] text-fabric-gray-500">{f.category}</div>
                  </div>
                  <div className="text-[11px] text-fabric-gray-400">
                    {new Date(f.addedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">No favorites yet — star providers to see them here</div>
          )}
        </div>
      </div>
    </div>
  );
}
