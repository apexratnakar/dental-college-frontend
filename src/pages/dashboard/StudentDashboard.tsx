import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, BookCopy, CalendarCheck, Receipt } from 'lucide-react';
import { meApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { cn, formatDateShort } from '../../utils';
import type {
  BookIssue, MyAttendance, MyExamResult, MyHostel, MyStudentProfile, MyUpcomingExam, StudentFeeStatement, TimetableSlot,
} from '../../types';
import { ATTENDANCE_MIN, PAPER_KIND, daysUntil, humanize, inr, time12 } from '../my/format';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function Tile({ to, icon: Icon, label, value, note, tone = 'neutral' }: {
  to: string; icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; note?: string; tone?: 'good' | 'bad' | 'neutral';
}) {
  return (
    <Link to={to} className="card group p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={cn('mt-2 text-2xl font-bold tabular-nums',
        tone === 'good' && 'text-emerald-600', tone === 'bad' && 'text-red-600', tone === 'neutral' && 'text-slate-900')}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </Link>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  // Each tile fails independently, so one missing module never blanks the dashboard.
  const opts = { retry: false } as const;
  const profile = useQuery<MyStudentProfile>({ queryKey: ['me', 'profile'], queryFn: () => meApi.profile().then((r) => r.data), ...opts });
  const attendance = useQuery<MyAttendance>({ queryKey: ['me', 'attendance'], queryFn: () => meApi.attendance().then((r) => r.data), ...opts });
  const fees = useQuery<StudentFeeStatement>({ queryKey: ['me', 'fees'], queryFn: () => meApi.fees().then((r) => r.data), ...opts });
  const library = useQuery<BookIssue[]>({ queryKey: ['me', 'library'], queryFn: () => meApi.library().then((r) => r.data), ...opts });
  const results = useQuery<MyExamResult[]>({ queryKey: ['me', 'results'], queryFn: () => meApi.results().then((r) => r.data), ...opts });
  const timetable = useQuery<TimetableSlot[]>({ queryKey: ['me', 'timetable'], queryFn: () => meApi.timetable().then((r) => r.data), ...opts });
  const exams = useQuery<MyUpcomingExam[]>({ queryKey: ['me', 'exams'], queryFn: () => meApi.exams().then((r) => r.data), ...opts });
  const hostel = useQuery<MyHostel>({ queryKey: ['me', 'hostel'], queryFn: () => meApi.hostel().then((r) => r.data), ...opts });

  const p = profile.data;
  const att = attendance.data;
  const borrowed = (library.data ?? []).filter((i) => i.status === 'issued' || i.status === 'overdue');
  const overdue = borrowed.filter((i) => i.status === 'overdue').length;
  const latest = results.data?.[0];
  const today = DAYS[new Date().getDay()];
  const todaysClasses = (timetable.data ?? [])
    .filter((s) => s.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  // Next five papers across all announced exams, soonest first
  const upcomingPapers = (exams.data ?? [])
    .flatMap((e) => e.papers.map((p) => ({ ...p, examName: e.exam_name })))
    .sort((a, b) => (a.exam_date + (a.start_time ?? '')).localeCompare(b.exam_date + (b.start_time ?? '')))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hello, {user?.first_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {p ? `${p.enrollment_number} · ${p.course_code ?? ''} Year ${p.year_of_study}${p.section_name ? ` · Section ${p.section_name}` : ''}` : ' '}
          {hostel.data?.allocated && (
            <Link to="/my/hostel" className="ml-1 text-primary-600 hover:underline">
              · {hostel.data.hostel_name}, Room {hostel.data.room_number}
            </Link>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          to="/my/attendance" icon={CalendarCheck} label="Attendance"
          value={att ? (att.total_classes ? `${att.overall_percentage}%` : '—') : '…'}
          note={att?.total_classes ? `${att.attended} of ${att.total_classes} classes` : 'No classes recorded yet'}
          tone={att && att.total_classes ? (att.overall_percentage < ATTENDANCE_MIN ? 'bad' : 'good') : 'neutral'}
        />
        <Tile
          to="/my/fees" icon={Receipt} label="Fee balance"
          value={fees.data ? inr(fees.data.total_balance) : fees.isError ? '—' : '…'}
          note={fees.data ? `Paid ${inr(fees.data.total_paid)} of ${inr(fees.data.total_due)}` : undefined}
          tone={fees.data ? (fees.data.total_balance > 0 ? 'bad' : 'good') : 'neutral'}
        />
        <Tile
          to="/my/library" icon={BookCopy} label="Books borrowed"
          value={library.data ? String(borrowed.length) : '…'}
          note={overdue ? `${overdue} overdue` : borrowed.length ? 'None overdue' : undefined}
          tone={overdue ? 'bad' : 'neutral'}
        />
        <Tile
          to="/my/results" icon={Award} label="Latest result"
          value={latest ? (latest.percentage !== null ? `${latest.percentage.toFixed(1)}%` : humanize(latest.result_status)) : results.data ? '—' : '…'}
          note={latest ? latest.exam_name : 'No published results yet'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming exams &amp; practicals</h2>
            <Link to="/my/exams" className="text-sm text-primary-600 hover:underline">My exams</Link>
          </header>
          {upcomingPapers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              {exams.isLoading ? 'Loading…' : 'No upcoming exams or practicals.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingPapers.map((p) => {
                const kind = PAPER_KIND[p.kind] ?? PAPER_KIND.theory;
                return (
                  <li key={p.schedule_id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <div className="w-24 shrink-0 tabular-nums">
                      <p className="text-slate-900">{formatDateShort(p.exam_date)}</p>
                      <p className="text-xs text-primary-600">{daysUntil(p.exam_date)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{p.subject_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.examName}
                        {p.start_time && ` · ${time12(p.start_time)}`}
                        {p.room_no && ` · ${p.room_no}`}
                      </p>
                    </div>
                    <span className={cn('badge shrink-0', kind.cls)}>{kind.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Today's classes</h2>
            <Link to="/my/timetable" className="text-sm text-primary-600 hover:underline">Full timetable</Link>
          </header>
          {todaysClasses.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No classes scheduled today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todaysClasses.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span className="w-36 shrink-0 tabular-nums text-slate-500">{time12(s.start_time)} – {time12(s.end_time)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{s.subject_name}</span>
                  <span className="hidden text-slate-500 sm:inline">{s.room_number ? `Room ${s.room_number}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {latest && (
        <section className="card">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Latest result · {latest.exam_name}</h2>
              <p className="text-xs text-slate-500">
                {humanize(latest.exam_type)}
                {latest.published_at && ` · Published ${formatDateShort(latest.published_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right tabular-nums">
                <span className="text-lg font-bold text-slate-900">
                  {latest.percentage !== null ? `${latest.percentage.toFixed(2)}%` : '—'}
                </span>
                {latest.grade && <span className="ml-2 text-sm font-medium text-slate-500">Grade {latest.grade}</span>}
                <p className="text-xs text-slate-500">
                  {latest.total_obtained ?? '—'} / {latest.total_max_marks ?? '—'} marks
                </p>
              </div>
              <span className={cn('badge', latest.is_pass ? 'badge-green' : latest.is_pass === false ? 'badge-red' : 'bg-slate-100 text-slate-600')}>
                {latest.is_pass ? 'Pass' : latest.is_pass === false ? 'Fail' : humanize(latest.result_status) || '—'}
              </span>
              <Link to="/my/results" className="text-sm text-primary-600 hover:underline">All results</Link>
            </div>
          </header>
          <ul className="divide-y divide-slate-100">
            {latest.subjects.map((s) => {
              const pct = s.marks_obtained !== null && s.max_marks ? (s.marks_obtained / s.max_marks) * 100 : 0;
              const passPct = s.passing_marks !== null && s.max_marks ? (s.passing_marks / s.max_marks) * 100 : null;
              return (
                <li key={s.subject_id} className="grid items-center gap-x-4 gap-y-1 px-5 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_14rem_4.5rem_3rem]">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{s.subject_name}</p>
                    <p className="text-xs text-slate-500">{s.subject_code}</p>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-100" title={passPct !== null ? `Pass mark ${s.passing_marks}` : undefined}>
                    <div
                      className={cn('h-2 rounded-full', s.is_pass === false ? 'bg-red-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    {passPct !== null && (
                      <div className="absolute top-[-3px] h-3.5 w-px bg-slate-400" style={{ left: `${passPct}%` }} />
                    )}
                  </div>
                  <span className="tabular-nums text-slate-700 sm:text-right">
                    {s.is_absent ? 'Absent' : `${s.marks_obtained ?? '—'} / ${s.max_marks ?? '—'}`}
                  </span>
                  <span className="font-medium text-slate-900 sm:text-center">{s.grade ?? '—'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
