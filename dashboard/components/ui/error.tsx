'use client';

import { AlertTriangle } from 'lucide-react';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
      <div className="empty-state">
        <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: 'var(--red)', opacity: 0.5 }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-2)' }}>
          Something went wrong
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '360px', margin: '0 auto' }}>
          {message || 'Failed to load data. Please try again.'}
        </p>
        {onRetry && (
          <button
            className="btn-sm"
            style={{ marginTop: '16px', padding: '8px 20px', fontSize: '13px' }}
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
