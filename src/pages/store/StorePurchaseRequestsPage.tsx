import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { PurchaseRequest, PRStatus, StoreItem } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';

const itemSchema = z.object({
  item_id: z.coerce.number().min(1, 'Item required'),
  quantity: z.coerce.number().min(0.01, 'Qty required'),
  remarks: z.string().optional(),
});

const schema = z.object({
  department_id: z.coerce.number().optional().nullable(),
  requested_by_id: z.coerce.number().min(1, 'Requested by is required'),
  required_date: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  purpose: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item required'),
});
type FormData = z.infer<typeof schema>;

const STATUS_COLORS: Record<PRStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  hod_approved: 'bg-green-100 text-green-700',
  hod_rejected: 'bg-red-100 text-red-700',
  store_verified: 'bg-purple-100 text-purple-700',
  po_created: 'bg-amber-100 text-amber-700',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export function StorePurchaseRequestsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<PurchaseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: PurchaseRequest[]; total: number }>({
    queryKey: ['store-prs', statusFilter],
    queryFn: () => storeApi.listPRs({ status: statusFilter || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { data: itemData } = useQuery<{ items: StoreItem[] }>({
    queryKey: ['store-items'],
    queryFn: () => storeApi.listItems({ per_page: 500 }).then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { priority: 'normal', items: [{ item_id: 0, quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => storeApi.createPR(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-prs'] }); setShowModal(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: string; reason?: string }) => {
      if (action === 'submit') return storeApi.submitPR(id);
      if (action === 'approve') return storeApi.approvePR(id, {});
      if (action === 'reject') return storeApi.rejectPR(id, { reason });
      if (action === 'verify') return storeApi.verifyPR(id);
      if (action === 'cancel') return storeApi.cancelPR(id);
      return Promise.reject('Unknown action');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-prs'] }); setRejectId(null); setRejectReason(''); },
  });

  const storeItems = itemData?.items ?? [];
  const prs = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Purchase Requests" subtitle="Manage procurement requests" />
        <button onClick={() => { reset({ priority: 'normal', items: [{ item_id: 0, quantity: 1 }] }); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New PR
        </button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          {(['draft','submitted','hod_approved','hod_rejected','store_verified','po_created','completed','cancelled'] as PRStatus[]).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">PR Number</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Purpose</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prs.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{pr.pr_number}</td>
                  <td className="px-4 py-3 text-slate-600">{pr.request_date}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{pr.priority}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{pr.purpose ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[pr.status]}`}>
                      {pr.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setViewItem(pr)} className="text-slate-500 hover:text-blue-600" title="View"><Eye className="h-4 w-4" /></button>
                      {pr.status === 'draft' && (
                        <button onClick={() => actionMutation.mutate({ id: pr.id, action: 'submit' })} className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5 hover:bg-blue-200">Submit</button>
                      )}
                      {pr.status === 'submitted' && (
                        <>
                          <button onClick={() => actionMutation.mutate({ id: pr.id, action: 'approve' })} className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5 hover:bg-green-200">Approve</button>
                          <button onClick={() => setRejectId(pr.id)} className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5 hover:bg-red-200">Reject</button>
                        </>
                      )}
                      {pr.status === 'hod_approved' && (
                        <button onClick={() => actionMutation.mutate({ id: pr.id, action: 'verify' })} className="text-xs rounded bg-purple-100 text-purple-700 px-2 py-0.5 hover:bg-purple-200">Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {prs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No purchase requests found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PR Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">New Purchase Request</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Requested By (User ID) *</label>
                  <input type="number" {...register('requested_by_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.requested_by_id && <p className="mt-1 text-xs text-red-500">{errors.requested_by_id.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select {...register('priority')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Required Date</label>
                  <input type="date" {...register('required_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <textarea {...register('purpose')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Items *</label>
                  <button type="button" onClick={() => append({ item_id: 0, quantity: 1 })} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
                </div>
                {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
                  <p className="mb-2 text-xs text-red-500">{String(errors.items.message)}</p>
                )}
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select {...register(`items.${idx}.item_id`)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                          <option value="">— Select Item —</option>
                          {storeItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <input type="number" step="0.01" placeholder="Qty" {...register(`items.${idx}.quantity`)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div className="flex-1">
                        <input placeholder="Remarks" {...register(`items.${idx}.remarks`)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  {createMutation.isPending ? 'Creating...' : 'Create PR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Reject Purchase Request</h2>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectId(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">Cancel</button>
              <button onClick={() => actionMutation.mutate({ id: rejectId, action: 'reject', reason: rejectReason })} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">{viewItem.pr_number}</h2>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{viewItem.request_date}</span></div>
              <div><span className="text-slate-500">Priority:</span> <span className="font-medium capitalize">{viewItem.priority}</span></div>
              <div><span className="text-slate-500">Status:</span> <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status.replace(/_/g,' ')}</span></div>
              <div><span className="text-slate-500">Required Date:</span> <span className="font-medium">{viewItem.required_date ?? '—'}</span></div>
            </div>
            {viewItem.purpose && <p className="text-sm text-slate-600 mb-4"><span className="font-medium">Purpose: </span>{viewItem.purpose}</p>}
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-left">Remarks</th></tr>
              </thead>
              <tbody className="divide-y">
                {viewItem.items.map((line) => (
                  <tr key={line.id}><td className="px-3 py-2">{line.item?.name ?? `Item ${line.item_id}`}</td><td className="px-3 py-2 text-right">{line.quantity}</td><td className="px-3 py-2">{line.remarks ?? ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
