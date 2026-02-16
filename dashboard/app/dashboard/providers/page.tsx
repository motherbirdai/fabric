'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, StarOff, Shield, Globe, ExternalLink, ChevronDown } from 'lucide-react';
import { api, Provider } from '@/lib/api';
import { useQuery, useMutation } from '@/lib/hooks';

const CATEGORIES = [
  'all',
  'image-generation',
  'translation',
  'transcription',
  'code-review',
  'data-analysis',
  'text-generation',
  'embedding',
  'search',
];

function TrustBadge({ score }: { score: number }) {
  const level = score >= 4.0 ? 'high' : score >= 3.0 ? 'mid' : 'low';
  return (
    <span className={`trust-badge ${level}`}>
      <Shield className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  );
}

function ProviderCard({ provider, isFav, onToggleFav }: {
  provider: Provider; isFav: boolean; onToggleFav: () => void;
}) {
  const router = useRouter();
  const [evaluating, setEvaluating] = useState(false);
  const [breakdown, setBreakdown] = useState<Record<string, number> | null>(null);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result = await api.evaluate({ providerId: provider.id });
      setBreakdown(result.breakdown);
    } catch {}
    setEvaluating(false);
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold cursor-pointer hover:text-fabric-blue transition-colors" onClick={() => router.push(`/dashboard/providers/${provider.id}`)}>{provider.name}</h3>
            <TrustBadge score={provider.trustScore} />
          </div>
          <div className="text-[11px] text-fabric-gray-500 mt-0.5">{provider.category}</div>
        </div>
        <button
          onClick={onToggleFav}
          className="text-fabric-gray-400 hover:text-fabric-pink transition-colors"
          title={isFav ? 'Remove favorite' : 'Add favorite'}
        >
          {isFav ? <Star className="w-4 h-4 fill-current text-fabric-pink" /> : <StarOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-[11px] mb-3">
        <div>
          <div className="text-fabric-gray-900 font-medium">{provider.totalInteractions.toLocaleString()}</div>
          <div className="text-fabric-gray-500">interactions</div>
        </div>
        <div>
          <div className="text-fabric-gray-900 font-medium">${provider.priceUsd.toFixed(3)}</div>
          <div className="text-fabric-gray-500">per request</div>
        </div>
        <div>
          <div className={`font-medium ${provider.active ? 'text-green-600' : 'text-red-500'}`}>
            {provider.active ? 'Active' : 'Inactive'}
          </div>
          <div className="text-fabric-gray-500">status</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-fabric-gray-500 mb-3 overflow-hidden">
        <Globe className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{provider.endpoint}</span>
      </div>

      {breakdown && (
        <div className="border-t border-fabric-gray-100 pt-3 mb-3 space-y-1">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between text-[11px]">
              <span className="text-fabric-gray-500">{key}</span>
              <span className="font-medium">{(val * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className="flex-1 py-1.5 text-[11px] rounded-lg border border-fabric-gray-200 hover:bg-fabric-gray-50 transition-colors disabled:opacity-40"
        >
          {evaluating ? 'Evaluating...' : breakdown ? 'Re-evaluate' : 'Evaluate trust'}
        </button>
        {provider.endpoint && (
          <a
            href={provider.endpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[11px] rounded-lg border border-fabric-gray-200 hover:bg-fabric-gray-50 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  const [category, setCategory] = useState('all');
  const [minTrust, setMinTrust] = useState(0);

  const providers = useQuery(
    () => api.discover({ category: category === 'all' ? undefined : category, minTrust: minTrust || undefined, limit: 50 }),
    [category, minTrust]
  );

  const favorites = useQuery(() => api.getFavorites());
  const favIds = new Set(favorites.data?.favorites.map(f => f.providerId) || []);

  const toggleFav = useMutation(async (providerId: string) => {
    if (favIds.has(providerId)) {
      await api.removeFavorite(providerId);
    } else {
      await api.addFavorite(providerId);
    }
    favorites.refetch();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Providers</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">
            Browse and evaluate {providers.data?.total || 0} registered providers
          </p>
        </div>
        <a
          href="/dashboard/providers/register"
          className="px-4 py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 transition-colors"
        >
          + Register Provider
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-fabric-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-fabric-blue cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-fabric-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={minTrust}
            onChange={(e) => setMinTrust(Number(e.target.value))}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-fabric-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-fabric-blue cursor-pointer"
          >
            <option value={0}>Any trust score</option>
            <option value={3}>3.0+ trust</option>
            <option value={3.5}>3.5+ trust</option>
            <option value={4}>4.0+ trust</option>
            <option value={4.5}>4.5+ trust</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-fabric-gray-400 pointer-events-none" />
        </div>

        {favorites.data?.favorites.length ? (
          <div className="flex items-center gap-1 text-[11px] text-fabric-pink ml-auto">
            <Star className="w-3 h-3 fill-current" />
            {favorites.data.favorites.length} favorites
          </div>
        ) : null}
      </div>

      {/* Provider grid */}
      {providers.loading ? (
        <div className="text-center py-12 text-[13px] text-fabric-gray-400">Loading providers...</div>
      ) : providers.error ? (
        <div className="text-center py-12 text-[13px] text-red-500">{providers.error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.data?.providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isFav={favIds.has(p.id)}
              onToggleFav={() => toggleFav.execute(p.id)}
            />
          ))}
        </div>
      )}

      {providers.data?.providers.length === 0 && !providers.loading && (
        <div className="text-center py-12">
          <Globe className="w-8 h-8 text-fabric-gray-300 mx-auto mb-3" />
          <div className="text-[13px] text-fabric-gray-500">No providers found for this category</div>
        </div>
      )}
    </div>
  );
}
