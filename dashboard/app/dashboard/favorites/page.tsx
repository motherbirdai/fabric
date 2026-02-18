'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useTitle, useWallets, useFavorites, useProviders, invalidateCache } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';
import { deleteFavorite, createFavorite, listProviders, ApiError } from '@/lib/api';
import type { Provider } from '@/lib/api';

export default function FavoritesPage() {
  useTitle('Favorites');
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
  const { data: providers } = useProviders();

  // Build provider name lookup
  const providerNames: Record<string, string> = {};
  const providerCategories: Record<string, string> = {};
  (providers || []).forEach(p => {
    providerNames[p.id] = p.name;
    providerCategories[p.id] = p.category;
  });

  const loading = walletsLoading || favsLoading;

  // Remove favorite state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  // Add favorite state
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [addPriority, setAddPriority] = useState('50');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setRemoveError('');
    try {
      await deleteFavorite(id);
      if (selectedAgent) invalidateCache(`favorites:${selectedAgent}`);
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = typeof err.body === 'object' && err.body && 'error' in (err.body as Record<string, unknown>)
          ? String((err.body as Record<string, string>).error)
          : err.message;
        setRemoveError(msg);
      } else {
        setRemoveError('Failed to remove favorite. Please try again.');
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleOpenAddForm = async () => {
    setShowAddForm(true);
    setAddError('');
    setSelectedProviderId('');
    setAddPriority('50');
    setLoadingProviders(true);
    try {
      const res = await listProviders();
      setAvailableProviders(res.providers || []);
    } catch {
      setAvailableProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!selectedAgent || !selectedProviderId) return;
    setAdding(true);
    setAddError('');
    try {
      await createFavorite({
        agentId: selectedAgent,
        providerId: selectedProviderId,
        priority: parseInt(addPriority, 10) || 50,
      });
      setShowAddForm(false);
      setSelectedProviderId('');
      setAddPriority('50');
      if (selectedAgent) invalidateCache(`favorites:${selectedAgent}`);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = typeof err.body === 'object' && err.body && 'error' in (err.body as Record<string, unknown>)
          ? String((err.body as Record<string, string>).error)
          : err.message;
        setAddError(msg);
      } else {
        setAddError('Failed to add favorite. Please try again.');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Favorites</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Preferred providers get priority in routing decisions</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }} onClick={handleOpenAddForm}>+ Add Favorite</button>
        </div>
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

          {removeError && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--red-subtle)', borderRadius: '10px', fontSize: '13px', color: 'var(--red)' }}>
              {removeError}
            </div>
          )}

          {/* Add Favorite Form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header"><h3>Add Favorite</h3></div>
              <div className="card-body">
                {addError && (
                  <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--red-subtle)', borderRadius: '10px', fontSize: '13px', color: 'var(--red)' }}>
                    {addError}
                  </div>
                )}
                <div className="form-field">
                  <label>Provider</label>
                  {loadingProviders ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '10px 0' }}>Loading providers...</div>
                  ) : (
                    <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)}>
                      <option value="">Select a provider...</option>
                      {availableProviders.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-field">
                  <label>Priority (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={addPriority}
                    onChange={(e) => setAddPriority(e.target.value)}
                    placeholder="50"
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                    Higher priority means stronger preference during routing.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    className="btn-sm btn-primary-fixed"
                    style={{ padding: '9px 20px', fontWeight: 600, opacity: adding || !selectedProviderId ? 0.5 : 1 }}
                    onClick={handleAddFavorite}
                    disabled={adding || !selectedProviderId}
                  >
                    {adding ? 'Adding...' : 'Add Favorite'}
                  </button>
                  <button
                    className="btn-sm"
                    style={{ padding: '9px 20px' }}
                    onClick={() => { setShowAddForm(false); setAddError(''); }}
                    disabled={adding}
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
                        <div style={{ fontSize: '14px' }}>{f.providerName || providerNames[f.providerId] || f.providerId}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {f.category || providerCategories[f.providerId] || 'Provider'}
                          {f.trustScore != null && ` · Trust: ${f.trustScore.toFixed(2)}`}
                          {f.createdAt && ` · Added ${new Date(f.createdAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="fav-actions">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)', textAlign: 'center' }}>+15% boost</span>
                      <button
                        className="btn-sm"
                        style={{ fontSize: '12px', padding: '5px 12px', opacity: removingId === f.id ? 0.5 : 1 }}
                        onClick={() => handleRemove(f.id)}
                        disabled={removingId === f.id}
                      >
                        {removingId === f.id ? 'Removing...' : 'Remove'}
                      </button>
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
