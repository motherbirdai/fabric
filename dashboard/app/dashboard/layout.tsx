'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace('/login');
    }
  }, [loading, authenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fabric-gray-50">
        <div className="w-5 h-5 border-2 border-fabric-green/30 border-t-fabric-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex min-h-screen bg-fabric-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
