'use client';

import { useState } from 'react';
import { Key, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';

const KEYS = [
  {
    id: '1',
    key: 'fab_sk_live_7f3a...c9d2',
    type: 'Live' as const,
    created: 'Mar 15',
    lastUsed: '2 min ago',
  },
  {
    id: '2',
    key: 'fab_sk_test_4b2e...8f1a',
    type: 'Test' as const,
    created: 'Mar 10',
    lastUsed: '1 day ago',
  },
];

export default function ApiKeysPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const SESSION_KEY_MASKED = 'fab_n5nL7gE2••••••••••••••••••yhVS';
  const SESSION_KEY_FULL = 'fab_n5nL7gE2xKm9RtWpQ4vBhJsYcN3dFa8eU6iOlZyhVS';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header-bar">
        <div>
          <h1>API Keys</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Manage authentication keys for the Fabric gateway</p>
        </div>
        <div className="header-actions">
          <button className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }}>+ Generate Key</button>
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                <code style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--text)',
                  background: 'var(--bg)',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  flex: 1,
                  letterSpacing: '.3px',
                }}>
                  {revealed ? SESSION_KEY_FULL : SESSION_KEY_MASKED}
                </code>
                <button
                  className="flex items-center justify-center"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    flexShrink: 0,
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
                  className="flex items-center justify-center"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    flexShrink: 0,
                  }}
                  onClick={() => handleCopy(SESSION_KEY_FULL, 'session')}
                  title="Copy key"
                >
                  {copied === 'session' ? (
                    <Check size={15} style={{ color: 'var(--green)' }} />
                  ) : (
                    <Copy size={15} style={{ color: 'var(--text-3)' }} />
                  )}
                </button>
              </div>
              <button className="btn-sm flex items-center gap-2" style={{ fontSize: '12px', padding: '7px 16px', flexShrink: 0 }}>
                <RefreshCw size={13} />
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* All Keys */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h3>All Keys</h3>
          </div>
          <div className="card-body-flush">
            {KEYS.map((k) => (
              <div key={k.id} className="setting-row">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: k.type === 'Live' ? 'var(--green-subtle)' : 'var(--amber-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <Key size={16} style={{ color: k.type === 'Live' ? 'var(--green)' : 'var(--amber)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '.3px' }}>{k.key}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '.3px',
                          color: k.type === 'Live' ? 'var(--green)' : 'var(--amber)',
                          background: k.type === 'Live' ? 'var(--green-subtle)' : 'var(--amber-subtle)',
                        }}
                      >
                        {k.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                      Created {k.created} &middot; Last used {k.lastUsed}
                    </div>
                  </div>
                </div>
                <button className="btn-sm btn-sm-danger" style={{
                  fontSize: '12px',
                  padding: '5px 14px',
                  background: 'var(--card)',
                  border: '1px solid rgba(239,68,68,.2)',
                  borderRadius: '8px',
                  color: 'var(--red)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Usage */}
        <div className="card">
          <div className="card-header">
            <h3>Usage</h3>
          </div>
          <div style={{ padding: '4px 0' }}>
            {/* cURL example */}
            <div className="code-block">
              <div className="code-comment"># cURL</div>
              <div>
                curl <span className="code-string">https://gateway.fabric.dev/v1/route</span> \
              </div>
              <div>
                {'  '}-H <span className="code-string">&quot;x-api-key: fab_sk_live_7f3a...c9d2&quot;</span> \
              </div>
              <div>
                {'  '}-H <span className="code-string">&quot;Content-Type: application/json&quot;</span> \
              </div>
              <div>
                {'  '}-d <span className="code-string">{"'{\"query\": \"translate hello to French\"}"}</span>&apos;
              </div>
            </div>

            {/* Node.js / TypeScript example */}
            <div className="code-block">
              <div className="code-comment">// Node.js / TypeScript</div>
              <div>
                <span style={{ color: 'var(--text-3)' }}>import</span> {'{ FabricClient }'} <span style={{ color: 'var(--text-3)' }}>from</span> <span className="code-string">&apos;@fabric/sdk&apos;</span>;
              </div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ color: 'var(--text-3)' }}>const</span> fabric = <span style={{ color: 'var(--text-3)' }}>new</span> FabricClient({'{'}&nbsp;
              </div>
              <div>
                {'  '}apiKey: <span className="code-string">&apos;fab_sk_live_7f3a...c9d2&apos;</span>
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
