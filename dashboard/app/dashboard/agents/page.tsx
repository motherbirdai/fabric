'use client';

import { Bot } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Agents</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Manage your registered agents and their identities</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }}>+ New Agent</button>
        </div>
      </div>
      <div className="animate-fade-in" style={{ padding: '24px 36px 48px' }}>
        <div className="stat-grid">
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Agents</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--blue)' }}>2</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>of 10 max on plan</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Active Today</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>1</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>1 idle</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Requests</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>47</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>Last 24h</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Identity NFTs</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>1</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>ERC-721 minted</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><h3>Registered Agents</h3></div>
          <div className="card-body-flush">
            <div className="setting-row" style={{ cursor: 'pointer' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--blue-subtle)' }}>
                  <Bot size={18} style={{ color: 'var(--blue)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px' }}>research-agent</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Created 2 days ago · 42 requests · Wallet: 0x8f3a...c7d2</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)' }}>Active</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--blue-subtle)', color: 'var(--blue)' }}>NFT Minted</span>
              </div>
            </div>
            <div className="setting-row" style={{ cursor: 'pointer' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--bg)' }}>
                  <Bot size={18} style={{ color: 'var(--text-3)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px' }}>trading-bot</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Created 5 days ago · 5 requests · Wallet: 0x2b7e...9f41</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text-3)' }}>Idle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
