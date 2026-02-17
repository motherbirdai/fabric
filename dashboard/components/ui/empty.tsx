'use client';

import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description }: EmptyStateProps) {
  return (
    <div className="card">
      <div className="empty-state">
        <Icon size={48} style={{ margin: '0 auto 16px', color: 'var(--text-3)', opacity: 0.4 }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-2)' }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '360px', margin: '0 auto' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
