import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Save, CheckCircle2 } from 'lucide-react';
import { attendanceApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { getErrorMessage } from '../../types';
import type { AttendanceDetail, AttendanceEntry, AttendanceStatus } from '../../types';

// ── Status button group ───────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'P', color: 'bg-green-100 text-green-700 ring-green-400' },
  { value: 'absent', label: 'A', color: 'bg-red-100 text-red-700 ring-red-400' },
  { value: 'late', label: 'L', color: 'bg-yellow-100 text-yellow-700 ring-yellow-400' },
  { value: 'excused', label: 'E', color: 'bg-blue-100 text-blue-700 ring-blue-400' },
];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export function AttendanceMarkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [localStatus, setLocalStatus] = useState<Record<number, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['attendance-detail', id],
    queryFn: async () => {
      const { data } = await attendanceApi.get(Number(id));
      const d = data as AttendanceDetail;
      // Initialise local status from server data
      const init: Record<number, AttendanceStatus> = {};
      d.entries.forEach((e) => {
        init[e.student_id] = e.status;
      });
      setLocalStatus(init);
      return d;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!detail) throw new Error('Not loaded');
      const entries = detail.entries.map((e) => ({
        student_id: e.student_id,
        status: localStatus[e.student_id] ?? 'absent',
        remarks: null,
      }));
      return attendanceApi.mark(Number(id), entries);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-detail', id] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const markAll = (status: AttendanceStatus) => {
    if (!detail) return;
    const updated: Record<number, AttendanceStatus> = {};
    detail.entries.forEach((e) => { updated[e.student_id] = status; });
    setLocalStatus(updated);
    setSaved(false);
  };

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;

  if (!detail) {
    return (
      <div className="py-12 text-center text-slate-500">
        Record not found.{' '}
        <button onClick={() => navigate('/attendance')} className="text-primary-600 underline">
          Go back
        </button>
      </div>
    );
  }

  const presentCount = Object.values(localStatus).filter((s) => s === 'present').length;
  const absentCount = Object.values(localStatus).filter((s) => s === 'absent').length;
  const lateCount = Object.values(localStatus).filter((s) => s === 'late').length;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Attendance
        </button>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="text-sm font-medium text-slate-700">
          {detail.subject_name} — {detail.record_date}
        </span>
      </div>

      {/* Session info */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subject</p>
            <p className="mt-0.5 font-semibold text-slate-900">{detail.subject_name}</p>
            <p className="text-xs text-slate-400 font-mono">{detail.subject_code}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Section</p>
            <p className="mt-0.5 font-semibold text-slate-900">{detail.section_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</p>
            <p className="mt-0.5 font-semibold text-slate-900">{detail.record_date}</p>
            {detail.start_time && (
              <p className="text-xs text-slate-400">{detail.start_time}–{detail.end_time ?? '?'}</p>
            )}
          </div>
          {detail.topic_covered && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Topic</p>
              <p className="mt-0.5 text-slate-700">{detail.topic_covered}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk actions + stats */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Mark all:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => markAll(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${opt.color} ring-1 ring-transparent hover:ring-current`}
            >
              {STATUS_LABELS[opt.value]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 font-medium">{presentCount} Present</span>
          <span className="text-red-500 font-medium">{absentCount} Absent</span>
          {lateCount > 0 && <span className="text-yellow-600 font-medium">{lateCount} Late</span>}
        </div>
      </div>

      {/* Student list */}
      {!detail.entries.length ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No students found for this section. Ensure students are enrolled and active.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-8">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Enrollment</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {detail.entries.map((entry: AttendanceEntry, idx) => {
                const current = localStatus[entry.student_id] ?? 'absent';
                return (
                  <tr
                    key={entry.student_id}
                    className={
                      current === 'absent' ? 'bg-red-50/30' :
                      current === 'present' ? 'bg-green-50/20' :
                      current === 'late' ? 'bg-yellow-50/30' : ''
                    }
                  >
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{entry.student_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {entry.enrollment_number}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setLocalStatus((prev) => ({
                                ...prev,
                                [entry.student_id]: opt.value,
                              }));
                              setSaved(false);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              current === opt.value
                                ? `${opt.color} ring-2 ring-offset-1 ring-current`
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save bar */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Attendance saved successfully
            </span>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !detail.entries.length}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
}
