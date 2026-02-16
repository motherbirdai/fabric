'use client';

import { Zap, Shield, Wallet, AlertTriangle, Globe, Activity, ChevronDown, Trash2 } from 'lucide-react';
import { useEvents, FabricEvent } from '@/lib/events';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'route.completed': <Zap className="w-3.5 h-3.5 text-green-500" />,
  'route.failed': <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  'trust.updated': <Shield className="w-3.5 h-3.5 text-fabric-blue" />,
  'budget.warning': <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
  'budget.exceeded': <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  'provider.registered': <Globe className="w-3.5 h-3.5 text-purple-500" />,
  'overage.triggered': <Wallet className="w-3.5 h-3.5 text-yellow-600" />,
  'wallet.funded': <Wallet className="w-3.5 h-3.5 text-green-500" />,
  'health.changed': <Activity className="w-3.5 h-3.5 text-fabric-gray-500" />,
};

function formatEvent(event: FabricEvent): string {
  const d = event.data as any;
  switch (event.type) {
    case 'route.completed':
      return `Routed to ${d.providerName || d.providerId} — $${d.cost?.toFixed(4)} · ${d.latencyMs}ms`;
    case 'route.failed':
      return `Route failed: ${d.error} (${d.providerId})`;
    case 'trust.updated':
      return `${d.providerName} trust: ${d.oldScore?.toFixed(2)} → ${d.newScore?.toFixed(2)}`;
    case 'budget.warning':
      return `Budget "${d.label}" at ${d.pct?.toFixed(0)}% ($${d.spentUsd?.toFixed(2)}/$${d.limitUsd?.toFixed(2)})`;
    case 'budget.exceeded':
      return `Budget "${d.label}" exceeded! $${d.spentUsd?.toFixed(2)} > $${d.limitUsd?.toFixed(2)}`;
    case 'provider.registered':
      return `New provider: ${d.name} (${d.category})${d.txHash ? ' · on-chain' : ''}`;
    case 'overage.triggered':
      return `Overage: ${d.count} extra requests · $${d.costUsd?.toFixed(4)}`;
    case 'wallet.funded':
      return `Wallet funded: $${d.amount?.toFixed(2)} USDC → ${d.address?.slice(0, 8)}...`;
    case 'health.changed':
      return `${d.component}: ${d.status}${d.latencyMs ? ` (${d.latencyMs}ms)` : ''}`;
    default:
      return JSON.stringify(d);
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function EventFeed({ maxItems = 20 }: { maxItems?: number }) {
  const { connected, eventLog, clearLog } = useEvents({ maxBuffer: maxItems });

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Events
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-fabric-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          {eventLog.length > 0 && (
            <button
              onClick={clearLog}
              className="text-fabric-gray-400 hover:text-fabric-gray-600 transition-colors"
              title="Clear log"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {eventLog.length === 0 ? (
          <div className="text-[12px] text-fabric-gray-400 py-4 text-center">
            {connected ? 'Waiting for events...' : 'Not connected'}
          </div>
        ) : (
          eventLog.map((event, i) => (
            <div
              key={`${event.timestamp}-${i}`}
              className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-fabric-gray-50 transition-colors"
            >
              <div className="mt-0.5 flex-shrink-0">
                {EVENT_ICONS[event.type] || <Zap className="w-3.5 h-3.5 text-fabric-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-fabric-gray-900 leading-relaxed">
                  {formatEvent(event)}
                </div>
              </div>
              <div className="text-[10px] text-fabric-gray-400 flex-shrink-0 mt-0.5">
                {timeAgo(event.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function EventFeedCompact() {
  const { connected, lastEvent, eventLog } = useEvents({ maxBuffer: 5 });

  if (!lastEvent) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-fabric-gray-400">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
        {connected ? 'Listening for events' : 'Disconnected'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {eventLog.slice(0, 3).map((event, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          {EVENT_ICONS[event.type] || <Zap className="w-3 h-3 text-fabric-gray-400" />}
          <span className="text-fabric-gray-600 truncate">{formatEvent(event)}</span>
          <span className="text-fabric-gray-400 flex-shrink-0">{timeAgo(event.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}
