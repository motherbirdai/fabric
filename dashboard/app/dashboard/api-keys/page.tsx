'use client';

import { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function ApiKeysPage() {
  const { apiKey } = useAuth();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 10)}${'•'.repeat(Math.max(0, apiKey.length - 14))}${apiKey.slice(-4)}`
    : '—';

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>API Keys</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Manage authentication keys for the Fabric gateway</p>
        </div>
      </div>

      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        {/* Current Session Key */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h3 className="flex items-center gap-2">
              <Key size={16} style={{ color: 'var(--text-3)' }} />
              Current Session Key
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--text)',
                background: 'var(--bg)',
                padding: '10px 16px',
                borderRadius: '8px',
                flex: '1 1 200px',
                minWidth: 0,
                letterSpacing: '.3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {revealed ? (apiKey || '—') : maskedKey}
              </code>
              <div className="apikey-actions">
                <button
                  className="apikey-icon-btn flex items-center justify-center"
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onClick={() => setRevealed(!revealed)}
                  title={revealed ? 'Hide key' : 'Reveal key'}
                >
                  {revealed ? (
                    <EyeOff size={15} style={{ color: 'var(--text-3)' }} />
                  ) : (
                    <Eye size={15} style={{ color: 'var(--text-3)' }} />
                  )}
                </button>
                <button
                  className="apikey-icon-btn flex items-center justify-center"
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onClick={handleCopy}
                  title="Copy key"
                >
                  {copied ? (
                    <Check size={15} style={{ color: 'var(--green)' }} />
                  ) : (
                    <Copy size={15} style={{ color: 'var(--text-3)' }} />
                  )}
                </button>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '12px' }}>
              This is the API key you used to log in. Key management (list, generate, revoke) is not yet available from the dashboard.
            </p>
          </div>
        </div>

        {/* Usage */}
        <div className="card">
          <div className="card-header">
            <h3>Usage</h3>
          </div>
          <div style={{ padding: '4px 0' }}>
            <div className="code-block">
              <div className="code-comment"># cURL</div>
              <div>
                curl <span className="code-string">https://your-gateway/v1/route</span> \
              </div>
              <div>
                {'  '}-H <span className="code-string">&quot;Authorization: Bearer {apiKey ? `${apiKey.slice(0, 10)}...` : 'fab_...'}&quot;</span> \
              </div>
              <div>
                {'  '}-H <span className="code-string">&quot;Content-Type: application/json&quot;</span> \
              </div>
              <div>
                {'  '}-d <span className="code-string">{"'{\"query\": \"translate hello to French\"}"}</span>&apos;
              </div>
            </div>

            <div className="code-block">
              <div className="code-comment">// Node.js / TypeScript</div>
              <div>
                <span style={{ color: 'var(--text-3)' }}>import</span> {'{ FabricClient }'} <span style={{ color: 'var(--text-3)' }}>from</span> <span className="code-string">&apos;@fabric/sdk&apos;</span>;
              </div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ color: 'var(--text-3)' }}>const</span> fabric = <span style={{ color: 'var(--text-3)' }}>new</span> FabricClient({'{'}&nbsp;
              </div>
              <div>
                {'  '}apiKey: <span className="code-string">&apos;{apiKey ? `${apiKey.slice(0, 10)}...` : 'fab_...'}&apos;</span>
              </div>
              <div>{'}'});</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ color: 'var(--text-3)' }}>const</span> result = <span style={{ color: 'var(--text-3)' }}>await</span> fabric.route({'{'}&nbsp;
              </div>
              <div>
                {'  '}query: <span className="code-string">&apos;translate hello to French&apos;</span>
              </div>
              <div>{'}'});</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
