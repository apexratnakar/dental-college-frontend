import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';

interface LeaveType {
  id: number;
  name: string;
  code: string;
  max_days_per_year: number;
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code: string;
  year: number;
  allocated_days: number;
  used_days: number;
  carry_forward_days: number;
  remaining_days: number;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
}

interface Department {
  id: number;
  name: string;
}

// Pivot: employee row with one column per leave type
interface BalanceRow {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  balances: Record<string, { allocated: number; used: number; remaining: number }>;
}

const allocateSchema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  leave_type_id: z.coerce.number().min(1, 'Leave type required'),
  year: z.coerce.number().min(2020).max(2099),
  allocated_days: z.coerce.number().min(0),
  carry_forward_days: z.coerce.number().min(0).default(0),
});
type AllocateForm = z.infer<typeof allocateSchema>;

const bulkSchema = z.object({
  leave_type_id: z.coerce.number().min(1, 'Leave type required'),
  year: z.coerce.number().min(2020).max(2099),
  department_id: z.coerce.number().optional(),
  allocated_days: z.coerce.number().min(0),
});
type BulkForm = z.infer<typeof bulkSchema>;

export function LeaveBalancePage() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types-active'],
    queryFn: () => api.get('/leave/types?is_active=true').then((r) => r.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments-list'],
    queryFn: () => api.get('/employees/departments').then((r) => r.data),
  });

  const { data: empData } = useQuery<{ items: Employee[] }>({
    queryKey: ['employees-list-all'],
    queryFn: () => api.get('/employees?is_active=true&per_page=500').then((r) => r.data),
  });
  const employees = empData?.items ?? [];

  const { data: balances = [], isLoading } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', year],
    queryFn: () => api.get(`/leave/balances?year=${year}&per_page=500`).then((r) => r.data.items ?? r.data),
  });

  // Pivot balances into rows
  const rowsMap: Record<number, BalanceRow> = {};
  for (const b of balances) {
    if (!rowsMap[b.employee_id]) {
      rowsMap[b.employee_id] = {
        employee_id: b.employee_id,
        employee_name: b.employee_name,
        employee_code: b.employee_code,
        balances: {},
      };
    }
    rowsMap[b.employee_id].balances[b.leave_type_code] = {
      allocated: b.allocated_days,
      used: b.used_days,
      remaining: b.remaining_days,
    };
  }
  const rows = Object.values(rowsMap).sort((a, b) => a.employee_code.localeCompare(b.employee_code));

  // Single allocation form
  const allocateForm = useForm<AllocateForm>({
    resolver: zodResolver(allocateSchema) as any,
    defaultValues: { year: currentYear, allocated_days: 0, carry_forward_days: 0 },
  });

  const allocateMutation = useMutation({
    mutationFn: (data: AllocateForm) => api.post('/leave/balances/allocate', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setShowAllocateModal(false);
      allocateForm.reset({ year: currentYear, allocated_days: 0, carry_forward_days: 0 });
    },
  });

  // Bulk allocation form
  const bulkForm = useForm<BulkForm>({
    resolver: zodResolver(bulkSchema) as any,
    defaultValues: { year: currentYear, allocated_days: 0 },
  });

  const bulkMutation = useMutation({
    mutationFn: (data: BulkForm) => api.post('/leave/balances/bulk-allocate', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setShowBulkModal(false);
      bulkForm.reset({ year: currentYear, allocated_days: 0 });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Leave Balances" subtitle="View and manage employee leave balances by year" />
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            <RefreshCw className="h-4 w-4" /> Bulk Allocate
          </button>
          <button
            onClick={() => { allocateForm.reset({ year, allocated_days: 0, carry_forward_days: 0 }); setShowAllocateModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" /> Allocate Leave
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading...</p>
        ) : !rows.length ? (
          <p className="p-8 text-center text-slate-400">
            No leave balances found for {year}. Use "Bulk Allocate" to set up balances.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-slate-50">Employee</th>
                {leaveTypes.map((lt) => (
                  <th key={lt.id} className="px-3 py-3 text-center whitespace-nowrap" colSpan={3}>
                    {lt.code}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-2 text-left sticky left-0 bg-slate-50 text-xs text-slate-400">Code</th>
                {leaveTypes.map((lt) => (
                  <>
                    <th key={`${lt.id}-a`} className="px-2 py-2 text-center text-xs text-slate-400">Alloc</th>
                    <th key={`${lt.id}-u`} className="px-2 py-2 text-center text-xs text-slate-400">Used</th>
                    <th key={`${lt.id}-r`} className="px-2 py-2 text-center text-xs font-semibold text-green-600">Rem</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.employee_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50">
                    <p className="font-medium text-slate-800">{row.employee_name}</p>
                    <p className="text-xs text-slate-400">{row.employee_code}</p>
                  </td>
                  {leaveTypes.map((lt) => {
                    const b = row.balances[lt.code];
                    return (
                      <>
                        <td key={`${row.employee_id}-${lt.id}-a`} className="px-2 py-3 text-center text-slate-600">{b?.allocated ?? '-'}</td>
                        <td key={`${row.employee_id}-${lt.id}-u`} className="px-2 py-3 text-center text-slate-500">{b?.used ?? '-'}</td>
                        <td key={`${row.employee_id}-${lt.id}-r`} className={`px-2 py-3 text-center font-medium ${b ? (b.remaining > 0 ? 'text-green-600' : 'text-red-500') : 'text-slate-300'}`}>
                          {b ? b.remaining : '-'}
                        </td>
                      </>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Single Allocate Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Allocate Leave Balance</h2>
            <form onSubmit={allocateForm.handleSubmit((d) => allocateMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                <select {...allocateForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                </select>
                {allocateForm.formState.errors.employee_id && <p className="text-xs text-red-500 mt-1">{allocateForm.formState.errors.employee_id.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type *</label>
                <select {...allocateForm.register('leave_type_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select leave type</option>
                  {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
                </select>
                {allocateForm.formState.errors.leave_type_id && <p className="text-xs text-red-500 mt-1">{allocateForm.formState.errors.leave_type_id.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Year *</label>
                  <input type="number" {...allocateForm.register('year')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Allocated Days *</label>
                  <input type="number" step="0.5" {...allocateForm.register('allocated_days')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Carry Forward</label>
                  <input type="number" step="0.5" {...allocateForm.register('carry_forward_days')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAllocateModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={allocateMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {allocateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Allocate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Bulk Allocate Leave</h2>
            <p className="text-sm text-slate-500 mb-4">Allocate the same leave days to all active employees (optionally filtered by department).</p>
            <form onSubmit={bulkForm.handleSubmit((d) => bulkMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type *</label>
                  <select {...bulkForm.register('leave_type_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
                  </select>
                  {bulkForm.formState.errors.leave_type_id && <p className="text-xs text-red-500 mt-1">{bulkForm.formState.errors.leave_type_id.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Year *</label>
                  <input type="number" {...bulkForm.register('year')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department (optional)</label>
                  <select {...bulkForm.register('department_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">All Departments</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Days to Allocate *</label>
                  <input type="number" step="0.5" {...bulkForm.register('allocated_days')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={bulkMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {bulkMutation.isPending ? 'Allocating...' : 'Allocate to All'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
