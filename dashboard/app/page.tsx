'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { FabricLogo } from '@/components/layout/FabricLogo';
import { Key, ArrowRight, Lock } from 'lucide-react';

function LoginForm() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && authenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, authenticated, router]);

  if (authLoading) return null;
  if (authenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    if (!trimmed.startsWith('fab_')) {
      setError('Invalid format. API keys start with fab_');
      setLoading(false);
      return;
    }
    const ok = await login(trimmed);
    if (ok) {
      router.push('/dashboard');
    } else {
      setError('Authentication failed. Check that your API key is correct and active.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <FabricLogo style={{ height: '64px', width: 'auto' }} />
          <p>The trust layer for the agent economy</p>
        </div>

        <div className="login-tabs">
          <button
            className="login-tab active"
          >
            <Key size={14} />
            API Key
          </button>
          <button
            className="login-tab"
            style={{ opacity: 0.45, cursor: 'not-allowed', position: 'relative' }}
            disabled
            title="Coming soon"
          >
            <Lock size={12} />
            Wallet
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '.5px', marginLeft: '4px', opacity: 0.7 }}>SOON</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>API Key</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="fab_..."
              autoFocus
            />
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>{error}</p>
          )}

          <button type="submit" className="login-btn" disabled={loading || !value.trim()}>
            {loading ? (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin .6s linear infinite',
              }} />
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          Don&apos;t have a key?{' '}
          <a href="https://fabriclayer.dev" target="_blank">Get started</a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
