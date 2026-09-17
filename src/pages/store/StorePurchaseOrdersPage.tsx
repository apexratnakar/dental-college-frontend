import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { PurchaseOrder, POStatus, StoreItem, StoreVendor, PurchaseRequest } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const itemSchema = z.object({
  item_id: z.coerce.number().min(1, 'Item required'),
  quantity: z.coerce.number().min(0.01),
  unit_price: z.coerce.number().min(0),
  gst_percent: z.coerce.number().min(0),
  remarks: z.string().optional(),
});

const schema = z.object({
  vendor_id: z.coerce.number().min(1, 'Vendor required'),
  pr_id: z.coerce.number().optional().nullable(),
  expected_delivery: z.string().optional(),
  delivery_address: z.string().optional(),
  payment_terms: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item required'),
});
type FormData = z.infer<typeof schema>;

const STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  approved: 'bg-green-100 text-green-700',
  sent_to_vendor: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-amber-100 text-amber-700',
  received: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-600',
};

export function StorePurchaseOrdersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: PurchaseOrder[] }>({
    queryKey: ['store-pos', statusFilter],
    queryFn: () => storeApi.listPOs({ status: statusFilter || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { data: vendorData } = useQuery<{ items: StoreVendor[] }>({
    queryKey: ['store-vendors'],
    queryFn: () => storeApi.listVendors({ per_page: 200 }).then((r) => r.data),
  });

  const { data: itemData } = useQuery<{ items: StoreItem[] }>({
    queryKey: ['store-items'],
    queryFn: () => storeApi.listItems({ per_page: 500 }).then((r) => r.data),
  });

  const { data: prData } = useQuery<{ items: PurchaseRequest[] }>({
    queryKey: ['store-prs-verified'],
    queryFn: () => storeApi.listPRs({ status: 'store_verified', per_page: 100 }).then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { items: [{ item_id: 0, quantity: 1, unit_price: 0, gst_percent: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => storeApi.createPO(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-pos'] }); setShowModal(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => {
      if (action === 'approve') return storeApi.approvePO(id);
      if (action === 'send') return storeApi.sendPOToVendor(id);
      if (action === 'cancel') return storeApi.cancelPO(id);
      return Promise.reject('Unknown');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-pos'] }),
  });

  const pos = data?.items ?? [];
  const vendors = vendorData?.items ?? [];
  const storeItems = itemData?.items ?? [];
  const prs = prData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Purchase Orders" subtitle="Manage purchase orders" />
        <button onClick={() => { reset({ items: [{ item_id: 0, quantity: 1, unit_price: 0, gst_percent: 0 }] }); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New PO
        </button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          {(['draft','approved','sent_to_vendor','partially_received','received','cancelled'] as POStatus[]).map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">PO Number</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Linked PR</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{po.po_number}</td>
                  <td className="px-4 py-3 text-slate-600">{po.order_date}</td>
                  <td className="px-4 py-3 text-slate-600">{po.vendor?.name ?? `Vendor ${po.vendor_id}`}</td>
                  <td className="px-4 py-3 text-slate-600">{po.pr_id ? `PR #${po.pr_id}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[po.status]}`}>{po.status.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setViewItem(po)} className="text-slate-500 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      {po.status === 'draft' && <button onClick={() => actionMutation.mutate({ id: po.id, action: 'approve' })} className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5 hover:bg-green-200">Approve</button>}
                      {po.status === 'approved' && <button onClick={() => actionMutation.mutate({ id: po.id, action: 'send' })} className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5 hover:bg-blue-200">Send to Vendor</button>}
                      {(po.status === 'draft' || po.status === 'approved') && <button onClick={() => actionMutation.mutate({ id: po.id, action: 'cancel' })} className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5 hover:bg-red-200">Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {pos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No purchase orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">New Purchase Order</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
                  <select {...register('vendor_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— Select Vendor —</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  {errors.vendor_id && <p className="mt-1 text-xs text-red-500">{errors.vendor_id.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Linked PR (optional)</label>
                  <select {...register('pr_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {prs.map((pr) => <option key={pr.id} value={pr.id}>{pr.pr_number}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                  <input type="date" {...register('expected_delivery')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input {...register('payment_terms')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
                <textarea {...register('delivery_address')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Items *</label>
                  <button type="button" onClick={() => append({ item_id: 0, quantity: 1, unit_price: 0, gst_percent: 0 })} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <select {...register(`items.${idx}.item_id`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">— Item —</option>
                          {storeItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2"><input type="number" step="0.01" placeholder="Qty" {...register(`items.${idx}.quantity`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-2"><input type="number" step="0.01" placeholder="Unit Price" {...register(`items.${idx}.unit_price`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-2"><input type="number" step="0.01" placeholder="GST %" {...register(`items.${idx}.gst_percent`)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-1">{fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create PO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{viewItem.po_number}</h2>
              <button onClick={() => setViewItem(null)} className="text-2xl text-slate-400">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-slate-500">Vendor: </span><span className="font-medium">{viewItem.vendor?.name}</span></div>
              <div><span className="text-slate-500">Status: </span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status.replace(/_/g,' ')}</span></div>
              <div><span className="text-slate-500">Delivery: </span><span className="font-medium">{viewItem.expected_delivery ?? '—'}</span></div>
              <div><span className="text-slate-500">PR: </span><span className="font-medium">{viewItem.pr_id ? `PR #${viewItem.pr_id}` : '—'}</span></div>
            </div>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit Price</th><th className="px-3 py-2 text-right">GST%</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
              <tbody className="divide-y">
                {viewItem.items.map((line) => (
                  <tr key={line.id}><td className="px-3 py-2">{line.item?.name ?? `Item ${line.item_id}`}</td><td className="px-3 py-2 text-right">{line.quantity}</td><td className="px-3 py-2 text-right">₹{line.unit_price}</td><td className="px-3 py-2 text-right">{line.gst_percent}%</td><td className="px-3 py-2 text-right font-medium">₹{line.total_price}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
