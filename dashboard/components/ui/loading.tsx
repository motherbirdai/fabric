'use client';

export function StatGridSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton" style={{ width: '80px', height: '10px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '60px', height: '22px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '100px', height: '10px' }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="skeleton" style={{ width: '120px', height: '16px' }} />
      </div>
      <div className="card-body-flush">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="setting-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div>
                <div className="skeleton" style={{ width: '140px', height: '14px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '200px', height: '10px' }} />
              </div>
            </div>
            <div className="skeleton" style={{ width: '80px', height: '14px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-fade-in" style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 36px) 48px' }}>
      <StatGridSkeleton />
      <div style={{ marginTop: '20px' }}>
        <CardSkeleton />
      </div>
    </div>
  );
}
