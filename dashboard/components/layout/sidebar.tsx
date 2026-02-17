'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { FabricLogo } from './FabricLogo';
import {
  LayoutGrid,
  Globe,
  Bot,
  BarChart3,
  PiggyBank,
  Activity,
  Plus,
  Wallet,
  Star,
  CreditCard,
  Key,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_DASHBOARD = [
  { label: 'Overview', href: '/dashboard', icon: LayoutGrid },
  { label: 'Providers', href: '/dashboard/providers', icon: Globe },
  { label: 'Agents', href: '/dashboard/agents', icon: Bot },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
  { label: 'Events', href: '/dashboard/events', icon: Activity },
] as const;

const NAV_ACCOUNT = [
  { label: 'Wallets', href: '/dashboard/wallets', icon: Wallet },
  { label: 'Favorites', href: '/dashboard/favorites', icon: Star },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
] as const;

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) ?? false;
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const newDark = !html.classList.contains('dark');
    if (newDark) {
      html.classList.add('dark');
      localStorage.setItem('fabric-theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('fabric-theme', 'light');
    }
    setIsDark(newDark);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-section-label" style={{ marginTop: 0, marginBottom: '4px' }}>
            Dashboard
          </div>

          {NAV_DASHBOARD.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`nav-item${isActive(href) ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}

          <div className="nav-divider" />

          <Link href="/dashboard/register" onClick={onClose} className="nav-cta">
            <Plus size={16} />
            Register Provider
          </Link>

          <div className="nav-section-label">Account</div>

          {NAV_ACCOUNT.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`nav-item${isActive(href) ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-branding">
          <FabricLogo />
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-row">
            <button className="sidebar-signout" onClick={handleLogout}>
              <LogOut size={16} />
              Sign out
            </button>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <div className="sidebar-version">v1.0 &middot; Base L2</div>
        </div>
      </aside>
    </>
  );
}
