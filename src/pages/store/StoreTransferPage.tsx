import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StockTransfer, TransferStatus, StoreItem, StoreLocation } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const itemSchema = z.object({
  item_id: z.coerce.number().min(1),
  quantity: z.coerce.number().min(0.01),
  remarks: z.string().optional(),
});

const schema = z.object({
  from_store_id: z.coerce.number().min(1, 'From store required'),
  to_store_id: z.coerce.number().min(1, 'To store required'),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1),
});
type FormData = z.infer<typeof schema>;

const STATUS_COLORS: Record<TransferStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_transit: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export function StoreTransferPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<StockTransfer | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StockTransfer[] }>({
    queryKey: ['store-transfers', statusFilter],
    queryFn: () => storeApi.listTransfers({ status: statusFilter || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { data: storeData } = useQuery<{ items: StoreLocation[] }>({ queryKey: ['store-locations'], queryFn: () => storeApi.listStores({ per_page: 100 }).then((r) => r.data) });
  const { data: itemData } = useQuery<{ items: StoreItem[] }>({ queryKey: ['store-items'], queryFn: () => storeApi.listItems({ per_page: 500 }).then((r) => r.data) });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { items: [{ item_id: 0, quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => storeApi.createTransfer(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-transfers'] }); setShowModal(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      action === 'dispatch' ? storeApi.dispatchTransfer(id) : storeApi.receiveTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-transfers'] }),
  });

  const transfers = data?.items ?? [];
  const stores = storeData?.items ?? [];
  const storeItems = itemData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Stock Transfers" subtitle="Inter-store stock movements" />
        <button onClick={() => { reset({ items: [{ item_id: 0, quantity: 1 }] }); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Transfer
        </button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          {(['pending','in_transit','received','cancelled'] as TransferStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Transfer #</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">From Store</th>
                <th className="px-4 py-3 text-left">To Store</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{t.transfer_number}</td>
                  <td className="px-4 py-3 text-slate-600">{t.transfer_date}</td>
                  <td className="px-4 py-3 text-slate-600">{t.from_store?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.to_store?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace('_',' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setViewItem(t)} className="text-slate-500 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      {t.status === 'pending' && <button onClick={() => actionMutation.mutate({ id: t.id, action: 'dispatch' })} className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5">Dispatch</button>}
                      {t.status === 'in_transit' && <button onClick={() => actionMutation.mutate({ id: t.id, action: 'receive' })} className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">Receive</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transfers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">New Stock Transfer</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Store *</label>
                  <select {...register('from_store_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— Select Store —</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.from_store_id && <p className="mt-1 text-xs text-red-500">{errors.from_store_id.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Store *</label>
                  <select {...register('to_store_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— Select Store —</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.to_store_id && <p className="mt-1 text-xs text-red-500">{errors.to_store_id.message}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Items *</label>
                  <button type="button" onClick={() => append({ item_id: 0, quantity: 1 })} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select {...register(`items.${idx}.item_id`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">— Item —</option>
                          {storeItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="w-24"><input type="number" step="0.01" placeholder="Qty" {...register(`items.${idx}.quantity`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label><textarea {...register('remarks')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{viewItem.transfer_number}</h2><button onClick={() => setViewItem(null)} className="text-2xl text-slate-400">&times;</button></div>
            <p className="text-sm text-slate-600 mb-3">{viewItem.from_store?.name} → {viewItem.to_store?.name}</p>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th></tr></thead>
              <tbody className="divide-y">{viewItem.items.map((line) => <tr key={line.id}><td className="px-3 py-2">{line.item?.name}</td><td className="px-3 py-2 text-right">{line.quantity}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
