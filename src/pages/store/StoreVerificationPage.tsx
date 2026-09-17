import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, ClipboardCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StockVerification, VerificationStatus, StoreLocation } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const createSchema = z.object({
  store_id: z.coerce.number().min(1, 'Store required'),
  remarks: z.string().optional(),
});
type CreateData = z.infer<typeof createSchema>;

const STATUS_COLORS: Record<VerificationStatus, string> = {
  open: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
};

export function StoreVerificationPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<StockVerification | null>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StockVerification[] }>({
    queryKey: ['store-verifications'],
    queryFn: () => storeApi.listVerifications({ per_page: 100 }).then((r) => r.data),
  });

  const { data: storeData } = useQuery<{ items: StoreLocation[] }>({ queryKey: ['store-locations'], queryFn: () => storeApi.listStores({ per_page: 100 }).then((r) => r.data) });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateData>({ resolver: zodResolver(createSchema) as any });

  const createMutation = useMutation({
    mutationFn: (d: CreateData) => storeApi.createVerification(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-verifications'] }); setShowModal(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const submitCountMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => {
      const countsArr = Object.entries(counts).map(([item_id, physical_quantity]) => ({
        item_id: parseInt(item_id), physical_quantity: parseFloat(physical_quantity) || 0,
      }));
      return storeApi.submitCount(id, { counts: countsArr });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['store-verifications'] });
      storeApi.getVerification(id).then((r) => setViewItem(r.data));
      setCounts({});
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => storeApi.approveVerification(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['store-verifications'] });
      storeApi.getVerification(id).then((r) => setViewItem(r.data));
    },
  });

  const verifications = data?.items ?? [];
  const stores = storeData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Stock Verification" subtitle="Physical stock audit" />
        <button onClick={() => { reset(); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Verification
        </button>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Verification #</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verifications.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{v.verification_number}</td>
                  <td className="px-4 py-3 text-slate-600">{v.verification_date}</td>
                  <td className="px-4 py-3 text-slate-600">{v.store?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.items.length} items</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status]}`}>{v.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setViewItem(v); setCounts({}); }} className="text-slate-500 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      {v.status === 'submitted' && <button onClick={() => approveMutation.mutate(v.id)} className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">Approve</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {verifications.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No verifications found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">New Stock Verification</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store *</label>
                <select {...register('store_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">— Select Store —</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.store_id && <p className="mt-1 text-xs text-red-500">{errors.store_id.message}</p>}
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label><textarea {...register('remarks')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <p className="text-xs text-slate-500">All active items will be auto-populated from the system stock.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{viewItem.verification_number}</h2>
              <button onClick={() => setViewItem(null)} className="text-2xl text-slate-400">&times;</button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status}</span>
              {viewItem.status === 'open' && (
                <button onClick={() => submitCountMutation.mutate({ id: viewItem.id })} disabled={submitCountMutation.isPending} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-60">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Submit Count
                </button>
              )}
            </div>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">System Qty</th>
                  <th className="px-3 py-2 text-right">Physical Qty</th>
                  <th className="px-3 py-2 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewItem.items.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">{line.item?.name ?? `Item ${line.item_id}`}</td>
                    <td className="px-3 py-2 text-right">{line.system_quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {viewItem.status === 'open' ? (
                        <input type="number" step="0.01" value={counts[line.item_id] ?? ''} onChange={(e) => setCounts((c) => ({ ...c, [line.item_id]: e.target.value }))}
                          className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-sm text-right" placeholder="Enter" />
                      ) : (
                        line.physical_quantity ?? '—'
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${line.difference != null && line.difference < 0 ? 'text-red-600' : line.difference != null && line.difference > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                      {line.difference != null ? (line.difference >= 0 ? '+' : '') + line.difference : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
