import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn } from '../../utils';
import type { MyAttendanceMonth } from '../../types';
import { MyPageState } from './MyPageState';
import { AttendanceTodayCard } from './AttendanceTodayCard';
import { ATTENDANCE_STATUS, time12 } from './format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function MyWorkAttendancePage() {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const isCurrent = ym.year === now.getFullYear() && ym.month === now.getMonth() + 1;
  const shift = (d: number) => setYm(({ year, month }) => {
    const m = month + d;
    return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
  });

  const { data, isLoading, error } = useQuery<MyAttendanceMonth>({
    queryKey: ['me', 'staff-attendance', 'month', ym.year, ym.month],
    queryFn: () => meApi.attendanceMonth(ym.year, ym.month).then((r) => r.data),
  });

  return (
    <div>
      <PageTitle title="My Attendance" subtitle="Check in when you arrive and check out when you leave. Times are taken from the office clock." />
      <div className="space-y-6">
        <AttendanceTodayCard />

        <section className="card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <button className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => shift(-1)} title="Previous month"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="w-36 text-center text-sm font-semibold text-slate-800">{MONTHS[ym.month - 1]} {ym.year}</h2>
              <button className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" onClick={() => shift(1)} disabled={isCurrent} title="Next month"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data?.summary ?? {}).map(([k, n]) => (
                <span key={k} className={cn('badge', ATTENDANCE_STATUS[k]?.cls)}>{ATTENDANCE_STATUS[k]?.label ?? k}: {n}</span>
              ))}
            </div>
          </header>
          <MyPageState isLoading={isLoading} error={error} isEmpty={!!data && data.days.length === 0} emptyText="No attendance recorded this month.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">In</th>
                    <th className="px-4 py-2.5">Out</th>
                    <th className="px-4 py-2.5 text-right">Hours</th>
                    <th className="px-4 py-2.5">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {[...(data?.days ?? [])].reverse().map((d) => {
                    const s = ATTENDANCE_STATUS[d.status];
                    return (
                      <tr key={d.date}>
                        <td className="px-4 py-2.5 text-slate-900">
                          {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('badge', s?.cls)}>{s?.label ?? d.status}</span>
                          {!d.self_marked && <span className="ml-1.5 text-[11px] text-slate-400">by HR</span>}
                        </td>
                        <td className="px-4 py-2.5">{d.check_in ? time12(d.check_in) : '—'}</td>
                        <td className="px-4 py-2.5">{d.check_out ? time12(d.check_out) : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{d.hours_worked ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{d.remarks ?? ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </MyPageState>
        </section>
      </div>
    </div>
  );
}
