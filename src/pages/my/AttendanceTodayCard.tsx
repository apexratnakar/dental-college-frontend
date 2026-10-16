import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { meApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { cn } from '../../utils';
import { getErrorMessage } from '../../types';
import type { MyAttendanceToday } from '../../types';
import { ATTENDANCE_STATUS, time12 } from './format';

/** Today's check-in / check-out, used on My Attendance and the staff dashboard. */
export function AttendanceTodayCard() {
  const qc = useQueryClient();
  const [wfh, setWfh] = useState(false);
  const [remarks, setRemarks] = useState('');
  const { data: t, isLoading, error } = useQuery<MyAttendanceToday>({
    queryKey: ['me', 'staff-attendance', 'today'],
    queryFn: () => meApi.attendanceToday().then((r) => r.data),
    refetchInterval: 60_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['me', 'staff-attendance'] });
  const checkIn = useMutation({ mutationFn: () => meApi.checkIn({ work_from_home: wfh, remarks }), onSuccess: refresh });
  const checkOut = useMutation({ mutationFn: () => meApi.checkOut(), onSuccess: refresh });
  const failure = checkIn.error || checkOut.error;

  if (isLoading) return <div className="card flex justify-center p-8"><Spinner /></div>;
  if (error || !t) return <div className="card p-5 text-sm text-red-700">{getErrorMessage(error)}</div>;

  const rec = t.record;
  const status = rec ? ATTENDANCE_STATUS[rec.status] : null;
  const dateLabel = new Date(t.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today's attendance</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{dateLabel}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Office starts {time12(t.office_start)} · time now {time12(t.server_time)}
          </p>
        </div>
        {status && <span className={cn('badge text-sm', status.cls)}>{status.label}</span>}
      </div>

      {rec && (rec.check_in || rec.check_out) && (
        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 px-4 py-3 text-center">
          <div><dt className="text-xs text-slate-500">Checked in</dt><dd className="font-semibold tabular-nums text-slate-900">{rec.check_in ? time12(rec.check_in) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Checked out</dt><dd className="font-semibold tabular-nums text-slate-900">{rec.check_out ? time12(rec.check_out) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Hours</dt><dd className="font-semibold tabular-nums text-slate-900">{rec.hours_worked ?? '—'}</dd></div>
        </dl>
      )}

      {t.message && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{t.message}</p>}

      {t.can_check_in && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={wfh} onChange={(e) => setWfh(e.target.checked)} /> Working from home today
            </label>
          </div>
          <input
            className="input w-full"
            placeholder="Note (optional)"
            value={remarks}
            maxLength={500}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <button className="btn-primary w-full sm:w-auto" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
            <LogIn className="h-4 w-4" /> {checkIn.isPending ? 'Checking in…' : 'Check in now'}
          </button>
        </div>
      )}
      {t.can_check_out && (
        <div className="mt-4">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
            <LogOut className="h-4 w-4" /> {checkOut.isPending ? 'Checking out…' : 'Check out now'}
          </button>
          <p className="mt-1.5 text-xs text-slate-500">Leaving after less than 4 hours marks the day as a half day.</p>
        </div>
      )}
      {failure && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(failure)}</p>}
    </section>
  );
}
