'use client';

import { useState } from 'react';

const TRUST_WEIGHTS = [
  { key: 'successRate', label: 'Success Rate', desc: 'Weight for provider success rate (last 30d)', default: 30 },
  { key: 'feedbackScore', label: 'Feedback Score', desc: 'Weight for agent feedback ratings', default: 20 },
  { key: 'latency', label: 'Latency', desc: 'Weight for response time percentile', default: 15 },
  { key: 'uptime', label: 'Uptime', desc: 'Weight for 7-day rolling uptime', default: 15 },
  { key: 'onChain', label: 'On-Chain Reputation', desc: 'Weight for ERC-8004 registry data', default: 10 },
  { key: 'longevity', label: 'Longevity + Volume', desc: 'Weight for account age and transaction consistency', default: 10 },
];

const WEBHOOK_EVENTS = ['route.completed', 'route.failed', 'budget.exceeded', 'trust.updated'];

export default function SettingsPage() {
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(TRUST_WEIGHTS.map((w) => [w.key, w.default]))
  );

  const btnDangerStyle: React.CSSProperties = {
    fontSize: '12px',
    padding: '7px 16px',
    background: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Account configuration</p>
      </div>

      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Account ── */}
        <div className="card">
          <div className="card-header"><h3>Account</h3></div>
          <div className="card-body-flush">
            <div className="setting-row">
              <div>
                <div className="setting-label">Email</div>
                <div className="setting-desc">Account email for notifications</div>
              </div>
              <span className="setting-value">kenny@motherbird.com.au</span>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">Plan</div>
                <div className="setting-desc">Current subscription tier</div>
              </div>
              <span className="setting-value" style={{ color: 'var(--green)' }}>FREE</span>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">Gateway URL</div>
                <div className="setting-desc">Your gateway endpoint</div>
              </div>
              <span className="setting-value">api.fabriclayer.dev</span>
            </div>
          </div>
        </div>

        {/* ── Webhooks ── */}
        <div className="card">
          <div className="card-header"><h3>Webhooks</h3></div>
          <div className="card-body-flush">
            <div className="setting-row">
              <div>
                <div className="setting-label">Webhook URL</div>
                <div className="setting-desc">Receive POST notifications for gateway events</div>
              </div>
              <div className="settings-webhook-actions">
                <button className="btn-sm" style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}>
                  Configure
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>Not configured</span>
              </div>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">Events</div>
                <div className="setting-desc">Choose which events trigger webhook calls</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {WEBHOOK_EVENTS.map((evt) => (
                  <span
                    key={evt}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      color: 'var(--text-3)',
                    }}
                  >
                    {evt}
                  </span>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">Webhook Secret</div>
                <div className="setting-desc">Used to verify webhook signatures</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>whsec_••••••••</span>
            </div>
          </div>
        </div>

        {/* ── Trust Weight Overrides ── */}
        <div className="card">
          <div className="card-header">
            <h3>
              Trust Weight Overrides{' '}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'var(--blue-subtle)',
                color: 'var(--blue)',
                marginLeft: '8px',
                verticalAlign: 'middle',
              }}>
                PRO+
              </span>
            </h3>
          </div>
          <div className="card-body-flush">
            {TRUST_WEIGHTS.map((w) => (
              <div key={w.key} className="setting-row">
                <div className="tooltip-wrap">
                  <div className="setting-label">{w.label}</div>
                  <div className="tooltip-text">{w.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[w.key]}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))
                    }
                    style={{ flex: 1, minWidth: 0, accentColor: 'var(--blue)' }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    minWidth: '36px',
                    textAlign: 'right',
                  }}>
                    {(weights[w.key] / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="card" style={{ borderColor: 'var(--red-subtle)' }}>
          <div className="card-header" style={{ borderColor: 'rgba(239,68,68,.15)' }}>
            <h3 style={{ color: 'var(--red)' }}>Danger Zone</h3>
          </div>
          <div className="card-body-flush">
            <div className="setting-row">
              <div>
                <div className="setting-label">Revoke All Keys</div>
                <div className="setting-desc">Invalidate all existing API keys immediately</div>
              </div>
              <button className="settings-danger-btn" style={btnDangerStyle}>
                Revoke Keys
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">Delete Account</div>
                <div className="setting-desc">Permanently delete your account and all data</div>
              </div>
              <button className="settings-danger-btn" style={btnDangerStyle}>
                Delete Account
              </button>
            </div>
          </div>
          <div style={{
            height: '48px',
            background: 'linear-gradient(to bottom, rgba(239,68,68,.06), rgba(239,68,68,.12))',
            borderTop: '1px solid rgba(239,68,68,.1)',
          }} />
        </div>

      </div>
    </div>
  );
}
