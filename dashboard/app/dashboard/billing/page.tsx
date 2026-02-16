'use client';

import { useState } from 'react';
import { CreditCard, ArrowUpRight, FileText, AlertTriangle, Check, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery, useMutation } from '@/lib/hooks';

const PLANS = [
  { id: 'FREE', name: 'Free', price: 0, daily: 50, fee: 0, wallets: 0 },
  { id: 'BUILDER', name: 'Builder', price: 9, daily: 5000, fee: 0.5, wallets: 3 },
  { id: 'PRO', name: 'Pro', price: 39, daily: 15000, fee: 0.4, wallets: 10 },
  { id: 'TEAM', name: 'Team', price: 149, daily: 50000, fee: 0.3, wallets: 50 },
] as const;

export default function BillingPage() {
  const sub = useQuery(() => api.getSubscription());
  const invoices = useQuery(() => api.getInvoices());
  const upcoming = useQuery(() => api.getUpcomingInvoice());
  const overage = useQuery(() => api.getOverage());
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const checkout = useMutation(async (plan: string) => {
    const { url } = await api.createCheckout({
      plan,
      successUrl: `${window.location.origin}/dashboard/billing?success=1`,
      cancelUrl: `${window.location.origin}/dashboard/billing`,
    });
    window.location.href = url;
  });

  const portal = useMutation(async () => {
    const { url } = await api.createPortal({
      returnUrl: `${window.location.origin}/dashboard/billing`,
    });
    window.location.href = url;
  });

  const cancel = useMutation(async () => {
    await api.cancelSubscription();
    sub.refetch();
  });

  const reactivate = useMutation(async () => {
    await api.reactivateSubscription();
    sub.refetch();
  });

  const currentPlan = sub.data?.plan || 'FREE';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Billing</h1>
        <p className="text-[13px] text-fabric-gray-500 mt-1">Manage your subscription and view usage</p>
      </div>

      {/* Current plan */}
      <div className="metric-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Current Plan
          </h2>
          {sub.data?.status === 'ACTIVE' && (
            <button
              onClick={() => portal.execute(undefined as any)}
              className="text-[12px] text-fabric-blue hover:underline flex items-center gap-1"
            >
              Manage in Stripe <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {sub.data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[11px] text-fabric-gray-500 uppercase tracking-wider mb-1">Plan</div>
              <div className="text-lg font-semibold text-fabric-blue">{sub.data.plan}</div>
            </div>
            <div>
              <div className="text-[11px] text-fabric-gray-500 uppercase tracking-wider mb-1">Status</div>
              <div className="text-sm font-medium">
                {sub.data.cancelAtPeriodEnd ? (
                  <span className="text-orange-600">Cancelling</span>
                ) : (
                  <span className="text-green-600">{sub.data.status}</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-fabric-gray-500 uppercase tracking-wider mb-1">Daily Usage</div>
              <div className="text-sm">{sub.data.usedToday.toLocaleString()} / {sub.data.dailyLimit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-fabric-gray-500 uppercase tracking-wider mb-1">Routing Fee</div>
              <div className="text-sm">{sub.data.routingFeePct}%</div>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-fabric-gray-400">Loading...</div>
        )}

        {sub.data?.cancelAtPeriodEnd && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-[12px] text-orange-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Your plan will be downgraded at the end of this billing period.
            <button
              onClick={() => reactivate.execute(undefined as any)}
              className="ml-auto text-fabric-blue hover:underline"
            >
              Reactivate
            </button>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className={`metric-card ${isCurrent ? 'ring-2 ring-fabric-blue' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{plan.name}</span>
                {isCurrent && <Check className="w-4 h-4 text-fabric-blue" />}
              </div>
              <div className="text-2xl font-semibold mb-1">
                ${plan.price}<span className="text-[13px] font-normal text-fabric-gray-500">/mo</span>
              </div>
              <div className="text-[11px] text-fabric-gray-500 mb-3 space-y-1">
                <div>{plan.daily.toLocaleString()} requests/day</div>
                <div>{plan.fee}% routing fee</div>
                <div>{plan.wallets} wallets</div>
              </div>
              {!isCurrent && (
                <button
                  onClick={() => {
                    setUpgrading(plan.id);
                    checkout.execute(plan.id);
                  }}
                  disabled={checkout.loading}
                  className="w-full py-2 text-[12px] font-medium rounded-lg bg-fabric-gray-900 text-white hover:bg-fabric-gray-800 disabled:opacity-40 transition-colors"
                >
                  {upgrading === plan.id && checkout.loading ? 'Redirecting...' : plan.price > (PLANS.find(p => p.id === currentPlan)?.price || 0) ? 'Upgrade' : 'Switch'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming estimate */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Upcoming Invoice
          </h2>
          {upcoming.data ? (
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-fabric-gray-500">Subscription</span><span>${upcoming.data.subscriptionCost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-fabric-gray-500">Est. overage</span><span>${upcoming.data.estimatedOverage.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-fabric-gray-500">Routing fees</span><span>${upcoming.data.routingFees.toFixed(3)}</span></div>
              <div className="border-t border-fabric-gray-200 pt-2 flex justify-between font-semibold">
                <span>Estimated total</span>
                <span>${upcoming.data.estimatedTotal.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-fabric-gray-400">{upcoming.data.daysRemaining} days remaining</div>
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">No upcoming invoice</div>
          )}
        </div>

        {/* Overage */}
        <div className="metric-card">
          <h2 className="text-sm font-semibold mb-4">Overage This Period</h2>
          {overage.data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">{overage.data.periodCount.toLocaleString()}</div>
                  <div className="text-[11px] text-fabric-gray-500">overage requests</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold">${overage.data.periodCost.toFixed(3)}</div>
                  <div className="text-[11px] text-fabric-gray-500">overage cost</div>
                </div>
              </div>
              <div className="text-[11px] text-fabric-gray-500 text-center">
                {overage.data.dailyRate.toFixed(0)} avg/day · projected ${overage.data.projectedPeriodCost.toFixed(2)} this period
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-fabric-gray-400">No overage data</div>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="metric-card mt-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Invoice History
        </h2>
        {invoices.data?.invoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-fabric-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Overage</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoices.data.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-fabric-gray-100">
                    <td className="py-3">{new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</td>
                    <td className="py-3">${inv.amount.toFixed(2)}</td>
                    <td className="py-3">{inv.overageCount.toLocaleString()} req</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${inv.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-fabric-gray-100 text-fabric-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-fabric-gray-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[13px] text-fabric-gray-400">No invoices yet</div>
        )}
      </div>

      {/* Cancel */}
      {sub.data?.status === 'ACTIVE' && currentPlan !== 'FREE' && !sub.data.cancelAtPeriodEnd && (
        <div className="mt-6 text-center">
          <button
            onClick={() => { if (confirm('Cancel your subscription? You\'ll keep access until the end of the billing period.')) cancel.execute(undefined as any); }}
            className="text-[12px] text-fabric-gray-400 hover:text-red-500 transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}
    </div>
  );
}
