'use client';

import { PiggyBank } from 'lucide-react';

export default function BudgetsPage() {
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
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        <div className="stat-grid">
          {[
            { label: 'Active Budgets', value: '2', color: 'var(--blue)', sub: 'of 5 max on plan' },
            { label: 'Total Budget', value: '$50.00', sub: 'combined limit' },
            { label: 'Spent (30d)', value: '$3.22', sub: '6.4% of total' },
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
            <div className="setting-row">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--blue-subtle)' }}>
                  <PiggyBank size={18} style={{ color: 'var(--blue)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px' }}>research-agent — Daily</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Hard cap · $5.00/day · Resets at midnight UTC</div>
                </div>
              </div>
              <div className="budget-controls">
                <div style={{ width: '100%' }}>
                  <div className="flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px' }}><span>$0.14</span><span>$5.00</span></div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: '2.8%', height: '100%', background: 'var(--blue)', borderRadius: '2px' }} /></div>
                </div>
                <button className="btn-sm budget-edit-btn" style={{ fontSize: '12px', padding: '5px 12px' }}>Edit</button>
              </div>
            </div>
            <div className="setting-row">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--amber-subtle)' }}>
                  <PiggyBank size={18} style={{ color: 'var(--amber)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px' }}>All Agents — Monthly</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Soft cap (alert only) · $45.00/month · Alert at 80%</div>
                </div>
              </div>
              <div className="budget-controls">
                <div style={{ width: '100%' }}>
                  <div className="flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px' }}><span>$3.22</span><span>$45.00</span></div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: '7.2%', height: '100%', background: 'var(--amber)', borderRadius: '2px' }} /></div>
                </div>
                <button className="btn-sm budget-edit-btn" style={{ fontSize: '12px', padding: '5px 12px' }}>Edit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
