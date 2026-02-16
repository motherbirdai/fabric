'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, RefreshCw, Shield, Zap, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/hooks';

export default function SettingsPage() {
  const { apiKey } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const chain = useQuery(() => api.getChainStatus());
  const sub = useQuery(() => api.getSubscription());

  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 10)}${'•'.repeat(24)}${apiKey.slice(-4)}`
    : '—';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-[13px] text-fabric-gray-500 mt-1">API keys and account configuration</p>
      </div>

      {/* API Key */}
      <div className="metric-card mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" /> API Key
        </h2>
        <div className="flex items-center gap-2 p-3 bg-fabric-gray-50 rounded-lg">
          <code className="flex-1 text-[12px] font-mono truncate">
            {showKey ? apiKey : maskedKey}
          </code>
          <button
            onClick={() => setShowKey(!showKey)}
            className="p-1.5 hover:bg-fabric-gray-200 rounded transition-colors"
            title={showKey ? 'Hide' : 'Reveal'}
          >
            {showKey ? <EyeOff className="w-4 h-4 text-fabric-gray-500" /> : <Eye className="w-4 h-4 text-fabric-gray-500" />}
          </button>
          <button
            onClick={copyKey}
            className="p-1.5 hover:bg-fabric-gray-200 rounded transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4 text-fabric-gray-500" />
          </button>
        </div>
        {copied && <p className="text-[11px] text-green-600 mt-1">Copied to clipboard</p>}
        <p className="text-[11px] text-fabric-gray-500 mt-2">
          Use this key in the <code className="bg-fabric-gray-100 px-1 rounded">x-api-key</code> header for all API requests.
        </p>
      </div>

      {/* Account info */}
      {sub.data && (
        <div className="metric-card mb-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Account
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Plan</div>
              <div className="font-semibold text-fabric-blue">{sub.data.plan}</div>
            </div>
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Status</div>
              <div className="font-medium text-green-600">{sub.data.status}</div>
            </div>
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Daily Limit</div>
              <div className="font-medium">{sub.data.dailyLimit.toLocaleString()} req</div>
            </div>
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Routing Fee</div>
              <div className="font-medium">{sub.data.routingFeePct}%</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-fabric-gray-100 text-[11px] text-fabric-gray-500">
            Current period: {new Date(sub.data.currentPeriodStart).toLocaleDateString()} — {new Date(sub.data.currentPeriodEnd).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Chain status */}
      <div className="metric-card mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Base L2
        </h2>
        {chain.data ? (
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Chain ID</div>
              <div className="font-medium">{chain.data.chainId}</div>
            </div>
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Block</div>
              <div className="font-medium">{chain.data.blockNumber.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-fabric-gray-500 uppercase tracking-wider mb-1">Gas Price</div>
              <div className="font-medium">{chain.data.gasPrice}</div>
            </div>
          </div>
        ) : chain.loading ? (
          <div className="text-[13px] text-fabric-gray-400">Connecting to Base...</div>
        ) : (
          <div className="text-[13px] text-red-500">Unable to connect to Base L2</div>
        )}
      </div>

      {/* Quick links */}
      <div className="metric-card">
        <h2 className="text-sm font-semibold mb-4">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { label: 'API Documentation', href: '/docs' },
            { label: 'TypeScript SDK', href: 'https://www.npmjs.com/package/@fabric-gateway/sdk' },
            { label: 'Python SDK', href: 'https://pypi.org/project/fabric-gateway-sdk/' },
            { label: 'FabricRegistry Contract', href: 'https://sepolia.basescan.org' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-fabric-gray-50 hover:bg-fabric-gray-100 transition-colors text-[12px]"
            >
              {link.label}
              <ExternalLink className="w-3 h-3 text-fabric-gray-400" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
