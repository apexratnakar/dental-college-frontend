import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn } from '../../utils';
import type { DayOfWeek, TimetableSlot } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize, time12 } from './format';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TODAY = (['sunday', ...DAYS] as string[])[new Date().getDay()];

export function MyTimetablePage() {
  const { data: slots = [], isLoading, error } = useQuery<TimetableSlot[]>({
    queryKey: ['me', 'timetable'],
    queryFn: () => meApi.timetable().then((r) => r.data),
  });

  const byDay = DAYS.map((day) => ({
    day,
    slots: slots.filter((s) => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((d) => d.slots.length > 0);

  return (
    <div>
      <PageTitle title="My Timetable" subtitle="Weekly classes for your section." />
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={byDay.length === 0}
        emptyText="No timetable yet. Either you haven't been placed in a section, or your section's schedule hasn't been published."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byDay.map(({ day, slots: daySlots }) => (
            <section
              key={day}
              className={cn('card overflow-hidden', day === TODAY && 'ring-2 ring-primary-500')}
            >
              <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-slate-800">{humanize(day)}</h2>
                {day === TODAY && <span className="badge bg-primary-50 text-primary-700">Today</span>}
              </header>
              <ul className="divide-y divide-slate-100">
                {daySlots.map((s) => (
                  <li key={s.id} className="grid grid-cols-[5.5rem_1fr] gap-3 px-4 py-3">
                    <div className="text-xs tabular-nums text-slate-500">
                      {time12(s.start_time)}
                      <br />
                      {time12(s.end_time)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{s.subject_name}</p>
                      <p className="text-xs text-slate-500">
                        {s.subject_code} · {humanize(s.class_type)}
                        {s.room_number && ` · Room ${s.room_number}`}
                      </p>
                      {s.faculty_name && <p className="text-xs text-slate-400">{s.faculty_name}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </MyPageState>
    </div>
  );
}
