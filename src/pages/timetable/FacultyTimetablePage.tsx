import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Users } from 'lucide-react';
import { sessionsApi, facultyApi, timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { TimetableSlot, DayOfWeek } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'monday',    label: 'Monday',    short: 'Mon' },
  { value: 'tuesday',   label: 'Tuesday',   short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday',  label: 'Thursday',  short: 'Thu' },
  { value: 'friday',    label: 'Friday',    short: 'Fri' },
  { value: 'saturday',  label: 'Saturday',  short: 'Sat' },
];

const CLASS_TYPE_COLORS: Record<string, string> = {
  theory:    'border-l-blue-500 bg-blue-50',
  practical: 'border-l-purple-500 bg-purple-50',
  tutorial:  'border-l-teal-500 bg-teal-50',
};

function fmt(t: string) { return t.slice(0, 5); }

// ── Workload summary ──────────────────────────────────────────────────────────

function WorkloadCard({ slots }: { slots: TimetableSlot[] }) {
  const theory    = slots.filter((s) => s.class_type === 'theory').length;
  const practical = slots.filter((s) => s.class_type === 'practical').length;
  const tutorial  = slots.filter((s) => s.class_type === 'tutorial').length;
  const sections  = new Set(slots.map((s) => s.section_id)).size;

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Weekly Workload</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Theory',    count: theory,    color: 'text-blue-600' },
          { label: 'Practical', count: practical, color: 'text-purple-600' },
          { label: 'Tutorial',  count: tutorial,  color: 'text-teal-600' },
          { label: 'Sections',  count: sections,  color: 'text-slate-700' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400 text-right">
        Total: <span className="font-semibold text-slate-700">{slots.length}</span> periods/week
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FacultyTimetablePage() {
  const [sessionId, setSessionId]   = useState('');
  const [facultyId, setFacultyId]   = useState('');
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid');

  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string }[];
    },
  });

  const { data: faculty } = useQuery({
    queryKey: ['faculty-all'],
    queryFn: async () => {
      const { data } = await facultyApi.list({ per_page: 200 });
      return (data as { items: { id: number; full_name: string | null; designation: string }[] }).items;
    },
  });

  const canFetch = !!sessionId && !!facultyId;

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['timetable-faculty', sessionId, facultyId],
    queryFn: async () => {
      const { data } = await timetableApi.list({
        academic_session_id: Number(sessionId),
        faculty_id: Number(facultyId),
      });
      return data as TimetableSlot[];
    },
    enabled: canFetch,
  });

  // Group by day
  const byDay = new Map<DayOfWeek, TimetableSlot[]>();
  DAYS.forEach((d) => byDay.set(d.value, []));
  slots.forEach((s) => byDay.get(s.day_of_week)?.push(s));

  const selectedFaculty = faculty?.find((f) => String(f.id) === facultyId);

  return (
    <div>
      <PageTitle
        title="Faculty Timetable"
        subtitle="View weekly teaching schedule for any faculty member"
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Academic Session *</label>
            <select
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); }}
              className="input w-full"
            >
              <option value="">Select session…</option>
              {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Faculty *</label>
            <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="input w-full">
              <option value="">Select faculty…</option>
              {faculty?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name ?? 'Unknown'} — {f.designation}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {!canFetch ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          Select an academic session and faculty member to view the timetable.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Faculty badge */}
          {selectedFaculty && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold text-sm">
                    {(selectedFaculty.full_name ?? '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedFaculty.full_name ?? ''}
                  </p>
                  <p className="text-xs text-slate-500">{selectedFaculty.designation}</p>
                </div>
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(['grid', 'list'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize ${
                      viewMode === m ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {slots.length === 0 ? (
            <div className="card py-12 text-center text-sm text-slate-400">
              No classes scheduled for this faculty in the selected session.
            </div>
          ) : (
            <>
              <WorkloadCard slots={slots} />

              {viewMode === 'grid' ? (
                // ── Grid view (day columns) ───────────────────────────────────
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {DAYS.map((day) => {
                    const daySlots = (byDay.get(day.value) ?? [])
                      .sort((a, b) => a.start_time.localeCompare(b.start_time));
                    return (
                      <div key={day.value} className="flex flex-col gap-2">
                        <div className="rounded-lg bg-slate-800 px-3 py-2 text-center">
                          <p className="text-xs font-semibold text-white">{day.short}</p>
                          <p className="text-[10px] text-slate-400">
                            {daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        {daySlots.length === 0 ? (
                          <div className="rounded-lg border-2 border-dashed border-slate-100 py-8 text-center">
                            <p className="text-[10px] text-slate-300">Free</p>
                          </div>
                        ) : daySlots.map((s) => (
                          <div
                            key={s.id}
                            className={`rounded-lg border-l-4 px-3 py-2.5 ${CLASS_TYPE_COLORS[s.class_type] ?? 'bg-slate-50 border-l-slate-400'}`}
                          >
                            <p className="text-xs font-bold leading-tight truncate text-slate-900">{s.subject_name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{s.subject_code}</p>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-600">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              {fmt(s.start_time)}–{fmt(s.end_time)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                              <Users className="h-2.5 w-2.5 shrink-0" />
                              {s.section_name}
                            </div>
                            {s.room_number && (
                              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {s.room_number}
                              </div>
                            )}
                            <span className={`mt-1 inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full capitalize ${
                              s.class_type === 'theory'    ? 'bg-blue-200 text-blue-800'    :
                              s.class_type === 'practical' ? 'bg-purple-200 text-purple-800' :
                              'bg-teal-200 text-teal-800'
                            }`}>
                              {s.class_type}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // ── List view ────────────────────────────────────────────────
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Day</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Time</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Room</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {DAYS.flatMap((day) =>
                        (byDay.get(day.value) ?? [])
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-700 capitalize">{day.label}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                {fmt(s.start_time)} – {fmt(s.end_time)}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{s.subject_name}</p>
                                <p className="text-xs text-slate-400">{s.subject_code}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{s.section_name}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {s.room_number ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    {s.room_number}
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  s.class_type === 'theory'    ? 'bg-blue-100 text-blue-800'    :
                                  s.class_type === 'practical' ? 'bg-purple-100 text-purple-800' :
                                  'bg-teal-100 text-teal-800'
                                }`}>
                                  {s.class_type}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
