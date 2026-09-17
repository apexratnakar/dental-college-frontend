import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';

type LeaveStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';

interface LeaveApplication {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code: string;
  from_date: string;
  to_date: string;
  total_days: number;
  is_half_day: boolean;
  reason: string;
  status: LeaveStatus;
  applied_at: string;
  remarks: string | null;
}

interface LeaveType {
  id: number;
  name: string;
  code: string;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
}

const schema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  leave_type_id: z.coerce.number().min(1, 'Leave type required'),
  from_date: z.string().min(1, 'From date required'),
  to_date: z.string().min(1, 'To date required'),
  is_half_day: z.boolean(),
  reason: z.string().min(1, 'Reason required'),
});
type FormData = z.infer<typeof schema>;

const STATUS_COLORS: Record<LeaveStatus, string> = {
  draft:     'bg-slate-100 text-slate-700',
  pending:   'bg-yellow-100 text-yellow-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-500',
  withdrawn: 'bg-slate-100 text-slate-500',
};

export function LeaveApplicationsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<LeaveApplication | null>(null);
  const [page, setPage] = useState(1);

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types-active'],
    queryFn: () => api.get('/leave/types?is_active=true').then((r) => r.data),
  });

  const { data: empData } = useQuery<{ items: Employee[] }>({
    queryKey: ['employees-list-all'],
    queryFn: () => api.get('/employees?is_active=true&per_page=500').then((r) => r.data),
  });
  const employees = empData?.items ?? [];

  const { data, isLoading } = useQuery<{ items: LeaveApplication[]; total: number; pages: number }>({
    queryKey: ['leave-applications', statusFilter, page],
    queryFn: () =>
      api.get(`/leave/applications?page=${page}&per_page=20${statusFilter ? `&status=${statusFilter}` : ''}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { is_half_day: false },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/leave/applications', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-applications'] }); setShowModal(false); reset(); },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/leave/applications/${id}/approve`, { level: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-applications'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/leave/applications/${id}/reject`, { level: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-applications'] }),
  });

  const TABS: { label: string; value: LeaveStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Leave Applications" subtitle="Manage and approve employee leave requests" />
        <button
          onClick={() => { reset({ is_half_day: false }); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Apply Leave
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusFilter === t.value ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading...</p>
        ) : !data?.items.length ? (
          <p className="p-8 text-center text-slate-400">No applications found.</p>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Leave Type</th>
                  <th className="px-4 py-3 text-left">From</th>
                  <th className="px-4 py-3 text-left">To</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-left">Applied On</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{app.employee_name}</p>
                      <p className="text-xs text-slate-400">{app.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.leave_type_name}</td>
                    <td className="px-4 py-3 text-slate-600">{app.from_date}</td>
                    <td className="px-4 py-3 text-slate-600">{app.to_date}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">{app.total_days}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(app.applied_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewItem(app)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                          <Eye className="h-4 w-4" />
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(app.id)}
                              disabled={approveMutation.isPending}
                              className="rounded-md p-1.5 text-green-500 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(app.id)}
                              disabled={rejectMutation.isPending}
                              className="rounded-md p-1.5 text-red-400 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">Total: {data.total}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1 text-sm text-slate-600">{page} / {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Apply Leave</h2>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                <select {...register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                </select>
                {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type *</label>
                <select {...register('leave_type_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select leave type</option>
                  {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
                </select>
                {errors.leave_type_id && <p className="text-xs text-red-500 mt-1">{errors.leave_type_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">From Date *</label>
                  <input type="date" {...register('from_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.from_date && <p className="text-xs text-red-500 mt-1">{errors.from_date.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">To Date *</label>
                  <input type="date" {...register('to_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.to_date && <p className="text-xs text-red-500 mt-1">{errors.to_date.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                <textarea {...register('reason')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('is_half_day')} className="rounded border-slate-300 text-primary-600" />
                Half Day
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Leave Application Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Employee</dt><dd className="font-medium">{viewItem.employee_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Leave Type</dt><dd>{viewItem.leave_type_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Period</dt><dd>{viewItem.from_date} → {viewItem.to_date}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Days</dt><dd>{viewItem.total_days}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewItem.status]}`}>{viewItem.status}</span></dd></div>
              <div className="pt-2"><dt className="text-slate-500 mb-1">Reason</dt><dd className="text-slate-700 bg-slate-50 rounded-lg p-2">{viewItem.reason}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewItem(null)} className="rounded-lg px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
