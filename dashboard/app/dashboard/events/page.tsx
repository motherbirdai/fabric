'use client';

import { useState, useMemo } from 'react';
import { Activity, Pause, Play, Download, Trash2 } from 'lucide-react';
import { useTitle, useEventStream } from '@/lib/hooks';
import type { GatewayEvent } from '@/lib/hooks';

const FILTER_TYPES = [
  { label: 'All events', value: '' },
  { label: 'Routes', value: 'route' },
  { label: 'Failures', value: 'failure' },
  { label: 'Trust updates', value: 'trust' },
  { label: 'Budget warnings', value: 'budget' },
  { label: 'Registrations', value: 'registration' },
  { label: 'Overages', value: 'overage' },
  { label: 'Wallet funding', value: 'wallet' },
];

function eventColor(type: string): string {
  if (type.includes('fail') || type.includes('error')) return 'var(--red)';
  if (type.includes('budget') || type.includes('warn')) return 'var(--amber)';
  if (type.includes('trust')) return 'var(--blue)';
  if (type.includes('route') || type.includes('success')) return 'var(--green)';
  return 'var(--text-3)';
}

function formatTime(ts?: string): string {
  if (!ts) return 'now';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

export default function EventsPage() {
  useTitle('Events');
  const { events, connected, error, clear, pause, resume, paused } = useEventStream();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return events;
    return events.filter((e) => e.type.toLowerCase().includes(filter));
  }, [events, filter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FILTER_TYPES.forEach((f) => {
      if (!f.value) {
        counts[''] = events.length;
      } else {
        counts[f.value] = events.filter((e) => e.type.toLowerCase().includes(f.value)).length;
      }
    });
    return counts;
  }, [events]);

  const handleExport = () => {
    const text = JSON.stringify(events, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fabric-events-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="flex items-center gap-2">
            Events
            <span className="inline-block rounded-full" style={{ width: '8px', height: '8px', background: connected ? 'var(--green)' : 'var(--red)' }} />
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Real-time gateway events via SSE · {events.length} events buffered
            {paused && ' · Paused'}
            {error && ` · ${error}`}
          </p>
        </div>
        <div className="header-actions events-actions">
          <button
            className="btn-sm flex items-center justify-center"
            style={{ padding: '7px 12px', height: '36px' }}
            title={paused ? 'Resume stream' : 'Pause stream'}
            onClick={paused ? resume : pause}
          >
            {paused ? <Play size={16} strokeWidth={1.5} /> : <Pause size={16} strokeWidth={1.5} />}
          </button>
          <button className="btn-sm flex items-center justify-center" style={{ padding: '7px 12px', height: '36px' }} title="Export events" onClick={handleExport}>
            <Download size={16} strokeWidth={1.5} />
          </button>
          <button className="btn-sm flex items-center justify-center" style={{ padding: '7px 12px', height: '36px' }} title="Clear events" onClick={clear}>
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: '20px' }}>
          {FILTER_TYPES.map((f) => (
            <button
              key={f.value}
              className={`event-filter ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label} {filterCounts[f.value] || 0}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Activity size={48} style={{ margin: '0 auto 16px', color: 'var(--text-3)', opacity: 0.4 }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-2)' }}>
                {connected ? 'Waiting for events...' : 'Not connected to gateway'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '360px', margin: '0 auto' }}>
                {connected ? 'Events will appear here in real time.' : 'Check that the gateway is running and accessible.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filtered.map((evt: GatewayEvent, i: number) => (
                <div key={evt.id || i} className="setting-row" style={{ padding: '10px 24px' }}>
                  <div className="flex items-center gap-[10px]" style={{ minWidth: 0 }}>
                    <span className="flex-shrink-0 rounded-full" style={{ width: '8px', height: '8px', background: eventColor(evt.type) }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                      {formatTime(evt.timestamp)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: eventColor(evt.type), flexShrink: 0 }}>
                      {evt.type}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
