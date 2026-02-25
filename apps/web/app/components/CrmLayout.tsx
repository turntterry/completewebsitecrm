'use client';
import { cn } from '@/lib/utils';
import {
  Home, Calendar, Users, Zap, ClipboardList, FileText,
  Briefcase, DollarSign, BarChart3, Settings, Menu, X, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, ReactNode } from 'react';

const navItems = [
  { label: 'Home',      href: '/',          icon: Home },
  { label: 'Schedule',  href: '/schedule',  icon: Calendar },
  { label: 'Clients',   href: '/customers', icon: Users },
  { label: 'Requests',  href: '/requests',  icon: ClipboardList },
  { label: 'Quotes',    href: '/quotes',    icon: FileText },
  { label: 'Jobs',      href: '/jobs',      icon: Briefcase },
  { label: 'Invoices',  href: '/invoices',  icon: DollarSign },
  { label: 'Insights',  href: '/insights',  icon: BarChart3 },
  { label: 'Settings',  href: '/settings',  icon: Settings },
];

function NavLink({ item, collapsed }: { item: typeof navItems[0]; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <Link href={item.href}>
      <span className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
        isActive
          ? 'bg-blue-700 text-white'
          : 'text-blue-100 hover:bg-blue-700/60 hover:text-white'
      )}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </span>
    </Link>
  );
}

export default function CrmLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-blue-700">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">EE</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-semibold text-sm">Exterior Experts</p>
            <p className="text-blue-300 text-xs">CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="px-3 py-4 border-t border-blue-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-blue-200 hover:text-white hover:bg-blue-700/60 transition-colors w-full text-sm"
        >
          <Menu className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-blue-800 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}>
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-56 h-full bg-blue-800 flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-blue-200 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-blue-800 border-b border-blue-700">
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-white font-semibold text-sm">Exterior Experts CRM</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
