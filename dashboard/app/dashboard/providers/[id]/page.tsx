'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const TRUST_ROWS = [
  { label: 'Reliability', pct: 95, color: 'var(--blue)' },
  { label: 'Latency', pct: 88, color: 'var(--blue)' },
  { label: 'Cost', pct: 92, color: 'var(--green)' },
  { label: 'Accuracy', pct: 78, color: 'var(--pink)' },
  { label: 'Uptime', pct: 99, color: 'var(--green)' },
];

export default function ProviderDetailPage() {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ padding: '28px 36px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/providers" className="p-1"><ArrowLeft size={18} style={{ color: 'var(--text-3)' }} /></Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>DeepL Agent</h1>
        </div>
        <span className="inline-flex items-center gap-[5px]" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)', letterSpacing: '.5px' }}>
          <span className="inline-block w-[5px] h-[5px] rounded-full animate-live-pulse" style={{ background: 'var(--green)' }} />
          LIVE ON FABRIC
        </span>
      </div>
      <div className="animate-fade-in" style={{ padding: '24px 36px 48px' }}>
        {/* Detail header */}
        <div className="flex items-center gap-5" style={{ marginBottom: '28px' }}>
          <div className="flex items-center justify-center rounded-[14px] text-2xl font-bold text-white" style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#068cff,#0066cc)' }}>D</div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-1px' }}>DeepL Agent</h2>
            <span className="cat-translation inline-block rounded-[5px]" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '.5px', padding: '3px 10px', textTransform: 'uppercase', marginTop: '4px' }}>Translation</span>
          </div>
        </div>

        {/* 5-col stat grid */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '28px' }}>
          {[
            { label: 'Trust Score', value: '4.17', color: 'var(--blue)' },
            { label: 'Price', value: '$0.001' },
            { label: 'Avg Latency', value: '400ms' },
            { label: 'Success Rate', value: '99.9%', color: 'var(--green)' },
            { label: 'Total Requests', value: '215.6K' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 2-col layout */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Trust Breakdown */}
          <div className="card">
            <div className="card-header">
              <span>Trust Breakdown</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--blue)', fontWeight: 500 }}>4.17 / 5.00</span>
            </div>
            <div className="card-body">
              {TRUST_ROWS.map((r) => (
                <div key={r.label} className="flex items-center gap-[14px]" style={{ padding: '12px 0', borderBottom: '1px solid var(--bg)' }}>
                  <div style={{ width: '100px', fontSize: '13px', color: 'var(--text-2)' }}>{r.label}</div>
                  <div className="trust-bar-bg">
                    <div className="trust-bar" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', width: '44px', textAlign: 'right', fontWeight: 500 }}>{r.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-header"><span>Provider Info</span></div>
              <div className="card-body" style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 2 }}>
                {[
                  { label: 'Registry ID', value: 'reg_deepl_agent', mono: true },
                  { label: 'Pricing Model', value: 'Per Token' },
                  { label: 'Currency', value: 'USDC' },
                  { label: 'Chain', value: 'Base' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
                    <span style={r.mono ? { fontFamily: 'var(--font-mono)', fontSize: '12px' } : {}}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span>Actions</span></div>
              <div className="card-body">
                <div className="quick-action">⚡ Route to this provider</div>
                <div className="quick-action">★ Add to favorites</div>
                <div className="quick-action">📊 Re-evaluate trust</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
