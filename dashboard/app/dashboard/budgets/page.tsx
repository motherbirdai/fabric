'use client';

import { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useBudgets } from '@/lib/hooks';
import { createBudget, getBudgetStatus, ApiError } from '@/lib/api';
import type { BudgetStatus } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function BudgetsPage() {
  const { data: budgets, loading, error, refetch } = useBudgets();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [budgetAgentId, setBudgetAgentId] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [budgetHardCap, setBudgetHardCap] = useState(true);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState('0.8');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [budgetStatuses, setBudgetStatuses] = useState<Record<string, BudgetStatus>>({});

  const totalLimit = (budgets || []).reduce((sum, b) => sum + b.limitUsd, 0);
  const totalSpent = (budgets || []).reduce((sum, b) => sum + b.spentUsd, 0);
  const spentPct = totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) : '0';

  const handleCreateBudget = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await createBudget({
        agentId: budgetAgentId.trim() || undefined,
        limitUsd: parseFloat(budgetLimit),
        periodType: budgetPeriod,
        hardCap: budgetHardCap,
        alertThreshold: parseFloat(budgetAlertThreshold),
      });
      setShowCreateForm(false);
      setBudgetAgentId('');
      setBudgetLimit('');
      setBudgetPeriod('monthly');
      setBudgetHardCap(true);
      setBudgetAlertThreshold('0.8');
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = typeof err.body === 'object' && err.body && 'error' in (err.body as Record<string, unknown>)
          ? String((err.body as Record<string, string>).error)
          : err.message;
        setCreateError(msg);
      } else {
        setCreateError((err as Error).message || 'Failed to create budget. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleDetails = async (budgetId: string) => {
    if (expandedBudgetId === budgetId) {
      setExpandedBudgetId(null);
      return;
    }
    setExpandedBudgetId(budgetId);
    try {
      const status = await getBudgetStatus(budgetId);
      setBudgetStatuses((prev) => ({ ...prev, [budgetId]: status }));
    } catch {
      /* ignore status fetch errors */
    }
  };

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Budget Controls</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Set spending limits to control agent costs</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }} onClick={() => setShowCreateForm(true)}>+ New Budget</button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : !budgets || (budgets.length === 0 && !showCreateForm) ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <EmptyState icon={PiggyBank} title="No budgets configured" description="Create a budget to set spending limits for your agents." />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          {showCreateForm && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>New Budget</h3>
                <button
                  className="btn-sm"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                  onClick={() => { setShowCreateForm(false); setCreateError(''); setBudgetAgentId(''); setBudgetLimit(''); setBudgetPeriod('monthly'); setBudgetHardCap(true); setBudgetAlertThreshold('0.8'); }}
                >
                  Cancel
                </button>
              </div>
              <div className="card-body">
                {createError && (
                  <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--red-subtle)', borderRadius: '10px', fontSize: '13px', color: 'var(--red)' }}>
                    {createError}
                  </div>
                )}

                <div className="form-field">
                  <label>Agent ID</label>
                  <input
                    type="text"
                    placeholder="Leave blank for all agents"
                    value={budgetAgentId}
                    onChange={(e) => setBudgetAgentId(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Limit USD <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 100.00"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Period</label>
                  <select
                    value={budgetPeriod}
                    onChange={(e) => setBudgetPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-field" style={{ marginBottom: '16px' }}>
                  <label>Hard Cap</label>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>Enforce Hard Cap</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Block requests when budget is exceeded</div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={budgetHardCap}
                          onChange={(e) => setBudgetHardCap(e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-knob" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label>Alert Threshold</label>
                  <input
                    type="text"
                    placeholder="0.8"
                    value={budgetAlertThreshold}
                    onChange={(e) => setBudgetAlertThreshold(e.target.value)}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                    Fraction of budget at which to trigger an alert (e.g. 0.8 = 80%)
                  </div>
                </div>

                <button
                  className="btn-sm btn-primary-fixed"
                  style={{ padding: '9px 20px', fontWeight: 600, opacity: creating || !budgetLimit.trim() ? 0.4 : 1 }}
                  disabled={creating || !budgetLimit.trim()}
                  onClick={handleCreateBudget}
                >
                  {creating ? 'Creating...' : 'Create Budget'}
                </button>
              </div>
            </div>
          )}

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
                const pct = b.limitUsd > 0 ? (b.spentUsd / b.limitUsd) * 100 : 0;
                const barColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--blue)';
                const iconColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--blue)';
                const iconBg = pct > 80 ? 'var(--red-subtle)' : pct > 50 ? 'var(--amber-subtle)' : 'var(--blue-subtle)';
                const periodLabel = b.period === 'daily' ? 'Daily' : b.period === 'monthly' ? 'Monthly' : b.period;
                const capLabel = b.capType === 'hard' ? 'Hard cap' : b.capType === 'soft' ? 'Soft cap (alert only)' : b.capType || 'Budget';
                const isExpanded = expandedBudgetId === b.id;
                const status = budgetStatuses[b.id];

                return (
                  <div key={b.id}>
                    <div className="setting-row">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: iconBg }}>
                          <PiggyBank size={18} style={{ color: iconColor }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px' }}>{b.agentId || 'All Agents'} — {periodLabel}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                            {capLabel} · ${b.limitUsd.toFixed(2)}/{b.period}
                            {b.alertThresholdPct ? ` · Alert at ${b.alertThresholdPct}%` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="budget-controls">
                        <div style={{ width: '100%' }}>
                          <div className="budget-digits" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: '3px' }}>
                            <span>${b.spentUsd.toFixed(2)}</span>
                            <span>${b.limitUsd.toFixed(2)}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                          </div>
                        </div>
                        <button className="btn-sm budget-edit-btn" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => handleToggleDetails(b.id)}>Details</button>
                      </div>
                    </div>
                    {isExpanded && status && (
                      <div style={{ padding: '0 24px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '4px' }}>Remaining</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>${status.remaining.toFixed(2)}</div>
                        </div>
                        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '4px' }}>Utilization</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>{status.utilization.toFixed(1)}%</div>
                        </div>
                        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '4px' }}>Resets At</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{new Date(status.resetAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '4px' }}>Alert</div>
                          <span className="status-badge" style={status.alertTriggered ? { background: 'var(--red-subtle)', color: 'var(--red)' } : { background: 'var(--green-subtle)', color: 'var(--green)' }}>
                            {status.alertTriggered ? 'Triggered' : 'OK'}
                          </span>
                        </div>
                      </div>
                    )}
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
