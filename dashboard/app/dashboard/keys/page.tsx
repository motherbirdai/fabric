'use client';

import { useState } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation } from '@/lib/hooks';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';

async function fetchKeys(apiKey: string) {
  const res = await fetch(`${GATEWAY}/v1/keys`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) return { keys: [{ id: 'current', prefix: apiKey.slice(0, 12), createdAt: new Date().toISOString(), lastUsed: new Date().toISOString(), active: true }] };
  return res.json();
}

export default function KeysPage() {
  const { apiKey } = useAuth();
  const keys = useQuery(() => fetchKeys(apiKey || ''), [apiKey]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  const generateKey = useMutation(async () => {
    const res = await fetch(`${GATEWAY}/v1/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey || '' },
      body: JSON.stringify({ label: `Dashboard key ${new Date().toLocaleDateString()}` }),
    });
    if (!res.ok) throw new Error('Failed to generate key');
    const data = await res.json();
    setNewKeyResult(data.apiKey);
    keys.refetch();
    return data;
  });

  const revokeKey = useMutation(async (keyId: string) => {
    await fetch(`${GATEWAY}/v1/keys/${keyId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey || '' },
    });
    keys.refetch();
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">API Keys</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">
            Manage authentication keys for the gateway API
          </p>
        </div>
        <button
          onClick={() => generateKey.execute(undefined as any)}
          disabled={generateKey.loading}
          className="flex items-center gap-2 px-4 py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Generate Key
        </button>
      </div>

      {/* New key banner */}
      {newKeyResult && (
        <div className="metric-card mb-6 border-2 border-green-200 bg-green-50/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-1">New API Key Generated</h3>
              <p className="text-[11px] text-green-700 mb-3">
                Copy this key now — it won't be shown again.
              </p>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                <code className="flex-1 text-[12px] font-mono text-green-900 break-all">{newKeyResult}</code>
                <button
                  onClick={() => copyToClipboard(newKeyResult, 'new')}
                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                >
                  {copied === 'new' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-green-500" />}
                </button>
              </div>
            </div>
            <button onClick={() => setNewKeyResult(null)} className="text-green-500 hover:text-green-700">×</button>
          </div>
        </div>
      )}

      {/* Current key */}
      <div className="metric-card mb-6">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Key className="w-4 h-4" /> Current Session Key
        </h2>
        <div className="flex items-center gap-2 p-3 bg-fabric-gray-50 rounded-lg">
          <code className="flex-1 text-[12px] font-mono truncate">
            {showKey === 'current' ? apiKey : `${apiKey?.slice(0, 12)}${'•'.repeat(24)}${apiKey?.slice(-4)}`}
          </code>
          <button
            onClick={() => setShowKey(showKey === 'current' ? null : 'current')}
            className="p-1.5 hover:bg-fabric-gray-200 rounded transition-colors"
          >
            {showKey === 'current' ? <EyeOff className="w-4 h-4 text-fabric-gray-500" /> : <Eye className="w-4 h-4 text-fabric-gray-500" />}
          </button>
          <button
            onClick={() => apiKey && copyToClipboard(apiKey, 'current')}
            className="p-1.5 hover:bg-fabric-gray-200 rounded transition-colors"
          >
            {copied === 'current' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-fabric-gray-500" />}
          </button>
        </div>
      </div>

      {/* All keys */}
      <div className="metric-card">
        <h2 className="text-sm font-semibold mb-4">All Keys</h2>
        {keys.loading ? (
          <div className="text-[13px] text-fabric-gray-400 py-4">Loading keys...</div>
        ) : (
          <div className="space-y-2">
            {keys.data?.keys?.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between py-3 px-3 bg-fabric-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-fabric-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-[12px] font-mono">{k.prefix}...</code>
                      {k.active ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Revoked</span>
                      )}
                    </div>
                    <div className="text-[10px] text-fabric-gray-500 mt-0.5">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsed && ` · Last used ${new Date(k.lastUsed).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                {k.active && k.id !== 'current' && (
                  <button
                    onClick={() => {
                      if (confirm('Revoke this key? This cannot be undone.')) {
                        revokeKey.execute(k.id);
                      }
                    }}
                    className="p-1.5 text-fabric-gray-400 hover:text-red-500 transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage guide */}
      <div className="metric-card mt-6">
        <h2 className="text-sm font-semibold mb-3">Usage</h2>
        <div className="space-y-2 text-[12px]">
          <div className="p-3 bg-fabric-gray-50 rounded-lg font-mono text-[11px]">
            <div className="text-fabric-gray-500"># Header authentication</div>
            <div>curl -H "x-api-key: fab_sk_..." {GATEWAY}/v1/discover</div>
          </div>
          <div className="p-3 bg-fabric-gray-50 rounded-lg font-mono text-[11px]">
            <div className="text-fabric-gray-500"># TypeScript SDK</div>
            <div>const fabric = new FabricClient({"{"} apiKey: "fab_sk_..." {"}"});</div>
          </div>
          <div className="p-3 bg-fabric-gray-50 rounded-lg font-mono text-[11px]">
            <div className="text-fabric-gray-500"># Python SDK</div>
            <div>client = FabricClient(api_key="fab_sk_...")</div>
          </div>
        </div>
      </div>
    </div>
  );
}
