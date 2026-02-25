'use client';
import CrmLayout from '@/app/components/CrmLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, X, Check, Mail, Phone, Building2,
  MapPin, Briefcase, FileText, DollarSign, StickyNote,
} from 'lucide-react';
import Link from 'next/link';

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: any) => customersApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['customers', id], updated);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditing(false);
    },
  });

  const { mutate: deactivate, isPending: deactivating } = useMutation({
    mutationFn: () => customersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
  });

  const startEditing = () => {
    setForm({
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      companyName: customer.companyName ?? '',
      notes: customer.notes ?? '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, (v as string).trim() || undefined])
    );
    save(payload);
  };

  const field = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev: any) => ({ ...prev, [key]: e.target.value }));

  if (isLoading) {
    return (
      <CrmLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
      </CrmLayout>
    );
  }

  if (error || !customer) {
    return (
      <CrmLayout>
        <div className="p-6">
          <p className="text-red-500 text-sm">Client not found.</p>
          <Link href="/customers" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Clients
          </Link>
        </div>
      </CrmLayout>
    );
  }

  const c = customer as any;

  return (
    <CrmLayout>
      <div className="p-6 max-w-4xl space-y-6">
        {/* Back */}
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-blue-700">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </span>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={form.firstName}
                      onChange={field('firstName')}
                      placeholder="First name"
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                    />
                    <input
                      value={form.lastName}
                      onChange={field('lastName')}
                      placeholder="Last name"
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                    />
                  </div>
                  <input
                    value={form.companyName}
                    onChange={field('companyName')}
                    placeholder="Company (optional)"
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
                  {c.companyName && (
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="h-3.5 w-3.5" /> {c.companyName}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: contact + notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Contact Info</h2>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={field('email')}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={field('phone')}
                        placeholder="(555) 000-0000"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow icon={Mail} label="Email" value={c.email} />
                  <InfoRow icon={Phone} label="Phone" value={c.phone} />
                  {!c.email && !c.phone && (
                    <p className="text-sm text-gray-400">No contact info on file.</p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Notes</h2>
              {editing ? (
                <textarea
                  value={form.notes}
                  onChange={field('notes')}
                  rows={4}
                  placeholder="Add notes about this client..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              ) : c.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.notes}</p>
              ) : (
                <p className="text-sm text-gray-400">No notes.</p>
              )}
            </div>

            {/* Properties */}
            {c.properties?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Properties</h2>
                <div className="space-y-2">
                  {c.properties.map((p: any) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.address}</p>
                        <p className="text-xs text-gray-500">{p.city}, {p.state} {p.zip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: stats + actions */}
          <div className="space-y-6">
            {/* Activity summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatBadge label="Jobs" count={c.jobs?.length ?? 0} color="border-blue-100" />
                <StatBadge label="Quotes" count={c.quotes?.length ?? 0} color="border-purple-100" />
                <StatBadge label="Invoices" count={c.invoices?.length ?? 0} color="border-green-100" />
                <StatBadge label="Properties" count={c.properties?.length ?? 0} color="border-gray-100" />
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'New Job', href: `/jobs/new?customerId=${c.id}`, icon: Briefcase },
                  { label: 'New Quote', href: `/quotes/new?customerId=${c.id}`, icon: FileText },
                  { label: 'New Invoice', href: `/invoices/new?customerId=${c.id}`, icon: DollarSign },
                  { label: 'Add Note', href: `/customers/${c.id}/notes/new`, icon: StickyNote },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                      <item.icon className="h-4 w-4 text-gray-400" />
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Danger Zone</h2>
              <button
                onClick={() => {
                  if (confirm(`Archive ${c.firstName} ${c.lastName}? They will no longer appear in your client list.`)) {
                    deactivate();
                  }
                }}
                disabled={deactivating}
                className="w-full px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deactivating ? 'Archiving...' : 'Archive Client'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
}
