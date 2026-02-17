'use client';

import Link from 'next/link';
import { Shield, DollarSign, Zap, Clock } from 'lucide-react';

export default function OverviewPage() {
  return (
    <div>
      {/* Page header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Overview</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Your Fabric gateway at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
            Updated just now
          </span>
          <span className="status-pill online">Gateway connected</span>
        </div>
      </div>

      {/* Page content */}
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
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
              Pro
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
              0 / 15,000 requests today
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
              1
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
              10 max on plan
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)' }}>
                Overage Today
              </span>
              <Zap size={14} style={{ opacity: 0.35 }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>
              0
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
              $0.000 this period
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
              0h
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
              86MB memory
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <div className="card-header">
            <span>System Health</span>
            <span className="status-pill online" style={{ fontSize: '11px', padding: '3px 10px' }}>
              All systems operational
            </span>
          </div>
          <div className="card-body-flush">
            <div className="health-row">
              <div className="flex items-center gap-[10px] text-[14px]">
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--green)' }} />
                postgres
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>3ms</div>
            </div>
            <div className="health-row">
              <div className="flex items-center gap-[10px] text-[14px]">
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--green)' }} />
                redis
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>1ms</div>
            </div>
            <div className="health-row">
              <div className="flex items-center gap-[10px] text-[14px]">
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--red)' }} />
                stripe
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>not_configured</div>
            </div>
          </div>
        </div>

        {/* Active Budgets */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span>Active Budgets</span>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No budgets configured</div>
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
            <Link href="/dashboard/billing" className="quick-action">Manage Billing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
