'use client';
import CrmLayout from '@/app/components/CrmLayout';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { useState } from 'react';
import { Users, Plus, Search, ChevronRight, Building2, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const [search, setSearch] = useState('');

  const filtered = (customers as any[]).filter(c => {
    const q = search.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.companyName?.toLowerCase().includes(q)
    );
  });

  return (
    <CrmLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">{(customers as any[]).length} total</p>
          </div>
          <Link href="/customers/new">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 rounded-lg text-sm font-medium text-white hover:bg-blue-800 transition-colors">
              <Plus className="h-4 w-4" /> New Client
            </button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                {search ? 'No clients match your search' : 'No clients yet'}
              </p>
              {!search && (
                <Link href="/customers/new" className="mt-3 text-sm text-blue-600 hover:underline">
                  Add your first client →
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_120px_40px] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span>Name</span>
                <span>Contact</span>
                <span>Company</span>
                <span>Properties</span>
                <span />
              </div>

              <div className="divide-y divide-gray-50">
                {filtered.map((c: any) => (
                  <Link key={c.id} href={`/customers/${c.id}`}>
                    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_1fr_120px_40px] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      {/* Name + avatar */}
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-blue-700">
                            {c.firstName?.[0]}{c.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                          {c.companyName && (
                            <p className="text-xs text-gray-400 md:hidden">{c.companyName}</p>
                          )}
                          {(c.email || c.phone) && (
                            <p className="text-xs text-gray-400 md:hidden">{c.email ?? c.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="hidden md:block space-y-0.5">
                        {c.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </p>
                        )}
                        {c.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                            {c.phone}
                          </p>
                        )}
                        {!c.email && !c.phone && <p className="text-sm text-gray-300">—</p>}
                      </div>

                      {/* Company */}
                      <div className="hidden md:block">
                        {c.companyName ? (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                            {c.companyName}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-300">—</p>
                        )}
                      </div>

                      {/* Properties count */}
                      <div className="hidden md:block">
                        <span className="text-sm text-gray-500">
                          {c.properties?.length ?? 0} {(c.properties?.length ?? 0) === 1 ? 'property' : 'properties'}
                        </span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-300 justify-self-end" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </CrmLayout>
  );
}
