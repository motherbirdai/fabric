'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { FabricLogo } from '@/components/layout/FabricLogo';
import { Menu } from 'lucide-react';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace('/');
    }
  }, [loading, authenticated, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--blue)',
          borderRadius: '50%',
          animation: 'spin .6s linear infinite',
        }} />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="dashboard">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="main">
        <div className="mobile-header">
          <div className="mobile-header-logo">
            <FabricLogo style={{ height: '30px', width: 'auto' }} />
          </div>
          <button className="mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
