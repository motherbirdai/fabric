'use client';

import { useState } from 'react';
import { Activity, Filter, Trash2, Download, Pause, Play } from 'lucide-react';
import { useEvents, FabricEvent } from '@/lib/events';

const EVENT_TYPES = [
  { id: '*', label: 'All events' },
  { id: 'route.completed', label: 'Routes' },
  { id: 'route.failed', label: 'Failures' },
  { id: 'trust.updated', label: 'Trust updates' },
  { id: 'budget.warning', label: 'Budget warnings' },
  { id: 'provider.registered', label: 'Registrations' },
  { id: 'overage.triggered', label: 'Overages' },
  { id: 'wallet.funded', label: 'Wallet funding' },
];

const TYPE_COLORS: Record<string, string> = {
  'route.completed': 'bg-green-100 text-green-700',
  'route.failed': 'bg-red-100 text-red-700',
  'trust.updated': 'bg-blue-100 text-blue-700',
  'budget.warning': 'bg-yellow-100 text-yellow-700',
  'budget.exceeded': 'bg-red-100 text-red-700',
  'provider.registered': 'bg-purple-100 text-purple-700',
  'overage.triggered': 'bg-orange-100 text-orange-700',
  'wallet.funded': 'bg-green-100 text-green-700',
  'health.changed': 'bg-gray-100 text-gray-600',
};

export default function EventsPage() {
  const [filter, setFilter] = useState('*');
  const [paused, setPaused] = useState(false);
  const { connected, eventLog, clearLog } = useEvents({ maxBuffer: 500 });

  const filtered = filter === '*'
    ? eventLog
    : eventLog.filter((e) => e.type === filter);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fabric-events-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Events
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
          </h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">
            Real-time gateway events via WebSocket · {eventLog.length} events buffered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(!paused)}
            className="p-2 border border-fabric-gray-200 rounded-lg hover:bg-fabric-gray-50 transition-colors"
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={exportLog}
            disabled={filtered.length === 0}
            className="p-2 border border-fabric-gray-200 rounded-lg hover:bg-fabric-gray-50 disabled:opacity-40 transition-colors"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clearLog}
            disabled={eventLog.length === 0}
            className="p-2 border border-fabric-gray-200 rounded-lg hover:bg-fabric-gray-50 disabled:opacity-40 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EVENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              filter === t.id
                ? 'bg-fabric-gray-900 text-white'
                : 'bg-fabric-gray-100 text-fabric-gray-600 hover:bg-fabric-gray-200'
            }`}
          >
            {t.label}
            {t.id !== '*' && (
              <span className="ml-1 opacity-60">
                {eventLog.filter((e) => e.type === t.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event log */}
      <div className="metric-card p-0 overflow-hidden">
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-fabric-gray-400">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <div className="text-[13px]">{connected ? 'Waiting for events...' : 'Not connected to gateway'}</div>
                {!connected && (
                  <div className="text-[11px] mt-1">Check that the gateway is running</div>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-fabric-gray-50 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-fabric-gray-500">
                  <th className="text-left px-4 py-2 w-36">Time</th>
                  <th className="text-left px-4 py-2 w-40">Type</th>
                  <th className="text-left px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, i) => (
                  <tr
                    key={`${event.timestamp}-${i}`}
                    className="border-t border-fabric-gray-100 hover:bg-fabric-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-[11px] text-fabric-gray-500 font-mono tabular-nums">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-600'}`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[11px] text-fabric-gray-700">
                      <code className="text-[10px] font-mono break-all">
                        {JSON.stringify(event.data)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
