import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Users2 } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { Hostel, HostelVisitor, PaginatedResponse } from '../../types';

export function HostelVisitorsPage() {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [checkedInOnly, setCheckedInOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: hostels } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => { const { data } = await hostelApi.listHostels(); return data as Hostel[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-visitors-global', hostelId, checkedInOnly, page],
    queryFn: async () => {
      const { data } = await hostelApi.listVisitors({
        hostel_id: hostelId || undefined,
        checked_in_only: checkedInOnly || undefined,
        page, per_page: 20,
      });
      return data as PaginatedResponse<HostelVisitor>;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: number) => hostelApi.checkoutVisitor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-visitors-global'] }),
  });

  return (
    <div>
      <PageTitle
        title="Hostel Visitors"
        subtitle="Visitor entry and exit log for all hostels"
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
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={checkedInOnly}
            onChange={(e) => { setCheckedInOnly(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Currently inside only
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-16 text-center">
          <Users2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No visitor records found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Visitor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Hostel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Purpose</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Check-in</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Check-out</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{v.visitor_name}</p>
                    <p className="text-xs text-slate-400">{v.relation}{v.visitor_phone && ` · ${v.visitor_phone}`}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{v.hostel_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{v.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{v.enrollment_number}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{v.purpose ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(v.check_in_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {v.check_out_time
                      ? new Date(v.check_out_time).toLocaleString()
                      : <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Inside</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!v.check_out_time && (
                      <button
                        onClick={() => checkoutMutation.mutate(v.id)}
                        disabled={checkoutMutation.isPending}
                        className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 ml-auto disabled:opacity-40"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{data.total} records</span>
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
