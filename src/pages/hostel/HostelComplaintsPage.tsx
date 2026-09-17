import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { Hostel, HostelComplaint, ComplaintStatus, ComplaintPriority, PaginatedResponse } from '../../types';

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};

const PRIORITY_STYLES: Record<ComplaintPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const STATUS_NEXT: Partial<Record<ComplaintStatus, { label: string; status: ComplaintStatus }>> = {
  open: { label: 'Mark In Progress', status: 'in_progress' },
  in_progress: { label: 'Resolve', status: 'resolved' },
};

export function HostelComplaintsPage() {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: hostels } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => { const { data } = await hostelApi.listHostels(); return data as Hostel[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-complaints-global', hostelId, statusFilter, page],
    queryFn: async () => {
      const { data } = await hostelApi.listComplaints({
        hostel_id: hostelId || undefined,
        status: statusFilter || undefined,
        page, per_page: 20,
      });
      return data as PaginatedResponse<HostelComplaint>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ComplaintStatus }) =>
      hostelApi.updateComplaint(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-complaints-global'] }),
  });

  return (
    <div>
      <PageTitle
        title="Hostel Complaints"
        subtitle="Track and resolve complaints raised by hostel residents"
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
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-16 text-center">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No complaints found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Hostel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((c) => {
                const next = STATUS_NEXT[c.status];
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.student_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{c.enrollment_number}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.hostel_name}{c.room_number && ` · Rm ${c.room_number}`}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{c.complaint_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {next && (
                        <button
                          onClick={() => updateMutation.mutate({ id: c.id, status: next.status })}
                          disabled={updateMutation.isPending}
                          className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        >
                          {next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{data.total} complaints</span>
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
