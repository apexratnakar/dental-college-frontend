import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { payrollApi } from '../../services/api';
import type { SalaryStructure, StructureComponentResponse } from '../../types';
import { getErrorMessage } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function ComponentRow({ c }: { c: StructureComponentResponse }) {
  return (
    <tr className="bg-slate-50/70">
      <td className="pl-10 pr-4 py-2 text-slate-700">{c.component_name}</td>
      <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.component_code}</td>
      <td className="px-4 py-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.component_type === 'earning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {c.component_type}
        </span>
      </td>
      <td className="px-4 py-2 text-right font-mono text-xs text-slate-500">{c.override_value != null ? `₹${c.override_value.toLocaleString('en-IN')}` : '—'}</td>
      <td className="px-4 py-2 text-right font-mono text-xs text-slate-500">₹{c.default_value.toLocaleString('en-IN')}</td>
      <td className="px-4 py-2 text-right font-mono text-xs font-medium text-slate-900">₹{c.effective_value.toLocaleString('en-IN')}</td>
      <td className="px-4 py-2 text-center text-xs text-slate-400">{c.sort_order}</td>
    </tr>
  );
}

export function SalaryStructuresPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalaryStructure | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryStructure | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data: structures = [], isLoading } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structures'],
    queryFn: () => payrollApi.listStructures().then((r: { data: SalaryStructure[] }) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', code: '', description: '', is_active: true });
    setShowForm(true);
    setError('');
  };

  const openEdit = (s: SalaryStructure) => {
    setEditing(s);
    reset({ name: s.name, code: s.code, description: s.description ?? '', is_active: s.is_active });
    setShowForm(true);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing ? payrollApi.updateStructure(editing.id, data) : payrollApi.createStructure(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-structures'] }); setShowForm(false); reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => payrollApi.deleteStructure(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-structures'] }); setDeleteTarget(null); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salary Structures</h1>
          <p className="text-sm text-slate-500 mt-0.5">{structures.length} structures configured</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Add Structure
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
        ) : structures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Layers className="h-8 w-8 mb-2" /><p>No salary structures defined</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-8" />
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Components</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structures.map((s) => (
                <>
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpand(s.id)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                        {expandedId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.code}</td>
                    <td className="px-4 py-3 text-slate-600">{s.components.length} components</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => { setDeleteTarget(s); setError(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === s.id && s.components.length > 0 && (
                    <tr key={`${s.id}-components`}>
                      <td colSpan={6} className="p-0">
                        <table className="w-full text-xs border-t border-slate-100">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left pl-10 pr-4 py-2 font-medium text-slate-500">Component</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-500">Code</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-500">Type</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-500">Override</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-500">Default</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-500">Effective</th>
                              <th className="text-center px-4 py-2 font-medium text-slate-500">Order</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {s.components.map((c) => <ComponentRow key={c.id} c={c} />)}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Structure' : 'Add Salary Structure'}</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                <input {...register('code')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. FACULTY_GRADE_A" />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input {...register('is_active')} type="checkbox" className="rounded" />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Structure</h3>
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
