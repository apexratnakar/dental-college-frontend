import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StoreVendor } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import { digitsOnly, mobileField, mobileInputProps } from '../../utils/validation';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_person: z.string().optional(),
  phone: mobileField,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_ifsc: z.string().optional(),
  payment_terms: z.string().optional(),
  is_active: z.boolean(),
  remarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function StoreVendorsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<StoreVendor | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StoreVendor[]; total: number }>({
    queryKey: ['store-vendors', search],
    queryFn: () => storeApi.listVendors({ search: search || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });
  const phoneReg = register('phone');

  const saveMutation = useMutation({
    mutationFn: (d: FormData) => editItem ? storeApi.updateVendor(editItem.id, d) : storeApi.createVendor(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-vendors'] }); closeModal(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeApi.deleteVendor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-vendors'] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); reset({ is_active: true }); setError(''); setShowModal(true); }
  function openEdit(v: StoreVendor) {
    setEditItem(v);
    reset({ name: v.name, contact_person: v.contact_person ?? '', phone: v.phone ?? '', email: v.email ?? '', address: v.address ?? '', gst_number: v.gst_number ?? '', pan_number: v.pan_number ?? '', bank_name: v.bank_name ?? '', bank_account: v.bank_account ?? '', bank_ifsc: v.bank_ifsc ?? '', payment_terms: v.payment_terms ?? '', is_active: v.is_active, remarks: v.remarks ?? '' });
    setError(''); setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditItem(null); }

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Vendors" subtitle="Manage supplier directory" />
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Contact Person</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">GST #</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.contact_person ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.gst_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="text-slate-500 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(v.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No vendors found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editItem ? 'Edit Vendor' : 'Add Vendor'}</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input {...register('name')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label><input {...register('contact_person')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    {...phoneReg}
                    {...mobileInputProps}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    onChange={(e) => phoneReg.onChange(digitsOnly(e))}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" {...register('email')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><textarea {...register('address')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label><input {...register('gst_number')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label><input {...register('pan_number')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label><input {...register('bank_name')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Account #</label><input {...register('bank_account')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label><input {...register('bank_ifsc')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label><input {...register('payment_terms')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label><textarea {...register('remarks')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="vendor_active" {...register('is_active')} className="rounded" /><label htmlFor="vendor_active" className="text-sm text-slate-700">Active</label></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteId !== null} title="Delete Vendor" message="Delete this vendor?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
