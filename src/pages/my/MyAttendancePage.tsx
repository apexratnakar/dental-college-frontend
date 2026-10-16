import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import type { MyAttendance } from '../../types';
import { MyPageState } from './MyPageState';
import { ATTENDANCE_MIN, humanize } from './format';

const STATUS_BADGE: Record<string, string> = {
  present: 'badge-green',
  late: 'badge-yellow',
  absent: 'badge-red',
  excused: 'bg-slate-100 text-slate-600',
};

export function MyAttendancePage() {
  const { data, isLoading, error } = useQuery<MyAttendance>({
    queryKey: ['me', 'attendance'],
    queryFn: () => meApi.attendance().then((r) => r.data),
  });

  const low = (pct: number) => pct < ATTENDANCE_MIN;

  return (
    <div>
      <PageTitle
        title="My Attendance"
        subtitle={`Present and late both count as attended. You need at least ${ATTENDANCE_MIN}% in each subject.`}
      />
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={!!data && data.total_classes === 0}
        emptyText="No attendance has been recorded for you yet."
      >
        {data && (
          <div className="space-y-6">
            <div className="card flex flex-wrap items-center gap-x-10 gap-y-4 p-5">
              <div>
                <p className="text-sm text-slate-500">Overall</p>
                <p className={cn('text-4xl font-bold tabular-nums', low(data.overall_percentage) ? 'text-red-600' : 'text-emerald-600')}>
                  {data.overall_percentage}%
                </p>
              </div>
              <div className="text-sm text-slate-600 tabular-nums">
                Attended <span className="font-semibold text-slate-900">{data.attended}</span> of{' '}
                <span className="font-semibold text-slate-900">{data.total_classes}</span> classes
              </div>
              {data.subjects.some((s) => low(s.percentage)) && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {data.subjects.filter((s) => low(s.percentage)).length} subject(s) below {ATTENDANCE_MIN}%
                </p>
              )}
            </div>

            <section className="card overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-right">Classes</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Late</th>
                    <th className="px-4 py-3 text-right">Absent</th>
                    <th className="px-4 py-3 w-56">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {data.subjects.map((s) => (
                    <tr key={s.subject_id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.subject_name}</p>
                        <p className="text-xs text-slate-500">{s.subject_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{s.total_classes}</td>
                      <td className="px-4 py-3 text-right">{s.present}</td>
                      <td className="px-4 py-3 text-right">{s.late}</td>
                      <td className="px-4 py-3 text-right">{s.absent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative h-2 flex-1 rounded-full bg-slate-100">
                            <div
                              className={cn('h-2 rounded-full', low(s.percentage) ? 'bg-red-500' : 'bg-emerald-500')}
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            />
                            <div className="absolute top-[-3px] h-3.5 w-px bg-slate-400" style={{ left: `${ATTENDANCE_MIN}%` }} title={`${ATTENDANCE_MIN}% minimum`} />
                          </div>
                          <span className={cn('w-12 text-right font-medium', low(s.percentage) ? 'text-red-600' : 'text-slate-900')}>
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Recent classes</h2>
              <ul className="divide-y divide-slate-100">
                {data.recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-slate-900">{r.subject_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateShort(r.record_date)}{r.start_time && ` · ${r.start_time}`}
                        {r.topic_covered && ` · ${r.topic_covered}`}
                      </p>
                    </div>
                    <span className={cn('badge shrink-0', STATUS_BADGE[r.status])}>{humanize(r.status)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </MyPageState>
    </div>
  );
}
