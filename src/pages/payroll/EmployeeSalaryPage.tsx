import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, IndianRupee } from 'lucide-react';
import { payrollApi, employeeApi } from '../../services/api';
import type { EmployeeSalaryStructure, SalaryStructure, EmployeeListItem } from '../../types';
import { getErrorMessage } from '../../types';

const schema = z.object({
  employee_id: z.coerce.number().min(1, 'Select an employee'),
  structure_id: z.coerce.number().min(1, 'Select a structure'),
  basic_monthly: z.coerce.number().min(0, 'Basic monthly must be ≥ 0'),
  ctc_annual: z.coerce.number().min(0, 'CTC annual must be ≥ 0'),
  effective_from: z.string().min(1, 'Effective from date is required'),
});
type FormData = z.infer<typeof schema>;

export function EmployeeSalaryPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const { data: assignments = [], isLoading } = useQuery<EmployeeSalaryStructure[]>({
    queryKey: ['salary-assignments'],
    queryFn: () => payrollApi.listSalaryAssignments().then((r: { data: EmployeeSalaryStructure[] }) => r.data),
  });

  const { data: structures = [] } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structures'],
    queryFn: () => payrollApi.listStructures().then((r: { data: SalaryStructure[] }) => r.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeeApi.listEmployees({ per_page: 500, status: 'active' }).then((r: { data: { items: EmployeeListItem[] } }) => r.data),
  });
  const employees: EmployeeListItem[] = employeesData?.items ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { basic_monthly: 0, ctc_annual: 0 },
  });

  const openForm = () => { reset({ basic_monthly: 0, ctc_annual: 0, effective_from: new Date().toISOString().split('T')[0] }); setShowForm(true); setError(''); };

  const assignMutation = useMutation({
    mutationFn: (data: FormData) => payrollApi.assignSalaryStructure(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-assignments'] }); setShowForm(false); reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Salary Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">{assignments.length} assignments total</p>
        </div>
        <button onClick={openForm} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Assign Structure
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <IndianRupee className="h-8 w-8 mb-2" /><p>No salary assignments yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Structure</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Effective From</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Effective To</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Basic Monthly</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">CTC Annual</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{a.employee_name ?? '—'}</div>
                    <div className="text-xs text-slate-400 font-mono">{a.employee_code ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.structure_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.effective_from}</td>
                  <td className="px-4 py-3 text-slate-600">{a.effective_to ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {a.basic_monthly != null ? `₹${a.basic_monthly.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {a.ctc_annual != null ? `₹${a.ctc_annual.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {a.is_current && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Current</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assign Salary Structure</h2>
              <button onClick={() => { setShowForm(false); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={handleSubmit((d) => assignMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                <select {...register('employee_id')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} — {e.first_name} {e.last_name ?? ''}
                    </option>
                  ))}
                </select>
                {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Salary Structure *</label>
                <select {...register('structure_id')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select structure</option>
                  {structures.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {errors.structure_id && <p className="text-xs text-red-500 mt-1">{errors.structure_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Basic Monthly (₹) *</label>
                  <input {...register('basic_monthly')} type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.basic_monthly && <p className="text-xs text-red-500 mt-1">{errors.basic_monthly.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTC Annual (₹) *</label>
                  <input {...register('ctc_annual')} type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.ctc_annual && <p className="text-xs text-red-500 mt-1">{errors.ctc_annual.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Effective From *</label>
                <input {...register('effective_from')} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {errors.effective_from && <p className="text-xs text-red-500 mt-1">{errors.effective_from.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={assignMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
