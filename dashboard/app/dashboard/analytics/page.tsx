'use client';

export default function AnalyticsPage() {
  return (
    <div>
      <div style={{ padding: '28px 36px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.8px' }}>Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Usage metrics and performance data</p>
      </div>
      <div className="animate-fade-in" style={{ padding: '24px 36px 48px' }}>
        <div className="stat-grid">
          {[
            { label: 'Requests (24h)', value: '47', color: 'var(--blue)', sub: '↑ 12% vs yesterday' },
            { label: 'Avg Latency', value: '238ms', sub: 'p50: 180ms · p99: 420ms' },
            { label: 'Success Rate', value: '97.8%', color: 'var(--green)', sub: '1 failure in 47 requests' },
            { label: 'Total Spend (24h)', value: '$0.14', sub: 'provider cost + routing fees' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.5px', color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-2 gap-5" style={{ marginTop: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3>Requests (7d)</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Daily volume</span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <svg viewBox="0 0 420 160" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1="40" y1="10" x2="410" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="47" x2="410" y2="47" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="84" x2="410" y2="84" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="120" x2="410" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x="32" y="14" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">60</text>
                <text x="32" y="50" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">40</text>
                <text x="32" y="88" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">20</text>
                <text x="32" y="124" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">0</text>
                <path d="M40,120 L93,98 L146,84 L199,72 L252,55 L305,38 L358,30 L410,22 L410,120 Z" fill="var(--blue)" opacity="0.08"/>
                <polyline points="40,98 93,84 146,72 199,60 252,42 305,30 358,24 410,18" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                {[{x:40,y:98},{x:93,y:84},{x:146,y:72},{x:199,y:60},{x:252,y:42},{x:305,y:30},{x:358,y:24}].map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--blue)"/>)}
                <circle cx="410" cy="18" r="3.5" fill="var(--blue)" stroke="var(--card)" strokeWidth="2"/>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => <text key={d} x={40+i*52.86} y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">{d}</text>)}
                <text x="410" y="140" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">Today</text>
              </svg>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Success Rate (7d)</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>97.8% avg</span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <svg viewBox="0 0 420 160" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1="40" y1="10" x2="410" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="47" x2="410" y2="47" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="84" x2="410" y2="84" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="40" y1="120" x2="410" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x="32" y="14" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">100%</text>
                <text x="32" y="50" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">97%</text>
                <text x="32" y="88" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">94%</text>
                <text x="32" y="124" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">90%</text>
                <path d="M40,10 L93,10 L146,14 L199,10 L252,18 L305,10 L358,30 L410,25 L410,120 L40,120 Z" fill="var(--green)" opacity="0.06"/>
                <polyline points="40,10 93,10 146,14 199,10 252,18 305,10 358,30 410,25" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                {[{x:40,y:10},{x:93,y:10},{x:146,y:14},{x:199,y:10},{x:252,y:18},{x:305,y:10}].map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--green)"/>)}
                <circle cx="358" cy="30" r="3.5" fill="var(--red)" stroke="var(--card)" strokeWidth="2"/>
                <circle cx="410" cy="25" r="3.5" fill="var(--green)" stroke="var(--card)" strokeWidth="2"/>
                <line x1="358" y1="30" x2="358" y2="50" stroke="var(--red)" strokeWidth="0.5" strokeDasharray="2,2"/>
                <text x="358" y="62" textAnchor="middle" fill="var(--red)" fontFamily="var(--font-mono)" fontSize="8">95.2%</text>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => <text key={d} x={40+i*52.86} y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">{d}</text>)}
                <text x="410" y="140" textAnchor="middle" fill="var(--green)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">Today</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Latency Distribution */}
          <div className="card">
            <div className="card-header">
              <h3>Latency Distribution</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Percentiles (ms)</span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <svg viewBox="0 0 420 160" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1="60" y1="10" x2="410" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="60" y1="45" x2="410" y2="45" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="60" y1="80" x2="410" y2="80" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <line x1="60" y1="115" x2="410" y2="115" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x="52" y="14" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">500ms</text>
                <text x="52" y="49" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">350ms</text>
                <text x="52" y="84" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">200ms</text>
                <text x="52" y="119" textAnchor="end" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">50ms</text>
                <rect x="90" y="75" width="55" height="40" rx="4" fill="var(--blue)" opacity="0.2"/>
                <rect x="175" y="60" width="55" height="55" rx="4" fill="var(--blue)" opacity="0.4"/>
                <rect x="260" y="40" width="55" height="75" rx="4" fill="var(--blue)" opacity="0.7"/>
                <rect x="345" y="15" width="55" height="100" rx="4" fill="var(--blue)"/>
                <text x="117" y="70" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">142ms</text>
                <text x="202" y="55" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">180ms</text>
                <text x="287" y="35" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">280ms</text>
                <text x="372" y="10" textAnchor="middle" fill="var(--blue)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">420ms</text>
                <text x="117" y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="10">p50</text>
                <text x="202" y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="10">p75</text>
                <text x="287" y="140" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="10">p90</text>
                <text x="372" y="140" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">p99</text>
              </svg>
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3>Provider Breakdown</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Last 7 days</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '28px' }}>
              <svg viewBox="0 0 140 140" style={{ width: '140px', height: '140px', flexShrink: 0 }}>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--blue)" strokeWidth="16" strokeDasharray="339.29 100" strokeDashoffset="0" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--pink)" strokeWidth="16" strokeDasharray="50.89 388.4" strokeDashoffset="-339.29" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--green)" strokeWidth="16" strokeDasharray="27.14 412.15" strokeDashoffset="-390.18" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--amber)" strokeWidth="16" strokeDasharray="16.96 422.33" strokeDashoffset="-417.32" transform="rotate(-90 70 70)"/>
                <text x="70" y="65" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-sans)" fontSize="20" fontWeight="700">287</text>
                <text x="70" y="82" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--font-mono)" fontSize="9">REQUESTS</text>
              </svg>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'Brave Web Search', pct: '72%', color: 'var(--blue)' },
                  { name: 'Tavily', pct: '15%', color: 'var(--pink)' },
                  { name: 'Firecrawl', pct: '8%', color: 'var(--green)' },
                  { name: 'CoinGecko', pct: '5%', color: 'var(--amber)' },
                ].map((p) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', flex: 1 }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)' }}>{p.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Requests by Endpoint */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Requests by Endpoint</h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Last 24 hours</span>
          </div>
          <div className="card-body-flush">
            {[
              { endpoint: 'POST /v1/route', desc: 'Primary routing endpoint', pct: 85, count: 40 },
              { endpoint: 'GET /v1/discover', desc: 'Provider discovery', pct: 12, count: 5 },
              { endpoint: 'GET /v1/evaluate/:id', desc: 'Trust evaluation', pct: 4, count: 2 },
            ].map((r) => (
              <div key={r.endpoint} className="setting-row">
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{r.endpoint}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{r.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: '360px', height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--blue)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', minWidth: '30px', textAlign: 'right' }}>{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Recent Requests</h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Last 10</span>
          </div>
          <div className="card-body-flush" style={{ fontSize: '13px' }}>
            {[
              { time: '2 min ago', method: 'POST /v1/route', target: '→ Brave', latency: '210ms', status: '200', ok: true },
              { time: '18 min ago', method: 'POST /v1/route', target: '→ Brave', latency: '195ms', status: '200', ok: true },
              { time: '1h ago', method: 'POST /v1/route', target: '→ Tavily', latency: '—', status: '502', ok: false },
              { time: '1h ago', method: 'POST /v1/route', target: '→ Brave', latency: '240ms', status: '200', ok: true },
              { time: '2h ago', method: 'GET /v1/discover', target: 'category=search', latency: '45ms', status: '200', ok: true },
            ].map((r, i) => (
              <div key={i} className="setting-row">
                <div className="flex items-center gap-[10px]">
                  <span className="flex-shrink-0 rounded-full" style={{ width: '8px', height: '8px', background: r.ok ? 'var(--green)' : 'var(--red)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)' }}>{r.time}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{r.method}</span>
                </div>
                <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{r.target}</span>
                  <span>{r.latency}</span>
                  <span style={{ color: r.ok ? 'var(--green)' : 'var(--red)' }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
