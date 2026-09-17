import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, Briefcase } from 'lucide-react';
import { employeeApi } from '../../services/api';
import type { Designation, EmployeeCategory } from '../../types';
import { getErrorMessage } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['teaching', 'administrative', 'support']),
  grade: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const CATEGORY_COLORS: Record<EmployeeCategory, string> = {
  teaching: 'bg-blue-100 text-blue-700',
  administrative: 'bg-purple-100 text-purple-700',
  support: 'bg-amber-100 text-amber-700',
};

export function DesignationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Designation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [error, setError] = useState('');

  const { data: designations = [], isLoading } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: () => employeeApi.listDesignations().then((r: { data: Designation[] }) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'administrative', is_active: true },
  });

  const openCreate = () => { setEditing(null); reset({ name: '', category: 'administrative', grade: '', description: '', is_active: true }); setShowForm(true); setError(''); };
  const openEdit = (d: Designation) => { setEditing(d); reset({ name: d.name, category: d.category, grade: d.grade ?? '', description: d.description ?? '', is_active: d.is_active }); setShowForm(true); setError(''); };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing ? employeeApi.updateDesignation(editing.id, data) : employeeApi.createDesignation(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['designations'] }); setShowForm(false); reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeApi.deleteDesignation(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['designations'] }); setDeleteTarget(null); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Designations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{designations.length} designations</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Add Designation
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
        ) : designations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Briefcase className="h-8 w-8 mb-2" /><p>No designations yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Category</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Grade</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {designations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[d.category]}`}>{d.category}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{d.grade ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => { setDeleteTarget(d); setError(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Designation' : 'Add Designation'}</h2>
              <button onClick={() => { setShowForm(false); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input {...register('name')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select {...register('category')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="teaching">Teaching</option>
                  <option value="administrative">Administrative</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                <input {...register('grade')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Grade A, Level 3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input {...register('is_active')} type="checkbox" id="desig_active" className="rounded" />
                <label htmlFor="desig_active" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Designation</h3>
            <p className="text-sm text-slate-500 mb-6">Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

