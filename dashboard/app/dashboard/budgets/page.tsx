'use client';

import { PiggyBank } from 'lucide-react';
import { useBudgets } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function BudgetsPage() {
  const { data: budgets, loading, error, refetch } = useBudgets();

  const totalLimit = (budgets || []).reduce((sum, b) => sum + b.limit_usd, 0);
  const totalSpent = (budgets || []).reduce((sum, b) => sum + b.spent_usd, 0);
  const spentPct = totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Budget Controls</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Set spending limits to control agent costs</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }}>+ New Budget</button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <EmptyState icon={PiggyBank} title="No budgets configured" description="Create a budget to set spending limits for your agents." />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <div className="stat-grid">
            {[
              { label: 'Active Budgets', value: String(budgets.length), color: 'var(--blue)', sub: 'configured' },
              { label: 'Total Budget', value: `$${totalLimit.toFixed(2)}`, sub: 'combined limit' },
              { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, sub: `${spentPct}% of total` },
              { label: 'Alerts Triggered', value: '0', color: 'var(--green)', sub: 'no warnings' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header"><h3>Active Budgets</h3></div>
            <div className="card-body-flush">
              {budgets.map((b) => {
                const pct = b.limit_usd > 0 ? (b.spent_usd / b.limit_usd) * 100 : 0;
                const barColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--blue)';
                const iconColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--blue)';
                const iconBg = pct > 80 ? 'var(--red-subtle)' : pct > 50 ? 'var(--amber-subtle)' : 'var(--blue-subtle)';
                const periodLabel = b.period === 'daily' ? 'Daily' : b.period === 'monthly' ? 'Monthly' : b.period;
                const capLabel = b.cap_type === 'hard' ? 'Hard cap' : b.cap_type === 'soft' ? 'Soft cap (alert only)' : b.cap_type || 'Budget';

                return (
                  <div key={b.id} className="setting-row">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: iconBg }}>
                        <PiggyBank size={18} style={{ color: iconColor }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px' }}>{b.agent_id || 'All Agents'} — {periodLabel}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {capLabel} · ${b.limit_usd.toFixed(2)}/{b.period}
                          {b.alert_threshold_pct ? ` · Alert at ${b.alert_threshold_pct}%` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="budget-controls">
                      <div style={{ width: '100%' }}>
                        <div className="budget-digits" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: '3px' }}>
                          <span>${b.spent_usd.toFixed(2)}</span>
                          <span>${b.limit_usd.toFixed(2)}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                        </div>
                      </div>
                      <button className="btn-sm budget-edit-btn" style={{ fontSize: '12px', padding: '5px 12px' }}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
