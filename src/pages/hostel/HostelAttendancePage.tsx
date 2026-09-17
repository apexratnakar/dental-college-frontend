import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type {
  Hostel, HostelAllocation, HostelAttendanceRecord,
  HostelAttendanceStatus, PaginatedResponse,
} from '../../types';
import { getErrorMessage } from '../../types';

const ATT_STATUS_STYLES: Record<HostelAttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  on_leave: 'bg-amber-100 text-amber-700',
  outing: 'bg-blue-100 text-blue-700',
};

// ── Mark Attendance Panel ──────────────────────────────────────────────────────

function MarkAttendancePanel({ hostelId, onDone }: { hostelId: number; onDone: () => void }) {
  const [attendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<number, HostelAttendanceStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: allocData, isLoading } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });

  const students = allocData?.items ?? [];
  const getStatus = (id: number): HostelAttendanceStatus => statuses[id] ?? 'present';
  const setStatus = (id: number, s: HostelAttendanceStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: s }));
  const markAll = (s: HostelAttendanceStatus) => {
    const u: Record<number, HostelAttendanceStatus> = {};
    students.forEach((a) => { u[a.student_id] = s; });
    setStatuses(u);
  };

  const handleSubmit = async () => {
    if (!students.length) { setError('No active residents.'); return; }
    setSubmitting(true); setError(null);
    try {
      await hostelApi.submitAttendance({
        hostel_id: hostelId,
        date: attendanceDate,
        entries: students.map((a) => ({ student_id: a.student_id, status: getStatus(a.student_id) })),
      });
      onDone();
    } catch (err) { setError(getErrorMessage(err)); setSubmitting(false); }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900 text-sm">Mark Attendance — {attendanceDate}</p>
          <p className="text-xs text-slate-500">{students.length} residents</p>
        </div>
        <div className="flex gap-2 text-xs">
          {(['present', 'absent', 'on_leave', 'outing'] as HostelAttendanceStatus[]).map((s) => (
            <button key={s} onClick={() => markAll(s)} className={`rounded-full px-2.5 py-0.5 font-medium ${ATT_STATUS_STYLES[s]}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      {!students.length ? (
        <p className="text-center text-sm text-slate-400 py-8">No active residents for this hostel.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-50">
            {students.map((a) => {
              const cur = getStatus(a.student_id);
              return (
                <tr key={a.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{a.student_name}</p>
                    <p className="text-xs text-slate-400">{a.enrollment_number} · Rm {a.room_number}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      {(['present', 'absent', 'on_leave', 'outing'] as HostelAttendanceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(a.student_id, s)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            cur === s
                              ? ATT_STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-current'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="ml-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !students.length}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Spinner /> : <CheckSquare className="h-4 w-4" />}
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function HostelAttendancePage() {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [showMarkPanel, setShowMarkPanel] = useState(false);
  const [page, setPage] = useState(1);

  const { data: hostels } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => { const { data } = await hostelApi.listHostels(); return data as Hostel[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-attendance-global', hostelId, page],
    queryFn: async () => {
      if (!hostelId) return null;
      const { data } = await hostelApi.listAttendance({ hostel_id: hostelId as number, page, per_page: 20 });
      return data as PaginatedResponse<HostelAttendanceRecord>;
    },
    enabled: !!hostelId,
  });

  const handleDone = () => {
    setShowMarkPanel(false);
    qc.invalidateQueries({ queryKey: ['hostel-attendance-global'] });
  };

  return (
    <div>
      <PageTitle
        title="Hostel Attendance"
        subtitle="Daily roll-call records for hostel residents"
      />

      {/* Hostel selector + Mark button */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={hostelId}
          onChange={(e) => { setHostelId(e.target.value ? Number(e.target.value) : ''); setPage(1); setShowMarkPanel(false); }}
          className="input text-sm"
        >
          <option value="">Select a hostel…</option>
          {hostels?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        {hostelId && (
          <button
            onClick={() => setShowMarkPanel((v) => !v)}
            className="btn-primary flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            {showMarkPanel ? 'Hide Panel' : "Mark Today's Attendance"}
          </button>
        )}
      </div>

      {/* Mark attendance panel */}
      {showMarkPanel && hostelId && (
        <div className="mb-6">
          <MarkAttendancePanel hostelId={hostelId as number} onDone={handleDone} />
        </div>
      )}

      {/* History */}
      {!hostelId ? (
        <div className="card py-16 text-center">
          <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Select a hostel to view attendance history.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-12 text-center text-sm text-slate-400">No attendance records yet for this hostel.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Present</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Absent</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">On Leave</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Outing</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((a) => {
                const total = a.present_count + a.absent_count + a.on_leave_count + a.outing_count;
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{a.date}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">{a.present_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">{a.absent_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">{a.on_leave_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">{a.outing_count}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{total}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.marked_by_name ?? '—'}</td>
                  </tr>
                );
              })}
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
