'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useTitle, useProviders, useEvalScores } from '@/lib/hooks';
import { PageSkeleton } from '@/components/ui/loading';
import { ErrorCard } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';
import { Search, X } from 'lucide-react';

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
  'search': 'cat-search',
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

function catClass(category: string): string {
  return CAT_CLASS_MAP[category.toLowerCase()] || 'cat-search';
}

function formatCategory(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProvidersPage() {
  useTitle('Providers');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minTrust, setMinTrust] = useState(0);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showTrustDropdown, setShowTrustDropdown] = useState(false);
  const { data: providers, loading, error, refetch } = useProviders();
  const { scores: evalScores } = useEvalScores(providers);

  // Close dropdowns on click outside
  const closeDropdowns = useCallback(() => {
    setShowCatDropdown(false);
    setShowTrustDropdown(false);
  }, []);

  useEffect(() => {
    if (!showCatDropdown && !showTrustDropdown) return;
    const handler = () => closeDropdowns();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showCatDropdown, showTrustDropdown, closeDropdowns]);

  // Derive unique categories from provider data
  const categories = Array.from(
    new Set((providers || []).map(p => p.category).filter(Boolean))
  ).sort();

  const filtered = (providers || []).filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter ||
      (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesTrust = (evalScores[p.id] ?? p.trustScore ?? 0) >= minTrust;
    return matchesSearch && matchesCategory && matchesTrust;
  });

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Providers</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>AI services in the Fabric registry</p>
        </div>
        <div className="header-actions">
          <Link href="/dashboard/register" className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600, display: 'flex', textAlign: 'center' }}>+ Register Provider</Link>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <ErrorCard message={error.message} onRetry={refetch} />
        </div>
      ) : filtered.length === 0 && !search ? (
        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <EmptyState icon={Search} title="No providers registered" description="Register your first provider to get started." />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
          <div className="provider-search-bar">
            <input
              style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 16px', borderRadius: '10px', fontSize: '16px', outline: 'none', background: 'var(--card)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', color: 'var(--text)' }}
              placeholder="Search providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                className="btn-sm provider-filter-btn"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px 18px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', background: categoryFilter ? 'var(--blue-subtle)' : undefined, color: categoryFilter ? 'var(--blue)' : undefined, borderColor: categoryFilter ? 'var(--blue)' : undefined }}
                onClick={() => { setShowCatDropdown(!showCatDropdown); setShowTrustDropdown(false); }}
              >
                {categoryFilter ? formatCategory(categoryFilter) : 'Category'}
                {showCatDropdown ? <X size={12} /> : <span>↓</span>}
              </button>
              {showCatDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', minWidth: '180px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 10, overflow: 'hidden' }}>
                  <div
                    className="dropdown-option"
                    style={{ color: !categoryFilter ? 'var(--blue)' : 'var(--text)', fontWeight: !categoryFilter ? 600 : 400 }}
                    onClick={() => { setCategoryFilter(''); setShowCatDropdown(false); }}
                  >
                    All Categories
                  </div>
                  {categories.map(cat => (
                    <div
                      key={cat}
                      className="dropdown-option"
                      style={{ color: categoryFilter === cat ? 'var(--blue)' : 'var(--text)', fontWeight: categoryFilter === cat ? 600 : 400 }}
                      onClick={() => { setCategoryFilter(cat); setShowCatDropdown(false); }}
                    >
                      {formatCategory(cat)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                className="btn-sm provider-filter-btn"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px 18px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', background: minTrust > 0 ? 'var(--blue-subtle)' : undefined, color: minTrust > 0 ? 'var(--blue)' : undefined, borderColor: minTrust > 0 ? 'var(--blue)' : undefined }}
                onClick={() => { setShowTrustDropdown(!showTrustDropdown); setShowCatDropdown(false); }}
              >
                {minTrust > 0 ? `≥ ${minTrust.toFixed(1)}` : 'Min Trust'}
                {showTrustDropdown ? <X size={12} /> : <span>↓</span>}
              </button>
              {showTrustDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', minWidth: '140px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 10, overflow: 'hidden' }}>
                  {[0, 1, 2, 3, 4].map(val => (
                    <div
                      key={val}
                      className="dropdown-option"
                      style={{ color: minTrust === val ? 'var(--blue)' : 'var(--text)', fontWeight: minTrust === val ? 600 : 400 }}
                      onClick={() => { setMinTrust(val); setShowTrustDropdown(false); }}
                    >
                      {val === 0 ? 'Any score' : `≥ ${val.toFixed(1)}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching providers" description="Try a different search term." />
          ) : (
            <div className="provider-grid">
              {filtered.map((p) => {
                const trustVal = evalScores[p.id] ?? p.trustScore;
                const score = trustVal != null ? trustVal.toFixed(2) : '—';
                const letter = p.name.charAt(0).toUpperCase();
                const gradient = nameToGradient(p.name);
                const cat = formatCategory(p.category || 'Unknown');
                const cc = catClass(p.category || '');

                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/providers/${p.id}`}
                    className="block transition-colors cursor-pointer"
                    style={{ background: 'var(--card)', padding: '24px' }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-[10px] text-[16px] font-bold text-white" style={{ width: '36px', height: '36px', background: gradient }}>{letter}</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.3px' }}>{p.name}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--green)', fontWeight: 500 }}>{score}</div>
                    </div>
                    <span className={`inline-block ${cc} rounded-[5px]`} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.5px', padding: '3px 10px', textTransform: 'uppercase', marginBottom: '10px' }}>{cat}</span>
                    {p.description && (
                      <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '14px' }}>{p.description}</div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                      {p.basePrice != null && p.basePrice > 0 && <span>${p.basePrice}/{p.pricingModel === 'per-token' ? 'token' : 'req'}</span>}
                      {p.active && (
                        <span className="inline-flex items-center gap-[5px]" style={{ color: 'var(--green)', letterSpacing: '.5px' }}>
                          <span className="inline-block w-[5px] h-[5px] rounded-full animate-live-pulse" style={{ background: 'var(--green)' }} />
                          LIVE
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
