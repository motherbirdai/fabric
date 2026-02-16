'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Globe, Star, StarOff, ExternalLink, Copy, MessageSquare, TrendingUp } from 'lucide-react';
import { api, Provider } from '@/lib/api';
import { useQuery, useMutation } from '@/lib/hooks';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';

function TrustBadge({ score }: { score: number }) {
  const level = score >= 4.0 ? 'high' : score >= 3.0 ? 'mid' : 'low';
  return (
    <span className={`trust-badge ${level} text-base px-3 py-1`}>
      <Shield className="w-4 h-4" />
      {score.toFixed(2)}
    </span>
  );
}

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const provider = useQuery(async () => {
    const key = localStorage.getItem('fabric_api_key') || '';
    const res = await fetch(`${GATEWAY}/v1/providers/${id}`, {
      headers: { 'x-api-key': key },
    });
    if (!res.ok) throw new Error('Provider not found');
    return res.json() as Promise<any>;
  }, [id]);

  const evaluation = useQuery(() => api.evaluate({ providerId: id }), [id]);
  const favorites = useQuery(() => api.getFavorites());
  const isFav = favorites.data?.favorites.some(f => f.providerId === id) || false;

  const toggleFav = useMutation(async () => {
    if (isFav) {
      await api.removeFavorite(id);
    } else {
      await api.addFavorite(id);
    }
    favorites.refetch();
  });

  // Feedback form
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const submitFeedback = useMutation(async (input: { score: number; comment: string }) => {
    await api.submitFeedback({
      providerId: id,
      routeId: 'manual',
      score: input.score,
      comment: input.comment || undefined,
    });
    setFeedbackComment('');
    evaluation.refetch();
  });

  const p = provider.data;

  if (provider.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-fabric-blue/30 border-t-fabric-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (provider.error || !p) {
    return (
      <div className="text-center py-20">
        <div className="text-[13px] text-red-500 mb-4">Provider not found</div>
        <button onClick={() => router.push('/dashboard/providers')} className="text-[12px] text-fabric-blue hover:underline">
          Back to providers
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => router.push('/dashboard/providers')} className="text-fabric-gray-400 hover:text-fabric-gray-900 transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold">{p.name}</h1>
            <TrustBadge score={p.trustScore} />
            <button
              onClick={() => toggleFav.execute(undefined as any)}
              className="text-fabric-gray-400 hover:text-fabric-pink transition-colors"
            >
              {isFav ? <Star className="w-5 h-5 fill-current text-fabric-pink" /> : <StarOff className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-fabric-gray-500">
            <span className="px-2 py-0.5 bg-fabric-gray-100 rounded">{p.category}</span>
            <span className={p.active ? 'text-green-600' : 'text-red-500'}>
              {p.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Trust Score', value: p.trustScore.toFixed(2), color: 'text-fabric-blue' },
          { label: 'Total Interactions', value: (p.totalInteractions || 0).toLocaleString() },
          { label: 'Price/Request', value: `$${(p.priceUsd || 0).toFixed(3)}` },
          { label: 'Success Rate', value: `${((p.successRate || 0) * 100).toFixed(1)}%` },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card text-center">
            <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-xl font-semibold ${color || ''}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: details + trust breakdown */}
        <div className="xl:col-span-2 space-y-6">
          {/* Endpoint & IDs */}
          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-4">Provider Details</h2>
            <div className="space-y-3 text-[12px]">
              <div>
                <span className="text-fabric-gray-500">Endpoint</span>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-3 h-3 text-fabric-gray-400" />
                  <code className="font-mono text-fabric-gray-900 break-all">{p.endpoint}</code>
                  <a href={p.endpoint} target="_blank" rel="noopener noreferrer" className="text-fabric-gray-400 hover:text-fabric-blue">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              {p.description && (
                <div>
                  <span className="text-fabric-gray-500">Description</span>
                  <p className="mt-1">{p.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-fabric-gray-500">Provider ID</span>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="font-mono text-[11px]">{p.id}</code>
                    <button onClick={() => navigator.clipboard.writeText(p.id)} className="text-fabric-gray-400 hover:text-fabric-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-fabric-gray-500">Registry ID</span>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="font-mono text-[11px] truncate">{p.registryId}</code>
                    <button onClick={() => navigator.clipboard.writeText(p.registryId)} className="text-fabric-gray-400 hover:text-fabric-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              {p.walletAddress && (
                <div>
                  <span className="text-fabric-gray-500">Payment Wallet</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-[11px]">{p.walletAddress}</code>
                    <a href={`https://basescan.org/address/${p.walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-fabric-gray-400 hover:text-fabric-blue">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
              <div>
                <span className="text-fabric-gray-500">Payment Type</span>
                <span className="ml-2 px-2 py-0.5 bg-fabric-gray-100 rounded text-[11px]">{p.paymentType || 'x402'}</span>
              </div>
              <div>
                <span className="text-fabric-gray-500">Registered</span>
                <span className="ml-2">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Trust breakdown */}
          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Trust Score Breakdown
            </h2>
            {evaluation.data?.breakdown ? (
              <div className="space-y-3">
                {Object.entries(evaluation.data.breakdown).map(([key, val]) => {
                  const pct = (val as number) * 100;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-fabric-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-fabric-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-fabric-gray-100 flex justify-between text-[13px]">
                  <span className="font-semibold">Composite Score</span>
                  <span className="font-semibold text-fabric-blue">{evaluation.data.trustScore.toFixed(2)}</span>
                </div>
              </div>
            ) : evaluation.loading ? (
              <div className="text-[13px] text-fabric-gray-400">Evaluating trust signals...</div>
            ) : (
              <div className="text-[13px] text-fabric-gray-400">Trust evaluation unavailable</div>
            )}
          </div>
        </div>

        {/* Right column: feedback + performance */}
        <div className="space-y-6">
          {/* Performance stats */}
          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-3">Performance</h2>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-fabric-gray-500">Avg Latency</span>
                <span className="font-medium">{p.avgLatencyMs || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fabric-gray-500">Total Requests</span>
                <span className="font-medium">{(p.totalRequests || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fabric-gray-500">Uptime</span>
                <span className="font-medium">{p.active ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* Submit feedback */}
          <div className="metric-card">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Submit Feedback
            </h2>

            <div className="mb-3">
              <label className="block text-[11px] text-fabric-gray-500 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFeedbackScore(n)}
                    className={`w-8 h-8 rounded-lg text-[12px] font-medium transition-colors ${
                      feedbackScore >= n
                        ? 'bg-fabric-blue text-white'
                        : 'bg-fabric-gray-100 text-fabric-gray-500 hover:bg-fabric-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[11px] text-fabric-gray-500 mb-2">Comment (optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder="How was this provider?"
                className="w-full px-3 py-2 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-fabric-blue resize-none"
              />
            </div>

            <button
              onClick={() => submitFeedback.execute({ score: feedbackScore, comment: feedbackComment })}
              disabled={submitFeedback.loading}
              className="w-full py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 disabled:opacity-40 transition-colors"
            >
              {submitFeedback.loading ? 'Submitting...' : 'Submit Feedback'}
            </button>

            {submitFeedback.error && (
              <p className="text-[11px] text-red-500 mt-2">{submitFeedback.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
