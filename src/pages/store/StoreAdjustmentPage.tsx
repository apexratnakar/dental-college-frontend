import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StockAdjustment, AdjustmentStatus, StoreItem, StoreLocation } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const itemSchema = z.object({
  item_id: z.coerce.number().min(1),
  adjustment_quantity: z.coerce.number(),
  remarks: z.string().optional(),
});

const schema = z.object({
  store_id: z.coerce.number().min(1, 'Store required'),
  reason: z.enum(['damaged','lost','expired','theft','physical_difference','data_correction']),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1),
});
type FormData = z.infer<typeof schema>;

const STATUS_COLORS: Record<AdjustmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

export function StoreAdjustmentPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<StockAdjustment | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StockAdjustment[] }>({
    queryKey: ['store-adjustments'],
    queryFn: () => storeApi.listAdjustments({ per_page: 100 }).then((r) => r.data),
  });

  const { data: storeData } = useQuery<{ items: StoreLocation[] }>({ queryKey: ['store-locations'], queryFn: () => storeApi.listStores({ per_page: 100 }).then((r) => r.data) });
  const { data: itemData } = useQuery<{ items: StoreItem[] }>({ queryKey: ['store-items'], queryFn: () => storeApi.listItems({ per_page: 500 }).then((r) => r.data) });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { reason: 'data_correction', items: [{ item_id: 0, adjustment_quantity: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => storeApi.createAdjustment(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-adjustments'] }); setShowModal(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      action === 'approve' ? storeApi.approveAdjustment(id) : storeApi.rejectAdjustment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-adjustments'] }),
  });

  const adjustments = data?.items ?? [];
  const stores = storeData?.items ?? [];
  const storeItems = itemData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Stock Adjustments" subtitle="Adjust stock for discrepancies" />
        <button onClick={() => { reset({ reason: 'data_correction', items: [{ item_id: 0, adjustment_quantity: 0 }] }); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Adjustment
        </button>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Adjustment #</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{a.adjustment_number}</td>
                  <td className="px-4 py-3 text-slate-600">{a.adjustment_date}</td>
                  <td className="px-4 py-3 text-slate-600">{a.store?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{a.reason.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setViewItem(a)} className="text-slate-500 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      {a.status === 'pending' && <>
                        <button onClick={() => actionMutation.mutate({ id: a.id, action: 'approve' })} className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">Approve</button>
                        <button onClick={() => actionMutation.mutate({ id: a.id, action: 'reject' })} className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Reject</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No adjustments found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">New Stock Adjustment</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Store *</label>
                  <select {...register('store_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— Select Store —</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.store_id && <p className="mt-1 text-xs text-red-500">{errors.store_id.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                  <select {...register('reason')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="damaged">Damaged</option>
                    <option value="lost">Lost</option>
                    <option value="expired">Expired</option>
                    <option value="theft">Theft</option>
                    <option value="physical_difference">Physical Difference</option>
                    <option value="data_correction">Data Correction</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Items * <span className="text-xs text-slate-400">(positive = add, negative = remove)</span></label>
                  <button type="button" onClick={() => append({ item_id: 0, adjustment_quantity: 0 })} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select {...register(`items.${idx}.item_id`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">— Item —</option>
                          {storeItems.map((i) => <option key={i.id} value={i.id}>{i.name} (Stock: {i.current_stock})</option>)}
                        </select>
                      </div>
                      <div className="w-32"><input type="number" step="0.01" placeholder="Adj Qty" {...register(`items.${idx}.adjustment_quantity`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      <div className="flex-1"><input placeholder="Remarks" {...register(`items.${idx}.remarks`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label><textarea {...register('remarks')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create Adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{viewItem.adjustment_number}</h2><button onClick={() => setViewItem(null)} className="text-2xl text-slate-400">&times;</button></div>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Adj Qty</th></tr></thead>
              <tbody className="divide-y">
                {viewItem.items.map((line) => (
                  <tr key={line.id}><td className="px-3 py-2">{line.item?.name}</td>
                    <td className={`px-3 py-2 text-right font-medium ${line.adjustment_quantity >= 0 ? 'text-green-700' : 'text-red-600'}`}>{line.adjustment_quantity >= 0 ? '+' : ''}{line.adjustment_quantity}</td>
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
