import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, UserCheck, UserX } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StoreAsset, AssetStatus, StoreLocation } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const assetSchema = z.object({
  name: z.string().min(1, 'Name required'),
  store_id: z.coerce.number().optional().nullable(),
  serial_number: z.string().optional(),
  make: z.string().optional(),
  model_number: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.coerce.number().optional().nullable(),
  warranty_expiry: z.string().optional(),
  amc_expiry: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['active','in_repair','disposed','lost','condemned']),
  remarks: z.string().optional(),
});
type AssetFormData = z.infer<typeof assetSchema>;

const assignSchema = z.object({ employee_id: z.coerce.number().min(1, 'Employee ID required'), notes: z.string().optional() });
type AssignData = z.infer<typeof assignSchema>;

const STATUS_COLORS: Record<AssetStatus, string> = {
  active: 'bg-green-100 text-green-700',
  in_repair: 'bg-amber-100 text-amber-700',
  disposed: 'bg-slate-100 text-slate-500',
  lost: 'bg-red-100 text-red-700',
  condemned: 'bg-red-100 text-red-600',
};

export function StoreAssetsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState<StoreAsset | null>(null);
  const [assignAsset, setAssignAsset] = useState<StoreAsset | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StoreAsset[] }>({
    queryKey: ['store-assets', statusFilter],
    queryFn: () => storeApi.listAssets({ status: statusFilter || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { data: storeData } = useQuery<{ items: StoreLocation[] }>({ queryKey: ['store-locations'], queryFn: () => storeApi.listStores({ per_page: 100 }).then((r) => r.data) });

  const assetForm = useForm<AssetFormData>({ resolver: zodResolver(assetSchema) as any, defaultValues: { status: 'active' } });
  const assignForm = useForm<AssignData>({ resolver: zodResolver(assignSchema) as any });

  const saveMutation = useMutation({
    mutationFn: (d: AssetFormData) => editAsset ? storeApi.updateAsset(editAsset.id, d) : storeApi.createAsset(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-assets'] }); setShowModal(false); setEditAsset(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignData }) => storeApi.assignAsset(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-assets'] }); setAssignAsset(null); assignForm.reset(); },
  });

  const returnMutation = useMutation({
    mutationFn: (id: number) => storeApi.returnAsset(id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-assets'] }),
  });

  function openCreate() { setEditAsset(null); assetForm.reset({ status: 'active' }); setError(''); setShowModal(true); }
  function openEdit(a: StoreAsset) {
    setEditAsset(a);
    assetForm.reset({ name: a.name, store_id: a.store_id, serial_number: a.serial_number ?? '', make: a.make ?? '', model_number: a.model_number ?? '', purchase_date: a.purchase_date ?? '', purchase_price: a.purchase_price ?? undefined, warranty_expiry: a.warranty_expiry ?? '', amc_expiry: a.amc_expiry ?? '', location: a.location ?? '', status: a.status, remarks: a.remarks ?? '' });
    setError(''); setShowModal(true);
  }

  const assets = data?.items ?? [];
  const stores = storeData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Assets" subtitle="Non-consumable asset register" />
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          {(['active','in_repair','disposed','lost','condemned'] as AssetStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Asset Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Make / Model</th>
                <th className="px-4 py-3 text-left">Serial #</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{a.asset_code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{[a.make, a.model_number].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.serial_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.location ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status.replace('_',' ')}</span></td>
                  <td className="px-4 py-3 text-slate-600">{a.assigned_to_id ? `Employee ${a.assigned_to_id}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-slate-500 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      {!a.assigned_to_id && a.status === 'active' && (
                        <button onClick={() => { setAssignAsset(a); assignForm.reset(); }} className="text-slate-500 hover:text-green-600" title="Assign"><UserCheck className="h-4 w-4" /></button>
                      )}
                      {a.assigned_to_id && (
                        <button onClick={() => returnMutation.mutate(a.id)} className="text-slate-500 hover:text-amber-600" title="Return"><UserX className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No assets found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">{editAsset ? 'Edit Asset' : 'Add Asset'}</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={assetForm.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input {...assetForm.register('name')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Store</label>
                  <select {...assetForm.register('store_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select {...assetForm.register('status')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {(['active','in_repair','disposed','lost','condemned'] as AssetStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Make</label><input {...assetForm.register('make')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Model #</label><input {...assetForm.register('model_number')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Serial #</label><input {...assetForm.register('serial_number')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price</label><input type="number" step="0.01" {...assetForm.register('purchase_price')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label><input type="date" {...assetForm.register('purchase_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Warranty Expiry</label><input type="date" {...assetForm.register('warranty_expiry')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Location</label><input {...assetForm.register('location')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Assign Asset: {assignAsset.name}</h2>
            <form onSubmit={assignForm.handleSubmit((d) => assignMutation.mutate({ id: assignAsset.id, data: d }))} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Employee ID *</label><input type="number" {...assignForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><input {...assignForm.register('notes')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAssignAsset(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={assignMutation.isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
