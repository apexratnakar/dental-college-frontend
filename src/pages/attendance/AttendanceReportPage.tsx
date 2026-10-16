import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { sessionsApi, sectionsApi, subjectsApi, attendanceApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { StudentAttendanceReport, SubjectAttendanceSummary } from '../../types';
import { useCurrentSession } from '../../hooks/useCurrentSession';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctColor(pct: number): string {
  if (pct >= 75) return 'text-green-700 bg-green-50';
  if (pct >= 60) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
}

function PctBadge({ pct, shortage }: { pct: number; shortage: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${pctColor(pct)}`}
    >
      {shortage && <AlertTriangle className="h-3 w-3" />}
      {pct.toFixed(1)}%
    </span>
  );
}

// ── Single-subject table ──────────────────────────────────────────────────────

function SingleSubjectTable({ data }: { data: StudentAttendanceReport[] }) {
  // all students have exactly 1 subject summary when filtered
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 w-8">#</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Enrollment</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Total</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Present</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Late</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Absent</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Excused</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, idx) => {
            const s: SubjectAttendanceSummary | undefined = row.subjects[0];
            if (!s) return null;
            return (
              <tr key={row.student_id} className={s.has_shortage ? 'bg-red-50/40' : ''}>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{row.student_name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.enrollment_number}</td>
                <td className="px-4 py-2.5 text-center text-slate-700">{s.total_classes}</td>
                <td className="px-4 py-2.5 text-center text-green-700 font-medium">{s.present}</td>
                <td className="px-4 py-2.5 text-center text-yellow-700 font-medium">{s.late}</td>
                <td className="px-4 py-2.5 text-center text-red-600 font-medium">{s.absent}</td>
                <td className="px-4 py-2.5 text-center text-blue-600 font-medium">{s.excused}</td>
                <td className="px-4 py-2.5 text-center">
                  <PctBadge pct={s.percentage} shortage={s.has_shortage} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Multi-subject cross-tab ───────────────────────────────────────────────────

function MultiSubjectTable({ data }: { data: StudentAttendanceReport[] }) {
  // Collect all unique subjects in order (sorted by name — backend already sorts)
  const subjectMap = new Map<number, { name: string; code: string }>();
  data.forEach((row) => {
    row.subjects.forEach((s) => {
      if (!subjectMap.has(s.subject_id)) {
        subjectMap.set(s.subject_id, { name: s.subject_name, code: s.subject_code });
      }
    });
  });
  const subjects = Array.from(subjectMap.entries()); // [id, {name, code}]

  if (!subjects.length) {
    return (
      <div className="card py-12 text-center text-sm text-slate-400">
        No attendance records found for the selected filters.
      </div>
    );
  }

  const shortageCount = data.filter((r) => r.subjects.some((s) => s.has_shortage)).length;

  return (
    <>
      {shortageCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{shortageCount}</strong> student{shortageCount > 1 ? 's have' : ' has'} attendance shortage (&lt;75%) in one or more subjects.
          </span>
        </div>
      )}

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 w-8 sticky left-0 bg-slate-50">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 sticky left-8 bg-slate-50 whitespace-nowrap">Student</th>
              {subjects.map(([sid, subj]) => (
                <th key={sid} className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap min-w-[90px]">
                  <span className="block text-xs text-slate-500 font-mono">{subj.code}</span>
                  <span className="block text-xs">{subj.name}</span>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap border-l border-slate-200">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row, idx) => {
              const bySubject = new Map<number, SubjectAttendanceSummary>();
              row.subjects.forEach((s) => bySubject.set(s.subject_id, s));
              const hasAnyShortage = row.subjects.some((s) => s.has_shortage);

              return (
                <tr key={row.student_id} className={hasAnyShortage ? 'bg-red-50/20' : ''}>
                  <td className="px-4 py-2.5 text-slate-400 text-xs sticky left-0 bg-inherit">{idx + 1}</td>
                  <td className="px-4 py-2.5 sticky left-8 bg-inherit">
                    <p className="font-medium text-slate-900 whitespace-nowrap">{row.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{row.enrollment_number}</p>
                  </td>
                  {subjects.map(([sid]) => {
                    const s = bySubject.get(sid);
                    if (!s) {
                      return (
                        <td key={sid} className="px-3 py-2.5 text-center text-slate-300 text-xs">—</td>
                      );
                    }
                    return (
                      <td key={sid} className="px-3 py-2.5 text-center">
                        <PctBadge pct={s.percentage} shortage={s.has_shortage} />
                        <p className="mt-0.5 text-xs text-slate-400">{s.present + s.late}/{s.total_classes}</p>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center border-l border-slate-100">
                    {row.overall_percentage != null ? (
                      <PctBadge
                        pct={row.overall_percentage}
                        shortage={row.overall_percentage < 75}
                      />
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AttendanceReportPage() {
  const [sessionIdChoice, setSessionId] = useState<string | null>(null);
  const currentSession = useCurrentSession();
  // Current session until the user picks another one
  const sessionId = sessionIdChoice ?? (currentSession ? String(currentSession.id) : '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // ── Filter data ────────────────────────────────────────────────────────────
  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return (data as { id: number; name: string; is_current?: boolean }[]);
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', sessionId],
    queryFn: async () => {
      const { data } = await sectionsApi.list({ session_id: Number(sessionId), per_page: 200 });
      return (data as { items: { id: number; name: string }[] }).items;
    },
    enabled: !!sessionId,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const { data } = await subjectsApi.list({ per_page: 200 });
      return (data as { items: { id: number; name: string; code: string }[] }).items;
    },
    enabled: !!sectionId,
  });

  // ── Report data ────────────────────────────────────────────────────────────
  const canFetch = !!sessionId && !!sectionId;

  const {
    data: report,
    isLoading: reportLoading,
    isFetching,
  } = useQuery({
    queryKey: ['attendance-report', sessionId, sectionId, subjectId],
    queryFn: async () => {
      const params: { academic_session_id: number; section_id: number; subject_id?: number } = {
        academic_session_id: Number(sessionId),
        section_id: Number(sectionId),
      };
      if (subjectId) params.subject_id = Number(subjectId);
      const { data } = await attendanceApi.report(params);
      return data as StudentAttendanceReport[];
    },
    enabled: canFetch,
  });

  const isSingleSubject = !!subjectId;

  return (
    <div>
      <PageTitle
        title="Attendance Report"
        subtitle="Per-student, per-subject attendance summary with shortage detection"
      />

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <select
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setSectionId(''); setSubjectId(''); }}
              className="input w-full"
            >
              <option value="">Select session…</option>
              {sessions?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setSubjectId(''); }}
              className="input w-full"
              disabled={!sessionId}
            >
              <option value="">Select section…</option>
              {sections?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Subject (optional)
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="input w-full"
              disabled={!sectionId}
            >
              <option value="">All subjects</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        {!canFetch && (
          <p className="mt-3 text-xs text-slate-400">
            Select an academic session and section to generate the report.
          </p>
        )}
      </div>

      {/* Report */}
      {canFetch && (
        <>
          {(reportLoading || isFetching) ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : !report || !report.length ? (
            <div className="card py-12 text-center text-sm text-slate-400">
              No students or attendance records found for the selected filters.
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-600 font-medium">{report.length} students</span>
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {report.filter((r) => !r.subjects.some((s) => s.has_shortage)).length} no shortage
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {report.filter((r) => r.subjects.some((s) => s.has_shortage)).length} with shortage
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Simple CSV export
                    if (!report.length) return;
                    const subjects = Array.from(
                      new Map(
                        report.flatMap((r) => r.subjects.map((s) => [s.subject_id, s.subject_name]))
                      ).entries()
                    );
                    const header = ['Enrollment', 'Student', ...subjects.map(([, n]) => n), 'Overall %'];
                    const rows = report.map((r) => {
                      const bySubj = new Map(r.subjects.map((s) => [s.subject_id, s.percentage]));
                      return [
                        r.enrollment_number,
                        r.student_name,
                        ...subjects.map(([id]) => bySubj.get(id)?.toFixed(1) ?? '—'),
                        r.overall_percentage?.toFixed(1) ?? '—',
                      ];
                    });
                    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance_report_section${sectionId}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              {/* Table */}
              {isSingleSubject
                ? <SingleSubjectTable data={report} />
                : <MultiSubjectTable data={report} />
              }

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-200" /> ≥75% — No shortage
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-200" /> 60–74% — At risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-200" /> &lt;60% — Critical
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
