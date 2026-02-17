'use client';

import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { useWallets } from '@/lib/hooks';
import { getWalletBalance } from '@/lib/api';
import type { WalletBalance } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function WalletsPage() {
  const { data: walletsData, loading, error, refetch } = useWallets();
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});

  const walletList = walletsData?.wallets || [];
  const maxWallets = walletsData?.maxWallets ?? 0;

  // Fetch balances once wallets load
  useEffect(() => {
    if (walletList.length === 0) return;
    walletList.forEach((w) => {
      if (!w.agentId) return;
      getWalletBalance(w.agentId)
        .then((bal) => setBalances((prev) => ({ ...prev, [w.agentId]: bal })))
        .catch(() => { /* ignore balance fetch errors */ });
    });
  }, [walletList]);

  const totalBalance = Object.values(balances).reduce((sum, b) => sum + parseFloat(b.balances?.usdc || '0'), 0);

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

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : walletList.length === 0 ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <EmptyState icon={Wallet} title="No wallets yet" description="Create your first wallet to start making payments." />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <div className="stat-grid">
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Wallets</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--blue)' }}>{walletList.length}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{maxWallets} max on plan</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Balance</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--green)' }}>${totalBalance.toFixed(2)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>USDC on Base L2</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Network</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>Base</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>L2 network</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Currency</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>USDC</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>USD Coin</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header"><h3>Managed Wallets</h3></div>
            <div className="card-body-flush">
              {walletList.map((w) => {
                const bal = balances[w.agentId];
                const balStr = bal ? `$${parseFloat(bal.balances?.usdc || '0').toFixed(2)}` : '...';
                const shortAddr = w.address ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : 'No address';

                return (
                  <div key={w.agentId} className="wallet-row">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--green-subtle)' }}>
                        <Wallet size={18} style={{ color: 'var(--green)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px' }}>{w.agentName || w.agentId || 'Wallet'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {shortAddr}
                          {w.agentId && ` · ${w.agentId}`}
                        </div>
                      </div>
                    </div>
                    <div className="wallet-actions">
                      <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Fund</button>
                      <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Withdraw</button>
                      <span className="wallet-balance" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>{balStr} USDC</span>
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
