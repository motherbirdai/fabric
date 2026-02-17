'use client';

import { Bot } from 'lucide-react';
import { useWallets } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function AgentsPage() {
  const { data: wallets, loading, error, refetch } = useWallets();

  // Derive agents from wallets — each wallet with an agent_id represents an agent
  const agents = (wallets || [])
    .filter((w) => w.agent_id)
    .map((w) => ({
      id: w.agent_id!,
      address: w.address,
      created_at: w.created_at,
    }));

  // Deduplicate by agent_id
  const uniqueAgents = Array.from(new Map(agents.map((a) => [a.id, a])).values());

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

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : uniqueAgents.length === 0 ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <EmptyState icon={Bot} title="No agents found" description="Create a wallet linked to an agent to get started." />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: '24px 36px 48px' }}>
          <div className="stat-grid">
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Agents</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: 'var(--blue)' }}>{uniqueAgents.length}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>derived from wallets</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Total Wallets</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>{wallets?.length || 0}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>managed wallets</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Network</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>Base</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>L2 network</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>Protocol</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px' }}>x402</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>micropayments</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header"><h3>Registered Agents</h3></div>
            <div className="card-body-flush">
              {uniqueAgents.map((agent) => {
                const shortAddr = `${agent.address.slice(0, 6)}...${agent.address.slice(-4)}`;
                return (
                  <div key={agent.id} className="setting-row" style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--blue-subtle)' }}>
                        <Bot size={18} style={{ color: 'var(--blue)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px' }}>{agent.id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {agent.created_at && `Created ${new Date(agent.created_at).toLocaleDateString()} · `}
                          Wallet: {shortAddr}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)' }}>Active</span>
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
