import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeApi } from '../../services/api';
import type { StoreItem, StoreCategory, StoreUnit } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  item_type: z.enum(['consumable', 'non_consumable']),
  category_id: z.coerce.number().optional().nullable(),
  unit_id: z.coerce.number().optional().nullable(),
  description: z.string().optional(),
  specifications: z.string().optional(),
  minimum_stock: z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0),
  shelf_location: z.string().optional(),
  hsn_code: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export function StoreItemsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<StoreItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: StoreItem[]; total: number }>({
    queryKey: ['store-items', search, categoryFilter],
    queryFn: () => storeApi.listItems({ search: search || undefined, category_id: categoryFilter || undefined, per_page: 100 }).then((r) => r.data),
  });

  const { data: catData } = useQuery<{ items: StoreCategory[] }>({
    queryKey: ['store-categories'],
    queryFn: () => storeApi.listCategories({ per_page: 200 }).then((r) => r.data),
  });

  const { data: unitData } = useQuery<{ items: StoreUnit[] }>({
    queryKey: ['store-units'],
    queryFn: () => storeApi.listUnits({ per_page: 200 }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { item_type: 'consumable', minimum_stock: 0, reorder_level: 0, is_active: true },
  });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) =>
      editItem ? storeApi.updateItem(editItem.id, d) : storeApi.createItem(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-items'] }); closeModal(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeApi.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-items'] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); reset({ item_type: 'consumable', minimum_stock: 0, reorder_level: 0, is_active: true }); setError(''); setShowModal(true); }
  function openEdit(item: StoreItem) {
    setEditItem(item);
    reset({
      name: item.name, code: item.code ?? '', item_type: item.item_type,
      category_id: item.category_id, unit_id: item.unit_id,
      description: item.description ?? '', specifications: item.specifications ?? '',
      minimum_stock: item.minimum_stock, reorder_level: item.reorder_level,
      shelf_location: item.shelf_location ?? '', hsn_code: item.hsn_code ?? '',
      is_active: item.is_active,
    });
    setError(''); setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditItem(null); }

  const items = data?.items ?? [];
  const categories = catData?.items ?? [];
  const units = unitData?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Item Master" subtitle="Manage store inventory items" />
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Min Stock</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.name}
                    {item.is_low_stock && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Low Stock</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.code ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.item_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{item.current_stock}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.minimum_stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="text-slate-500 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editItem ? 'Edit Item' : 'Add Item'}</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input {...register('name')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                  <input {...register('code')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select {...register('item_type')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="consumable">Consumable</option>
                    <option value="non_consumable">Non-Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select {...register('category_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select {...register('unit_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HSN Code</label>
                  <input {...register('hsn_code')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Stock</label>
                  <input type="number" step="0.01" {...register('minimum_stock')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input type="number" step="0.01" {...register('reorder_level')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shelf Location</label>
                <input {...register('shelf_location')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active_item" {...register('is_active')} className="rounded" />
                <label htmlFor="is_active_item" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteId !== null} title="Delete Item" message="Delete this item?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
