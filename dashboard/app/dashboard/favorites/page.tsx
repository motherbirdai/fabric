'use client';

import { Star } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <div>
      <div style={{ padding: 'clamp(20px, 5vw, 28px) clamp(16px, 4vw, 36px)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Favorites</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Preferred providers get priority in routing decisions</p>
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        <div className="card">
          <div className="card-header"><h3>Preferred Providers</h3></div>
          <div className="card-body-flush">
            {[
              { name: 'Brave Web Search', cat: 'Search', trust: '0.92', days: '2' },
              { name: 'Firecrawl', cat: 'Data Analysis', trust: '0.87', days: '4' },
            ].map((f) => (
              <div key={f.name} className="setting-row">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg" style={{ width: '36px', height: '36px', background: 'var(--blue-subtle)' }}>
                    <Star size={18} style={{ color: 'var(--blue)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px' }}>{f.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{f.cat} · Trust: {f.trust} · Added {f.days} days ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)' }}>+15% boost</span>
                  <button className="btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><h3>How Favorites Work</h3></div>
          <div className="card-body-flush">
            <div style={{ padding: '16px', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 }}>
              When you favorite a provider, they receive a <strong>+15% boost</strong> in trust score during routing. This means your agents will prefer these providers when multiple options are available for the same category. You can favorite providers from the Providers page or via the <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'rgba(6,140,255,.06)', color: 'var(--blue)', padding: '1px 5px', borderRadius: '4px' }}>POST /v1/favorites</span> API endpoint.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
