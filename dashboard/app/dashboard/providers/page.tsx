'use client';

import Link from 'next/link';
import { useState } from 'react';

const PROVIDERS = [
  { id: 'deepl', name: 'DeepL Agent', score: '4.17', cat: 'Translation', catClass: 'cat-translation', desc: 'Neural machine translation with context awareness. 30+ languages.', price: '$0.001/token', latency: '400ms avg', uptime: '99.9% uptime', gradient: 'linear-gradient(135deg,#068cff,#0066cc)', letter: 'D' },
  { id: 'flux', name: 'Flux Pro', score: '4.06', cat: 'Image Generation', catClass: 'cat-image', desc: 'State-of-the-art image generation from text prompts.', price: '$0.02/request', latency: '1200ms avg', uptime: '99.8% uptime', gradient: 'linear-gradient(135deg,#fe83e0,#cc66b3)', letter: 'F' },
  { id: 'sentiment', name: 'Sentiment AI', score: '3.87', cat: 'Data Analysis', catClass: 'cat-data', desc: 'Real-time sentiment analysis across text, social, and news.', price: '$0.005/request', latency: '800ms avg', uptime: '97.8% uptime', gradient: 'linear-gradient(135deg,#ffab00,#cc8800)', letter: 'S' },
  { id: 'dalle', name: 'DALL·E 3', score: '3.79', cat: 'Image Generation', catClass: 'cat-image', desc: "OpenAI's latest image generation model with high fidelity.", price: '$0.04/request', latency: '2800ms avg', uptime: '99.5% uptime', gradient: 'linear-gradient(135deg,#fe83e0,#cc66b3)', letter: 'D' },
  { id: 'codex', name: 'Codex Review', score: '3.70', cat: 'Code Review', catClass: 'cat-code', desc: 'Automated code review with security analysis and suggestions.', price: '$0.003/token', latency: '3200ms avg', uptime: '99.2% uptime', gradient: 'linear-gradient(135deg,#00e5ff,#00b3cc)', letter: 'C' },
];

export default function ProvidersPage() {
  const [search, setSearch] = useState('');

  const filtered = PROVIDERS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between" style={{ padding: '28px 36px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Providers</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>AI services in the Fabric registry</p>
        </div>
        <Link href="/dashboard/register" className="btn-sm btn-primary-fixed" style={{ padding: '9px 20px', fontWeight: 600 }}>+ Register Provider</Link>
      </div>
      <div className="animate-fade-in" style={{ padding: '24px 36px 48px' }}>
        <div className="flex gap-[10px]" style={{ marginBottom: '20px' }}>
          <input
            className="flex-1"
            style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--card)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', color: 'var(--text)' }}
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px 18px' }}>Category ↓</button>
          <button className="btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px 18px' }}>Min Trust ↓</button>
        </div>

        <div className="provider-grid">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/providers/${p.id}`}
              className="block transition-colors cursor-pointer"
              style={{ background: 'var(--card)', padding: '24px' }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-[10px] text-[16px] font-bold text-white" style={{ width: '36px', height: '36px', background: p.gradient }}>{p.letter}</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.3px' }}>{p.name}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--green)', fontWeight: 500 }}>{p.score}</div>
              </div>
              <span className={`inline-block ${p.catClass} rounded-[5px]`} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.5px', padding: '3px 10px', textTransform: 'uppercase', marginBottom: '10px' }}>{p.cat}</span>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '14px' }}>{p.desc}</div>
              <div className="flex gap-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                <span>{p.price}</span>
                <span>{p.latency}</span>
                <span>{p.uptime}</span>
                <span className="inline-flex items-center gap-[5px]" style={{ color: 'var(--green)', letterSpacing: '.5px' }}>
                  <span className="inline-block w-[5px] h-[5px] rounded-full animate-live-pulse" style={{ background: 'var(--green)' }} />
                  LIVE
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
