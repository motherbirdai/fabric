'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ArrowRight, AlertCircle, Wallet, Key } from 'lucide-react';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';

export default function LoginPage() {
  const [mode, setMode] = useState<'key' | 'wallet'>('key');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // ─── API Key login ───
  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const ok = await login(key.trim());
    if (ok) {
      router.push('/dashboard');
    } else {
      setError('Invalid API key. Check your key and try again.');
    }
    setLoading(false);
  };

  // ─── SIWE Wallet login ───
  const handleWalletLogin = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('No wallet detected. Install MetaMask or another web3 wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ethereum = (window as any).ethereum;

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      if (!address) throw new Error('No account selected');

      // Get nonce from gateway
      const nonceRes = await fetch(`${GATEWAY}/auth/siwe/nonce?address=${address}`);
      const { nonce, message } = await nonceRes.json();
      if (!nonce) throw new Error('Failed to get nonce');

      // Request signature
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // Verify with gateway
      const verifyRes = await fetch(`${GATEWAY}/auth/siwe/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      });
      const data = await verifyRes.json();

      if (!verifyRes.ok || !data.authenticated) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      // Login with the returned session key
      const ok = await login(data.apiKey);
      if (ok) {
        router.push('/dashboard');
      } else {
        throw new Error('Session key validation failed');
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature request was rejected.');
      } else {
        setError(err.message || 'Wallet connection failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fabric-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-fabric-green tracking-wider">fabric</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-2 tracking-wide">
            trust layer for the agent economy
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-fabric-gray-200 rounded-lg mb-6 border border-fabric-gray-300">
          <button
            onClick={() => { setMode('key'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'key'
                ? 'bg-fabric-gray-100 text-fabric-green border border-fabric-gray-300'
                : 'text-fabric-gray-500'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> API Key
          </button>
          <button
            onClick={() => { setMode('wallet'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'wallet'
                ? 'bg-fabric-gray-100 text-fabric-green border border-fabric-gray-300'
                : 'text-fabric-gray-500'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Wallet
          </button>
        </div>

        {/* API Key form */}
        {mode === 'key' && (
          <form onSubmit={handleKeyLogin} className="metric-card">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="fab_..."
              className="w-full px-4 py-3 bg-fabric-gray-900 border border-fabric-gray-300 rounded-lg text-sm font-mono text-fabric-white placeholder-fabric-gray-600 focus:outline-none focus:ring-1 focus:ring-fabric-green/50 focus:border-fabric-green/50"
              autoFocus
            />

            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-[12px]">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-fabric-green text-fabric-black rounded-lg text-sm font-semibold hover:bg-fabric-green-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-fabric-black/30 border-t-fabric-black rounded-full animate-spin" />
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}

        {/* Wallet connect */}
        {mode === 'wallet' && (
          <div className="metric-card">
            <p className="text-[13px] text-fabric-gray-500 mb-4">
              Connect your Ethereum wallet to sign in. New accounts are created automatically on the Free plan.
            </p>

            {error && (
              <div className="flex items-center gap-2 mb-4 text-red-400 text-[12px]">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleWalletLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-fabric-green text-fabric-black rounded-lg text-sm font-semibold hover:bg-fabric-green-dim disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-fabric-black/30 border-t-fabric-black rounded-full animate-spin" />
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Sign in with Ethereum
                </>
              )}
            </button>

            <div className="flex items-center gap-3 mt-4 text-[11px] text-fabric-gray-600">
              <div className="flex-1 h-px bg-fabric-gray-300" />
              EIP-4361 SIWE
              <div className="flex-1 h-px bg-fabric-gray-300" />
            </div>

            <p className="text-[11px] text-fabric-gray-600 mt-3 text-center">
              Sign a message to prove wallet ownership — no gas fees.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-fabric-gray-600 mt-6">
          Don't have a key?{' '}
          <a href="https://fabriclayer.dev" className="text-fabric-green hover:underline">Get started</a>
        </p>
      </div>
    </div>
  );
}
