'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useProvider, useProviderEvaluation, useWallets } from '@/lib/hooks';
import { createFavorite, ApiError } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';

function nameToGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,55%), hsl(${h2},70%,45%))`;
}

const CAT_CLASS_MAP: Record<string, string> = {
  'web-search': 'cat-search',
  'image-generation': 'cat-image',
  'data-analysis': 'cat-data',
  'market-data': 'cat-data',
  'code-review': 'cat-code',
  'translation': 'cat-translation',
  'transcription': 'cat-transcription',
  'text-generation': 'cat-text',
  'embedding': 'cat-embedding',
  'web-scraping': 'cat-data',
  'email': 'cat-code',
};

function formatCategory(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const BREAKDOWN_COLORS: Record<string, string> = {
  successRate: 'var(--blue)',
  latency: 'var(--blue)',
  uptime: 'var(--green)',
  feedback: 'var(--amber)',
  onChainRep: 'var(--pink)',
  longevity: 'var(--green)',
  volumeConsistency: 'var(--blue)',
};

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: provider, loading, error, refetch } = useProvider(id);
  const { data: evaluation, refetch: evaluationRefetch } = useProviderEvaluation(id);
  const { data: walletsData } = useWallets();

  const [showFavForm, setShowFavForm] = useState(false);
  const [favAgentId, setFavAgentId] = useState('');
  const [addingFav, setAddingFav] = useState(false);
  const [favError, setFavError] = useState('');
  const [favSuccess, setFavSuccess] = useState(false);

  const agentIds = (walletsData?.wallets || [])
    .map(w => w.agentId)
    .filter(Boolean);

  // Auto-select if only one agent
  const effectiveAgentId = favAgentId || (agentIds.length === 1 ? agentIds[0] : '');

  async function handleAddFavorite() {
    if (!effectiveAgentId) return;
    setAddingFav(true);
    setFavError('');
    setFavSuccess(false);
    try {
      await createFavorite({ agentId: effectiveAgentId, providerId: id });
      setFavSuccess(true);
      setTimeout(() => {
        setShowFavForm(false);
        setFavSuccess(false);
        setFavAgentId('');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown> | undefined;
        setFavError((body?.error as string) || err.message);
      } else {
        setFavError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setAddingFav(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center" style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <Link href="/dashboard/providers" className="p-1"><ArrowLeft size={18} style={{ color: 'var(--text-3)' }} /></Link>
          <div className="skeleton" style={{ width: '160px', height: '22px', marginLeft: '8px' }} />
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div>
        <div className="flex items-center" style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <Link href="/dashboard/providers" className="p-1"><ArrowLeft size={18} style={{ color: 'var(--text-3)' }} /></Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px', marginLeft: '8px' }}>Provider</h1>
        </div>
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error?.message || 'Provider not found'} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const trustScore = evaluation?.trust?.score ?? provider.trustScore;
  const scoreStr = trustScore != null ? trustScore.toFixed(2) : '—';
  const cat = formatCategory(provider.category || 'Unknown');
  const cc = CAT_CLASS_MAP[provider.category?.toLowerCase() || ''] || 'cat-search';
  const gradient = nameToGradient(provider.name);
  const letter = provider.name.charAt(0).toUpperCase();

  // Build trust breakdown rows from evaluation
  const breakdownRows = evaluation?.trust?.breakdown
    ? Object.entries(evaluation.trust.breakdown).map(([key, item]) => ({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim(),
        pct: Math.round(item.raw * 100),
        color: BREAKDOWN_COLORS[key] || 'var(--blue)',
        weight: item.weight,
        weighted: item.weighted,
      }))
    : [];

  const stats = evaluation?.stats;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/providers" className="p-1"><ArrowLeft size={18} style={{ color: 'var(--text-3)' }} /></Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>{provider.name}</h1>
        </div>
        {provider.active && (
          <span className="inline-flex items-center gap-[5px]" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)', letterSpacing: '.5px' }}>
            <span className="inline-block w-[5px] h-[5px] rounded-full animate-live-pulse" style={{ background: 'var(--green)' }} />
            LIVE ON FABRIC
          </span>
        )}
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        {/* Detail header */}
        <div className="flex items-center gap-5" style={{ marginBottom: '28px' }}>
          <div className="flex items-center justify-center rounded-[14px] text-2xl font-bold text-white" style={{ width: '56px', height: '56px', background: gradient }}>{letter}</div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-1px' }}>{provider.name}</h2>
            <span className={`${cc} inline-block rounded-[5px]`} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '.5px', padding: '3px 10px', textTransform: 'uppercase', marginTop: '4px' }}>{cat}</span>
          </div>
        </div>

        {/* Stat grid */}
        <div className="stat-grid grid-5col" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '28px' }}>
          {[
            { label: 'Trust Score', value: scoreStr, color: 'var(--blue)' },
            { label: 'Price', value: provider.basePrice != null ? `$${provider.basePrice}` : '—' },
            { label: 'Avg Latency', value: stats?.avgLatencyMs != null ? `${stats.avgLatencyMs}ms` : '—' },
            { label: 'Success Rate', value: stats?.successRate != null ? `${(stats.successRate * 100).toFixed(1)}%` : '—', color: 'var(--green)' },
            { label: 'Total Requests', value: stats?.totalRequests != null ? stats.totalRequests.toLocaleString() : '—' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 2-col layout */}
        <div className="grid gap-5 grid-2col" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Trust Breakdown */}
          <div className="card">
            <div className="card-header">
              <span>Trust Breakdown</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--blue)', fontWeight: 500 }}>{scoreStr} / 5.00</span>
            </div>
            <div className="card-body">
              {breakdownRows.length > 0 ? (
                breakdownRows.map((r) => (
                  <div key={r.label} className="flex items-center gap-[14px]" style={{ padding: '12px 0', borderBottom: '1px solid var(--bg)' }}>
                    <div style={{ width: '120px', fontSize: '13px', color: 'var(--text-2)' }}>{r.label}</div>
                    <div className="trust-bar-bg">
                      <div className="trust-bar" style={{ width: `${r.pct}%`, background: r.color }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', width: '44px', textAlign: 'right', fontWeight: 500 }}>{r.pct}%</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '12px 0' }}>No trust breakdown available yet.</div>
              )}
              {evaluation?.trust?.penalties && evaluation.trust.penalties.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--amber-subtle)', borderRadius: '8px', fontSize: '12px', color: 'var(--amber)' }}>
                  Penalties: {evaluation.trust.penalties.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-header"><span>Provider Info</span></div>
              <div className="card-body" style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 2 }}>
                {[
                  { label: 'Registry ID', value: provider.registryId, mono: true },
                  { label: 'Pricing Model', value: provider.pricingModel || evaluation?.provider?.pricingModel || '—' },
                  { label: 'Currency', value: evaluation?.provider?.currency || 'USDC' },
                  { label: 'Chain', value: 'Base' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
                    <span style={r.mono ? { fontFamily: 'var(--font-mono)', fontSize: '12px' } : {}}>{r.value}</span>
                  </div>
                ))}
                {provider.description && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--bg)' }}>
                    <div style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Description</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{provider.description}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span>Actions</span></div>
              <div className="card-body">
                <div className="quick-action">Route to this provider</div>
                {showFavForm ? (
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--bg)' }}>
                    {favSuccess ? (
                      <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>Added to favorites!</div>
                    ) : (
                      <>
                        {agentIds.length > 1 && (
                          <div className="form-field" style={{ marginBottom: '8px' }}>
                            <select
                              value={favAgentId}
                              onChange={(e) => setFavAgentId(e.target.value)}
                              style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                            >
                              <option value="">Select agent...</option>
                              {agentIds.map((aid) => (
                                <option key={aid} value={aid}>{aid}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {agentIds.length === 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>No agents available. Create a wallet first.</div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-sm"
                            disabled={addingFav || !effectiveAgentId}
                            onClick={handleAddFavorite}
                            style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', background: 'var(--blue)', color: '#fff', border: 'none', cursor: addingFav || !effectiveAgentId ? 'not-allowed' : 'pointer', opacity: addingFav || !effectiveAgentId ? 0.5 : 1 }}
                          >
                            {addingFav ? 'Adding...' : 'Add'}
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => { setShowFavForm(false); setFavError(''); setFavAgentId(''); }}
                            style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                        {favError && (
                          <div style={{ fontSize: '12px', color: 'var(--red, #e55)', marginTop: '8px' }}>{favError}</div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="quick-action" onClick={() => setShowFavForm(true)} style={{ cursor: 'pointer' }}>Add to favorites</div>
                )}
                <button
                  className="quick-action"
                  onClick={() => evaluationRefetch()}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}
                >
                  Re-evaluate trust
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
