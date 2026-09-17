import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, DollarSign } from 'lucide-react';
import { payrollApi } from '../../services/api';
import type { SalaryComponent, ComponentType, CalculationType } from '../../types';
import { getErrorMessage } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  component_type: z.enum(['earning', 'deduction']),
  calculation_type: z.enum(['fixed', 'percentage', 'formula']),
  default_value: z.coerce.number().min(0),
  base_on: z.string().optional(),
  is_taxable: z.boolean(),
  is_mandatory: z.boolean(),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const TYPE_COLORS: Record<ComponentType, string> = {
  earning: 'bg-green-100 text-green-700',
  deduction: 'bg-red-100 text-red-700',
};

const CALC_COLORS: Record<CalculationType, string> = {
  fixed: 'bg-blue-100 text-blue-700',
  percentage: 'bg-purple-100 text-purple-700',
  formula: 'bg-amber-100 text-amber-700',
};

export function SalaryComponentsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalaryComponent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponent | null>(null);
  const [error, setError] = useState('');

  const { data: components = [], isLoading } = useQuery<SalaryComponent[]>({
    queryKey: ['salary-components'],
    queryFn: () => payrollApi.listComponents().then((r: { data: SalaryComponent[] }) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { component_type: 'earning', calculation_type: 'fixed', default_value: 0, is_taxable: false, is_mandatory: false, is_active: true },
  });

  const calcType = watch('calculation_type');

  const openCreate = () => {
    setEditing(null);
    reset({ component_type: 'earning', calculation_type: 'fixed', default_value: 0, is_taxable: false, is_mandatory: false, is_active: true });
    setShowForm(true);
    setError('');
  };

  const openEdit = (c: SalaryComponent) => {
    setEditing(c);
    reset({
      name: c.name, code: c.code, component_type: c.component_type,
      calculation_type: c.calculation_type, default_value: c.default_value,
      base_on: c.base_on ?? '', is_taxable: c.is_taxable,
      is_mandatory: c.is_mandatory, description: c.description ?? '', is_active: c.is_active,
    });
    setShowForm(true);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing ? payrollApi.updateComponent(editing.id, data) : payrollApi.createComponent(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-components'] }); setShowForm(false); reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => payrollApi.deleteComponent(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-components'] }); setDeleteTarget(null); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salary Components</h1>
          <p className="text-sm text-slate-500 mt-0.5">{components.length} components configured</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Add Component
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
        ) : components.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <DollarSign className="h-8 w-8 mb-2" /><p>No salary components configured</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Calculation</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Default Value</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Mandatory</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Taxable</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[c.component_type]}`}>
                      {c.component_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CALC_COLORS[c.calculation_type]}`}>
                      {c.calculation_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {c.calculation_type === 'percentage' ? `${c.default_value}%` : `₹${c.default_value.toLocaleString('en-IN')}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.is_mandatory ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_mandatory ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.is_taxable ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_taxable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => { setDeleteTarget(c); setError(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Component' : 'Add Salary Component'}</h2>
              <button onClick={() => { setShowForm(false); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {error && <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input {...register('name')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                  <input {...register('code')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. BASIC_PAY" />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Component Type *</label>
                  <select {...register('component_type')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calculation Type *</label>
                  <select {...register('calculation_type')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                    <option value="formula">Formula</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Value *</label>
                  <input {...register('default_value')} type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                {calcType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base On</label>
                    <input {...register('base_on')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. basic_monthly" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input {...register('is_taxable')} type="checkbox" className="rounded" />
                  Taxable
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input {...register('is_mandatory')} type="checkbox" className="rounded" />
                  Mandatory
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input {...register('is_active')} type="checkbox" className="rounded" />
                  Active
                </label>
              </div>
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
            <h3 className="text-lg font-semibold mb-2">Delete Component</h3>
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
