import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, GraduationCap } from 'lucide-react';
import { sessionsApi, timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { TimetableSlot, Classroom, DayOfWeek, ClassroomType } from '../../types';
import { useCurrentSession } from '../../hooks/useCurrentSession';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'monday',    label: 'Monday' },
  { value: 'tuesday',   label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday',  label: 'Thursday' },
  { value: 'friday',    label: 'Friday' },
  { value: 'saturday',  label: 'Saturday' },
];

const ROOM_TYPES: { value: ClassroomType; label: string }[] = [
  { value: 'classroom',     label: 'Classroom' },
  { value: 'computer_lab',  label: 'Computer Lab' },
  { value: 'physics_lab',   label: 'Physics Lab' },
  { value: 'chemistry_lab', label: 'Chemistry Lab' },
  { value: 'seminar_hall',  label: 'Seminar Hall' },
  { value: 'auditorium',    label: 'Auditorium' },
  { value: 'workshop',      label: 'Workshop' },
];

function roomTypeLabel(t: ClassroomType) {
  return ROOM_TYPES.find((x) => x.value === t)?.label ?? t;
}

function fmt(t: string) { return t.slice(0, 5); }

// ── Utilization bar ───────────────────────────────────────────────────────────

function UtilizationBar({ slots }: { slots: TimetableSlot[] }) {
  // Count unique day+slot combinations (approx utilization: 6 days × 6 periods = 36 max)
  const totalPossible = 36;
  const used = slots.length;
  const pct = Math.min(100, Math.round((used / totalPossible) * 100));
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Room Utilization</span>
        <span>{used} / {totalPossible} slots ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function RoomTimetablePage() {
  const [sessionIdChoice, setSessionId] = useState<string | null>(null);
  const currentSession = useCurrentSession();
  // Current session until the user picks another one
  const sessionId = sessionIdChoice ?? (currentSession ? String(currentSession.id) : '');
  const [roomId,     setRoomId]     = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string; is_current?: boolean }[];
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['classrooms', filterType],
    queryFn: async () => {
      const { data } = await timetableApi.listClassrooms({
        room_type: filterType || undefined,
        status: 'active',
      });
      return data as Classroom[];
    },
  });

  const canFetch = !!sessionId && !!roomId;

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['timetable-room', sessionId, roomId],
    queryFn: async () => {
      const { data } = await timetableApi.list({
        academic_session_id: Number(sessionId),
        room_id: Number(roomId),
      });
      return data as TimetableSlot[];
    },
    enabled: canFetch,
  });

  // Group by day
  const byDay = new Map<DayOfWeek, TimetableSlot[]>();
  DAYS.forEach((d) => byDay.set(d.value, []));
  slots.forEach((s) => byDay.get(s.day_of_week)?.push(s));

  const selectedRoom = rooms.find((r) => String(r.id) === roomId);

  // Free slots — days with no bookings
  const freeDays = DAYS.filter((d) => (byDay.get(d.value)?.length ?? 0) === 0).map((d) => d.label);

  return (
    <div>
      <PageTitle
        title="Room Timetable"
        subtitle="View booking schedule and utilization for any room or lab"
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Academic Session *</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="input w-full">
              <option value="">Select session…</option>
              {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Room Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setRoomId(''); }}
              className="input w-full"
            >
              <option value="">All Types</option>
              {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Room *</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input w-full">
              <option value="">Select room…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}{r.building ? ` (${r.building})` : ''} — {roomTypeLabel(r.room_type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!canFetch ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          Select a session and room to view its timetable.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Room info + utilization */}
          {selectedRoom && (
            <div className="card p-5 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selectedRoom.room_number}</h3>
                  <p className="text-sm text-slate-500">
                    {roomTypeLabel(selectedRoom.room_type)}
                    {selectedRoom.building ? ` · ${selectedRoom.building}` : ''}
                    {selectedRoom.floor ? `, ${selectedRoom.floor}` : ''}
                  </p>
                </div>
                {selectedRoom.capacity && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    Capacity: {selectedRoom.capacity}
                  </div>
                )}
              </div>
              <UtilizationBar slots={slots} />
              {freeDays.length > 0 && (
                <p className="text-xs text-emerald-600">
                  Free days: {freeDays.join(', ')}
                </p>
              )}
            </div>
          )}

          {slots.length === 0 ? (
            <div className="card py-12 text-center text-sm text-slate-400">
              No bookings found for this room in the selected session.
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS.map((day) => {
                const daySlots = (byDay.get(day.value) ?? [])
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (daySlots.length === 0) return null;
                return (
                  <div key={day.value} className="card overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-700">{day.label}</h3>
                      <p className="text-xs text-slate-400">{daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Time</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Subject</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Section</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Faculty</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daySlots.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {fmt(s.start_time)} – {fmt(s.end_time)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{s.subject_name}</p>
                              <p className="text-xs text-slate-400">{s.subject_code}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                                {s.section_name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {s.faculty_name ?? '—'}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
