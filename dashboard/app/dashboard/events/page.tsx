'use client';

import { Activity, Pause, Download, Trash2 } from 'lucide-react';

const FILTERS = ['All events', 'Routes 0', 'Failures 0', 'Trust updates 0', 'Budget warnings 0', 'Registrations 0', 'Overages 0', 'Wallet funding 0'];

export default function EventsPage() {
  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="flex items-center gap-2">
            Events
            <span className="inline-block rounded-full" style={{ width: '8px', height: '8px', background: 'var(--red)' }} />
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Real-time gateway events via WebSocket · 0 events buffered</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-sm flex items-center justify-center" style={{ padding: '7px 12px', width: '42px', height: '42px' }} title="Pause stream"><Pause size={21} /></button>
          <button className="btn-sm flex items-center justify-center" style={{ padding: '7px 12px', width: '42px', height: '42px' }} title="Export events"><Download size={21} /></button>
          <button className="btn-sm flex items-center justify-center" style={{ padding: '7px 12px', width: '42px', height: '42px' }} title="Clear events"><Trash2 size={21} /></button>
        </div>
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: '20px' }}>
          {FILTERS.map((f, i) => (
            <button key={f} className={`event-filter ${i === 0 ? 'active' : ''}`}>{f}</button>
          ))}
        </div>
        <div className="card">
          <div className="empty-state">
            <Activity size={48} style={{ margin: '0 auto 16px', color: 'var(--text-3)', opacity: 0.4 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-2)' }}>Not connected to gateway</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '360px', margin: '0 auto' }}>Check that the gateway is running</p>
          </div>
        </div>
      </div>
    </div>
  );
}
