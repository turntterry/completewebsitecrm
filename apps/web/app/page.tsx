'use client';
import CrmLayout from '@/app/components/CrmLayout';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import {
  Users, Briefcase, FileText, DollarSign,
  Plus, ArrowRight, Clock,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({ title, value, subtitle, icon: Icon, color, href }: {
  title: string; value: string | number; subtitle?: string;
  icon: any; color: string; href?: string;
}) {
  const card = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

export default function Home() {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <CrmLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{today}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/customers/new">
              <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Plus className="h-4 w-4" /> New Client
              </button>
            </Link>
            <Link href="/jobs/new">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 rounded-lg text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                <Plus className="h-4 w-4" /> New Job
              </button>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Clients" value={(customers as any[]).length} subtitle="Active clients" icon={Users} color="bg-blue-600" href="/customers" />
          <StatCard title="Active Jobs" value={0} subtitle="In progress" icon={Briefcase} color="bg-indigo-500" href="/jobs" />
          <StatCard title="Pending Quotes" value={0} subtitle="Awaiting approval" icon={FileText} color="bg-purple-500" href="/quotes" />
          <StatCard title="Outstanding" value="$0" subtitle="Unpaid invoices" icon={DollarSign} color="bg-green-500" href="/invoices" />
        </div>

        {/* Workflow strip (like Jobber) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Requests', sub: '0 new', href: '/requests', color: 'border-l-orange-400' },
            { label: 'Quotes', sub: '0 awaiting response', href: '/quotes', color: 'border-l-yellow-400' },
            { label: 'Jobs', sub: '0 requires invoicing', href: '/jobs', color: 'border-l-blue-400' },
            { label: 'Invoices', sub: '0 awaiting payment', href: '/invoices', color: 'border-l-green-400' },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <div className={`bg-white border border-gray-200 border-l-4 ${item.color} rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer`}>
                <p className="font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 font-medium">
                  View all <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Clients */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Clients</h2>
            <Link href="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(customers as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">No clients yet</p>
              <Link href="/customers/new" className="mt-3 text-sm text-blue-600 hover:underline">
                Add your first client →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(customers as any[]).slice(0, 5).map((c: any) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-blue-700">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-400">{c.email ?? c.phone ?? 'No contact info'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </CrmLayout>
  );
}