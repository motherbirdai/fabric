'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  Wallet,
  Key,
  CreditCard,
  Globe,
  Plus,
  LogOut,
  Shield,
  Activity,
  Settings,
} from 'lucide-react';

const NAV_MAIN = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Providers', href: '/dashboard/providers', icon: Globe },
  { label: 'Agents', href: '/dashboard/agents', icon: Bot },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Budgets', href: '/dashboard/budgets', icon: Wallet },
  { label: 'Events', href: '/dashboard/events', icon: Activity },
] as const;

const NAV_ACCOUNT = [
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'API Keys', href: '/dashboard/keys', icon: Key },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
] as const;

function NavItem({ href, icon: Icon, label, active }: {
  href: string; icon: any; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
        active
          ? 'bg-fabric-gray-800 text-white'
          : 'hover:bg-fabric-gray-800/50 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));

  return (
    <aside className="w-56 min-h-screen bg-fabric-gray-900 text-fabric-gray-400 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-fabric-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-fabric-blue rounded-md flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">fabric</span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {NAV_MAIN.map(({ label, href, icon }) => (
            <NavItem key={href} href={href} icon={icon} label={label} active={!!isActive(href)} />
          ))}
        </div>

        <div className="my-4 mx-3 border-t border-fabric-gray-800" />

        {/* Provider onboarding */}
        <Link
          href="/dashboard/providers/register"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-fabric-blue hover:bg-fabric-gray-800/50 transition-colors mb-4"
        >
          <Plus className="w-4 h-4" />
          Register Provider
        </Link>

        {/* Account nav */}
        <div className="text-[10px] uppercase tracking-widest text-fabric-gray-600 px-3 mb-2">
          Account
        </div>
        <div className="space-y-1">
          {NAV_ACCOUNT.map(({ label, href, icon }) => (
            <NavItem key={href} href={href} icon={icon} label={label} active={!!isActive(href)} />
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] w-full hover:bg-fabric-gray-800/50 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <div className="px-5 py-3 border-t border-fabric-gray-800 text-[10px] text-fabric-gray-600">
        Fabric v1.0 · Base L2
      </div>
    </aside>
  );
}
