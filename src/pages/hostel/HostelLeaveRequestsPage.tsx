import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, CalendarOff } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import type { Hostel, HostelLeaveRequest, HostelLeaveStatus, PaginatedResponse } from '../../types';

const LEAVE_STATUS_STYLES: Record<HostelLeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export function HostelLeaveRequestsPage() {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: hostels } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => { const { data } = await hostelApi.listHostels(); return data as Hostel[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-leave-requests-global', hostelId, statusFilter, page],
    queryFn: async () => {
      const { data } = await hostelApi.listLeaveRequests({
        hostel_id: hostelId || undefined,
        status: statusFilter || undefined,
        page, per_page: 20,
      });
      return data as PaginatedResponse<HostelLeaveRequest>;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => hostelApi.approveLeaveRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-leave-requests-global'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => hostelApi.rejectLeaveRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-leave-requests-global'] }),
  });

  return (
    <div>
      <PageTitle
        title="Hostel Leave & Outing"
        subtitle="Manage leave and outing requests from hostel residents"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={hostelId}
          onChange={(e) => { setHostelId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          className="input text-sm"
        >
          <option value="">All Hostels</option>
          {hostels?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-16 text-center">
          <CalendarOff className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No leave requests found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Hostel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Dates</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((lr) => (
                <tr key={lr.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{lr.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{lr.enrollment_number}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{lr.hostel_name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{lr.leave_type}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{lr.from_date} → {lr.to_date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{lr.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEAVE_STATUS_STYLES[lr.status]}`}>
                      {lr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lr.status === 'pending' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => approveMutation.mutate(lr.id)}
                          disabled={approveMutation.isPending}
                          title="Approve"
                          className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(lr.id)}
                          disabled={rejectMutation.isPending}
                          title="Reject"
                          className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {lr.status !== 'pending' && lr.approved_by_name && (
                      <p className="text-xs text-slate-400">{lr.approved_by_name}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{data.total} requests</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                <span>Page {page}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={data.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
