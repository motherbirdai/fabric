'use client';

import { useState } from 'react';
import { Bot, Wallet, Plus, Copy, ExternalLink, Shield, X } from 'lucide-react';
import { api, type Wallet as WalletT } from '@/lib/api';
import { useQuery, useMutation } from '@/lib/hooks';

function WalletCard({ wallet }: { wallet: WalletT }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-fabric-blue/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-fabric-blue" />
          </div>
          <div>
            <div className="text-sm font-semibold">{wallet.label}</div>
            <div className="text-[11px] text-fabric-gray-500">
              Created {new Date(wallet.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">${wallet.balanceUsdc.toFixed(2)}</div>
          <div className="text-[10px] text-fabric-gray-500">USDC</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-fabric-gray-50 rounded-lg">
        <code className="flex-1 text-[11px] font-mono text-fabric-gray-600 truncate">
          {wallet.address}
        </code>
        <button onClick={copy} className="text-fabric-gray-400 hover:text-fabric-gray-600 transition-colors">
          {copied ? <span className="text-[10px] text-green-600">Copied</span> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={`https://basescan.org/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fabric-gray-400 hover:text-fabric-blue transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const wallets = useQuery(() => api.getWallets());
  const sub = useQuery(() => api.getSubscription());
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const createWallet = useMutation(async (label: string) => {
    await api.createWallet({ label });
    wallets.refetch();
    setShowCreate(false);
    setNewLabel('');
  });

  const maxWallets = sub.data?.maxWallets || 0;
  const currentCount = wallets.data?.wallets.length || 0;
  const canCreate = currentCount < maxWallets;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Agents & Wallets</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">
            Managed USDC wallets on Base for your agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-fabric-gray-500">
            {currentCount} / {maxWallets} wallets
          </span>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!canCreate}
            className="flex items-center gap-2 px-4 py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Wallet
          </button>
        </div>
      </div>

      {!canCreate && currentCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-[12px] text-fabric-gray-600 mb-6">
          <Shield className="w-4 h-4 text-fabric-gray-400" />
          You've reached the wallet limit for your plan.
          <a href="/dashboard/billing" className="text-fabric-blue hover:underline ml-1">Upgrade</a>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="metric-card mb-6 max-w-md border-fabric-blue">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">New Wallet</h2>
            <button onClick={() => setShowCreate(false)} className="text-fabric-gray-400 hover:text-fabric-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-1.5">
              Label
            </label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Image Pipeline Agent"
              className="w-full px-3 py-2.5 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fabric-blue"
              autoFocus
            />
          </div>
          <button
            onClick={() => createWallet.execute(newLabel.trim())}
            disabled={createWallet.loading || !newLabel.trim()}
            className="w-full py-2.5 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 disabled:opacity-40 transition-colors"
          >
            {createWallet.loading ? 'Creating...' : 'Create Wallet on Base'}
          </button>
          {createWallet.error && (
            <div className="text-[11px] text-red-500 mt-2">{createWallet.error}</div>
          )}
        </div>
      )}

      {/* Wallet grid */}
      {wallets.loading ? (
        <div className="text-center py-12 text-[13px] text-fabric-gray-400">Loading wallets...</div>
      ) : wallets.data?.wallets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {wallets.data.wallets.map((w) => (
            <WalletCard key={w.id} wallet={w} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Wallet className="w-10 h-10 text-fabric-gray-300 mx-auto mb-3" />
          <div className="text-[13px] text-fabric-gray-500 mb-1">No wallets yet</div>
          <div className="text-[11px] text-fabric-gray-400">
            Create a managed USDC wallet to start routing payments on Base
          </div>
        </div>
      )}
    </div>
  );
}
