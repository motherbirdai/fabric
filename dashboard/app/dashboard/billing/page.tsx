'use client';

import { CreditCard, Check, Download } from 'lucide-react';
import { useSubscription, useInvoices } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    features: ['1,000 requests/day', '1 wallet', '1 agent', 'Community support'],
  },
  {
    id: 'BUILDER',
    name: 'Builder',
    price: 9,
    features: ['5,000 requests/day', '3 wallets', '5 agents', 'Email support'],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 39,
    features: ['15,000 requests/day', '10 wallets', '25 agents', 'Priority support'],
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: 149,
    features: ['100,000 requests/day', '50 wallets', 'Unlimited agents', 'Dedicated support'],
  },
];

export default function BillingPage() {
  const { data: sub, loading: subLoading, error: subError, refetch: subRefetch } = useSubscription();
  const { data: invoices, loading: invLoading } = useInvoices();

  const loading = subLoading || invLoading;
  const currentPlan = (sub?.plan || 'FREE').toUpperCase();
  const currentPlanDef = PLANS.find((p) => p.id === currentPlan) || PLANS[0];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Billing</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Manage your plan and payment methods</p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : subError ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={subError.message} onRetry={subRefetch} />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>

          {/* Current Plan Card */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3>Current Plan</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'var(--blue-subtle)', color: 'var(--blue)', fontWeight: 500 }}>{currentPlanDef.name}</span>
            </div>
            <div className="card-body">
              <div className="grid-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '6px' }}>Monthly Price</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.5px' }}>${currentPlanDef.price}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-3)' }}>/mo</span></div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '6px' }}>Requests Today</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.5px' }}>
                    {sub?.requests_today ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-3)' }}> / {sub?.requests_limit ?? '—'}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '6px' }}>Wallets Limit</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.5px' }}>{sub?.wallets_limit ?? '—'}</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '6px' }}>Agents Limit</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.5px' }}>{sub?.agents_limit ?? '—'}</div>
                </div>
              </div>
              {sub?.requests_limit && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Daily usage</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                      {Math.round(((sub.requests_today || 0) / sub.requests_limit) * 100)}%
                    </span>
                  </div>
                  <div className="trust-bar-bg">
                    <div className="trust-bar" style={{ width: `${Math.min(((sub.requests_today || 0) / sub.requests_limit) * 100, 100)}%`, background: 'var(--blue)' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan Grid */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', paddingLeft: '24px' }}>Available Plans</h3>
            <div className="plan-grid">
              {PLANS.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                return (
                  <div key={plan.id} className={`plan-card${isCurrent ? ' current' : ''}`}>
                    {isCurrent && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--blue-subtle)', color: 'var(--blue)', fontWeight: 500 }}>Current</span>
                      </div>
                    )}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{plan.name}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '20px' }}>
                      ${plan.price}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-3)' }}>/mo</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '10px' }}>
                          <Check size={14} style={{ color: isCurrent ? 'var(--blue)' : 'var(--text-3)', flexShrink: 0 }} />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      {isCurrent ? (
                        <button
                          className="btn-sm"
                          style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600, background: 'var(--blue-subtle)', color: 'var(--blue)', border: '1px solid var(--blue)', cursor: 'default' }}
                        >
                          Current Plan
                        </button>
                      ) : (
                        <button
                          className="plan-btn-fill"
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: '#0a0a0a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'opacity .15s',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          {plan.price > currentPlanDef.price ? 'Upgrade' : 'Downgrade'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Billing History */}
          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>

            <div className="card">
              <div className="card-header">
                <h3>Payment Method</h3>
              </div>
              <div className="card-body">
                <div className="flex items-center gap-3" style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
                  <div className="flex items-center justify-center" style={{ width: '40px', height: '28px', background: 'var(--card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <CreditCard size={18} style={{ color: 'var(--text-2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>USDC on Base</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', marginTop: '1px' }}>Crypto payments</div>
                  </div>
                </div>
                <button className="btn-sm" style={{ marginTop: '16px', width: '100%', padding: '10px', fontSize: '13px' }}>Update Payment Method</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Billing History</h3>
              </div>
              <div className="card-body-flush">
                {invoices && invoices.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', padding: '12px 24px' }}>Date</th>
                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', padding: '12px 24px' }}>Amount</th>
                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', padding: '12px 24px' }}>Status</th>
                        <th style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'right', padding: '12px 24px' }}>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg)' }}>
                          <td style={{ padding: '14px 24px', fontSize: '13px' }}>{inv.date}</td>
                          <td style={{ padding: '14px 24px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>${inv.amount.toFixed(2)}</td>
                          <td style={{ padding: '14px 24px' }}>
                            <span className={`status-badge ${inv.status.toLowerCase() === 'paid' ? 'status-paid' : 'status-pending'}`}>{inv.status}</span>
                          </td>
                          <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                            <button className="flex items-center gap-1" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <Download size={12} /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', fontSize: '13px', color: 'var(--text-3)', textAlign: 'center' }}>
                    No invoices yet
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
