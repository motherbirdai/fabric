'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useWallets, useFavorites } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function FavoritesPage() {
  const { data: walletsData, loading: walletsLoading } = useWallets();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Derive unique agent IDs from wallets
  const agentIds = (walletsData?.wallets || [])
    .map((w) => w.agentId)
    .filter((id): id is string => !!id);

  // Auto-select first agent
  useEffect(() => {
    if (!selectedAgent && agentIds.length > 0) {
      setSelectedAgent(agentIds[0]);
    }
  }, [agentIds, selectedAgent]);

  const { data: favorites, loading: favsLoading, error, refetch } = useFavorites(selectedAgent);

  const loading = walletsLoading || favsLoading;

  return (
    <div>
      <div style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Favorites</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Preferred providers get priority in routing decisions</p>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          {/* Agent selector (if multiple agents) */}
          {agentIds.length > 1 && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {agentIds.map((id) => (
                <button
                  key={id}
                  className={`event-filter${id === selectedAgent ? ' active' : ''}`}
                  onClick={() => setSelectedAgent(id)}
                >
                  {id}
                </button>
              ))}
            </div>
          )}

          {!favorites || favorites.length === 0 ? (
            <EmptyState icon={Star} title="No favorites yet" description="Favorite providers from the Providers page to give them priority in routing." />
          ) : (
            <div className="card">
              <div className="card-header"><h3>Preferred Providers</h3></div>
              <div className="card-body-flush">
                {favorites.map((f) => (
                  <div key={f.id} className="setting-row">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--blue-subtle)' }}>
                        <Star size={18} style={{ color: 'var(--blue)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px' }}>{f.providerName || f.providerId}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {f.category || 'Provider'}
                          {f.trustScore != null && ` · Trust: ${f.trustScore.toFixed(2)}`}
                          {f.createdAt && ` · Added ${new Date(f.createdAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="fav-actions">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)', textAlign: 'center' }}>+15% boost</span>
                      <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header"><h3>How Favorites Work</h3></div>
            <div className="card-body-flush">
              <div style={{ padding: '16px', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 }}>
                When you favorite a provider, they receive a <strong>+15% boost</strong> in trust score during routing. This means your agents will prefer these providers when multiple options are available for the same category. You can favorite providers from the Providers page or via the <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'rgba(6,140,255,.06)', color: 'var(--blue)', padding: '1px 5px', borderRadius: '4px' }}>POST /v1/favorites</span> API endpoint.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
