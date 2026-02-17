'use client';

import { Wallet } from 'lucide-react';

export default function WalletsPage() {
  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Wallets</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Managed USDC wallets on Base L2 for agent payments</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }}>+ Create Wallet</button>
        </div>
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        <div className="stat-grid">
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Wallets</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--blue)' }}>1</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>of 10 max on plan</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Balance</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--green)' }}>$12.50</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>USDC on Base L2</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Spent (30d)</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>$3.22</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>across 47 transactions</div>
          </div>
          <div className="stat-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Avg Gas</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>$0.00025</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>per transaction</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><h3>Managed Wallets</h3></div>
          <div className="card-body-flush">
            <div className="wallet-row">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--green-subtle)' }}>
                  <Wallet size={18} style={{ color: 'var(--green)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px' }}>Primary Wallet</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>0x8f3a...c7d2 · Linked to research-agent</div>
                </div>
              </div>
              <div className="wallet-actions">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>$12.50 USDC</span>
                <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Fund</button>
                <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Withdraw</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><h3>Recent Transactions</h3></div>
          <div className="card-body-flush">
            <div className="setting-row">
              <div>
                <div style={{ fontSize: '14px' }}>→ Brave Web Search</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>2 min ago · x402 payment</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red)' }}>−$0.003</span>
            </div>
            <div className="setting-row">
              <div>
                <div style={{ fontSize: '14px' }}>→ Brave Web Search</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>18 min ago · x402 payment</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red)' }}>−$0.003</span>
            </div>
            <div className="setting-row">
              <div>
                <div style={{ fontSize: '14px' }}>← Deposit</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>2 days ago · USDC transfer</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--green)' }}>+$15.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
