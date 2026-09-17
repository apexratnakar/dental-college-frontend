import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Clock, MapPin } from 'lucide-react';
import { sessionsApi, coursesApi, sectionsApi, subjectsApi, facultyApi, timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
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

const SLOT_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-emerald-100 border-emerald-300 text-emerald-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-amber-100 border-amber-300 text-amber-900',
  'bg-rose-100 border-rose-300 text-rose-900',
  'bg-cyan-100 border-cyan-300 text-cyan-900',
  'bg-orange-100 border-orange-300 text-orange-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
];

function slotColor(subjectId: number) {
  return SLOT_COLORS[subjectId % SLOT_COLORS.length];
}

function formatTime(t: string): string {
  return t.slice(0, 5); // "HH:MM:SS" → "HH:MM"
}

// ── Form schema ───────────────────────────────────────────────────────────────

const timeRegex = /^\d{2}:\d{2}$/;

const slotSchema = z.object({
  academic_session_id: z.number().int().positive('Required'),
  section_id: z.number().int().positive('Required'),
  subject_id: z.number().int().positive('Required'),
  faculty_id: z.preprocess(
    (v) => (typeof v === 'number' && (isNaN(v) || v === 0)) || v === '' ? null : v,
    z.number().int().positive().nullable().optional(),
  ),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  start_time: z.string().regex(timeRegex, 'Required'),
  end_time: z.string().regex(timeRegex, 'Required'),
  room_number: z.string().max(50).nullable().optional(),
}).refine((d) => d.end_time > d.start_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

type SlotFormData = z.infer<typeof slotSchema>;

// ── Slot Modal ────────────────────────────────────────────────────────────────

interface SlotModalProps {
  slot: TimetableSlot | null;
  defaultSession: string;
  defaultCourse: string;
  defaultSection: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlotModal({ slot, defaultSession, defaultCourse, defaultSection, onClose, onSaved }: SlotModalProps) {
  const isEdit = !!slot;
  const [error, setError] = useState<string | null>(null);
  const [modalCourseId, setModalCourseId] = useState(defaultCourse);

  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string }[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 200, is_active: true });
      return (data as { items: { id: number; name: string; code: string }[] }).items;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SlotFormData>({
    resolver: zodResolver(slotSchema),
    defaultValues: slot
      ? {
          academic_session_id: slot.academic_session_id,
          section_id: slot.section_id,
          subject_id: slot.subject_id,
          faculty_id: slot.faculty_id,
          day_of_week: slot.day_of_week,
          start_time: formatTime(slot.start_time),
          end_time: formatTime(slot.end_time),
          room_number: slot.room_number ?? '',
        }
      : {
          academic_session_id: defaultSession ? Number(defaultSession) : undefined,
          section_id: defaultSection ? Number(defaultSection) : undefined,
          day_of_week: 'monday',
          start_time: '08:00',
          end_time: '09:00',
        },
  });

  const watchedSession = watch('academic_session_id');
  const watchedSection = watch('section_id');

  const { data: sections } = useQuery({
    queryKey: ['sections', watchedSession, modalCourseId],
    queryFn: async () => {
      const { data } = await sectionsApi.list({
        session_id: watchedSession,
        course_id: modalCourseId ? Number(modalCourseId) : undefined,
        per_page: 200,
      });
      return (data as { items: { id: number; name: string; year_of_study: number }[] }).items;
    },
    enabled: !!watchedSession && !!modalCourseId,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const { data } = await subjectsApi.list({ per_page: 200 });
      return (data as { items: { id: number; name: string; code: string }[] }).items;
    },
  });

  const { data: faculty } = useQuery({
    queryKey: ['faculty-all'],
    queryFn: async () => {
      const { data } = await facultyApi.list({ per_page: 200 });
      return (data as { items: { id: number; full_name: string | null; designation: string }[] }).items;
    },
  });

  const onSubmit = async (values: SlotFormData) => {
    setError(null);
    try {
      if (isEdit) {
        const { academic_session_id, section_id, ...updateData } = values;
        void academic_session_id; void section_id;
        await timetableApi.update(slot.id, {
          ...updateData,
          faculty_id: updateData.faculty_id ?? null,
          room_number: updateData.room_number || null,
        });
      } else {
        await timetableApi.create({
          ...values,
          faculty_id: values.faculty_id ?? null,
          room_number: values.room_number || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Slot' : 'Add Timetable Slot'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Session *</label>
                  <select
                    {...register('academic_session_id', { valueAsNumber: true })}
                    className="input w-full"
                    onChange={(e) => {
                      setValue('academic_session_id', Number(e.target.value));
                      setModalCourseId('');
                      setValue('section_id', 0);
                    }}
                  >
                    <option value="">Select…</option>
                    {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.academic_session_id && <p className="form-error">{errors.academic_session_id.message}</p>}
                </div>
                <div>
                  <label className="form-label">Course *</label>
                  <select
                    value={modalCourseId}
                    onChange={(e) => { setModalCourseId(e.target.value); setValue('section_id', 0); }}
                    className="input w-full"
                    disabled={!watchedSession}
                  >
                    <option value="">Select…</option>
                    {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Section *</label>
                <select
                  {...register('section_id', { valueAsNumber: true })}
                  className="input w-full"
                  disabled={!modalCourseId}
                >
                  <option value="">Select…</option>
                  {sections?.map((s) => <option key={s.id} value={s.id}>Year {s.year_of_study} – {s.name}</option>)}
                </select>
                {errors.section_id && <p className="form-error">{errors.section_id.message}</p>}
              </div>
            </>
          )}

          <div>
            <label className="form-label">Subject *</label>
            <select
              {...register('subject_id', { valueAsNumber: true })}
              className="input w-full"
            >
              <option value="">Select subject…</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            {errors.subject_id && <p className="form-error">{errors.subject_id.message}</p>}
          </div>

          <div>
            <label className="form-label">Faculty (optional)</label>
            <select {...register('faculty_id', { valueAsNumber: true })} className="input w-full">
              <option value="">— None —</option>
              {faculty?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name ?? 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Day *</label>
            <select {...register('day_of_week')} className="input w-full">
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start time *</label>
              <input type="time" {...register('start_time')} className="input w-full" />
              {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="form-label">End time *</label>
              <input type="time" {...register('end_time')} className="input w-full" />
              {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Room (optional)</label>
            <input
              {...register('room_number')}
              className="input w-full"
              placeholder="e.g. Room 101, Lab A"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update Slot' : 'Add Slot'}
            </button>
          </div>

          {/* suppress unused vars warning */}
          <span className="hidden">{watchedSection}{String(!!setValue)}</span>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TimetablePage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<TimetableSlot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null);

  // ── Filter data ────────────────────────────────────────────────────────────
  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string }[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 200, is_active: true });
      return (data as { items: { id: number; name: string; code: string }[] }).items;
    },
    enabled: !!sessionId,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', sessionId, courseId],
    queryFn: async () => {
      const { data } = await sectionsApi.list({
        session_id: Number(sessionId),
        course_id: Number(courseId),
        per_page: 200,
      });
      return (data as { items: { id: number; name: string; year_of_study: number }[] }).items;
    },
    enabled: !!sessionId && !!courseId,
  });

  // ── Timetable data ─────────────────────────────────────────────────────────
  const canFetch = !!sessionId && !!sectionId;

  const { data: slots, isLoading } = useQuery({
    queryKey: ['timetable', sessionId, sectionId],
    queryFn: async () => {
      const { data } = await timetableApi.list({
        academic_session_id: Number(sessionId),
        section_id: Number(sectionId),
      });
      return data as TimetableSlot[];
    },
    enabled: canFetch,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timetableApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable', sessionId, sectionId] });
      setDeleteTarget(null);
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['timetable', sessionId, sectionId] });
    setModalOpen(false);
    setEditSlot(null);
  };

  // ── Group slots by day ─────────────────────────────────────────────────────
  const slotsByDay = new Map<DayOfWeek, TimetableSlot[]>();
  DAYS.forEach((d) => slotsByDay.set(d.value, []));
  slots?.forEach((s) => slotsByDay.get(s.day_of_week)?.push(s));

  const totalSlots = slots?.length ?? 0;

  return (
    <div>
      <PageTitle
        title="Timetable"
        subtitle="Weekly class schedule by section"
        action={
          canFetch ? (
            <button
              onClick={() => { setEditSlot(null); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Slot
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Academic Session *
            </label>
            <select
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setCourseId(''); setSectionId(''); }}
              className="input w-full"
            >
              <option value="">Select session…</option>
              {sessions?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Course *
            </label>
            <select
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setSectionId(''); }}
              className="input w-full"
              disabled={!sessionId}
            >
              <option value="">Select course…</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Section *
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="input w-full"
              disabled={!courseId}
            >
              <option value="">Select section…</option>
              {sections?.map((s) => (
                <option key={s.id} value={s.id}>Year {s.year_of_study} – {s.name}</option>
              ))}
            </select>
          </div>
        </div>
        {!canFetch && (
          <p className="mt-3 text-xs text-slate-400">Select a session, course, and section to view the timetable.</p>
        )}
      </div>

      {/* Timetable grid */}
      {canFetch && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : (
            <>
              {totalSlots === 0 && (
                <div className="card py-12 text-center text-sm text-slate-400">
                  No slots scheduled yet. Click "Add Slot" to get started.
                </div>
              )}

              {totalSlots > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {DAYS.map((day) => {
                    const daySlots = slotsByDay.get(day.value) ?? [];
                    return (
                      <div key={day.value} className="flex flex-col gap-2">
                        {/* Day header */}
                        <div className="rounded-lg bg-slate-800 px-3 py-2 text-center">
                          <p className="text-xs font-semibold text-white">{day.short}</p>
                          <p className="text-[10px] text-slate-400">{daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}</p>
                        </div>

                        {/* Slots */}
                        {daySlots.length === 0 ? (
                          <div className="flex-1 rounded-lg border-2 border-dashed border-slate-100 py-6 text-center">
                            <p className="text-[10px] text-slate-300">Free</p>
                          </div>
                        ) : (
                          daySlots.map((slot) => (
                            <div
                              key={slot.id}
                              className={`rounded-lg border px-3 py-2.5 ${slotColor(slot.subject_id)}`}
                            >
                              <p className="text-xs font-bold leading-tight truncate">
                                {slot.subject_name}
                              </p>
                              <p className="text-[10px] font-mono opacity-70">{slot.subject_code}</p>

                              <div className="mt-1.5 flex items-center gap-1 text-[10px] opacity-80">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                <span>{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                              </div>

                              {slot.faculty_name && (
                                <p className="mt-0.5 text-[10px] opacity-75 truncate">{slot.faculty_name}</p>
                              )}

                              {slot.room_number && (
                                <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{slot.room_number}</span>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="mt-2 flex gap-1">
                                <button
                                  onClick={() => { setEditSlot(slot); setModalOpen(true); }}
                                  className="flex-1 rounded bg-white/50 py-0.5 text-[10px] font-medium hover:bg-white/80 flex items-center justify-center gap-0.5"
                                >
                                  <Pencil className="h-2.5 w-2.5" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(slot)}
                                  className="flex-1 rounded bg-white/50 py-0.5 text-[10px] font-medium hover:bg-red-100 text-red-600 flex items-center justify-center gap-0.5"
                                >
                                  <Trash2 className="h-2.5 w-2.5" /> Del
                                </button>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Add to this day shortcut */}
                        {daySlots.length > 0 && (
                          <button
                            onClick={() => { setEditSlot(null); setModalOpen(true); }}
                            className="rounded-lg border-2 border-dashed border-slate-200 py-1 text-[10px] text-slate-400 hover:border-primary-300 hover:text-primary-600"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-400">
                {totalSlots} slot{totalSlots !== 1 ? 's' : ''} scheduled across the week.
              </p>
            </>
          )}
        </>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <SlotModal
          slot={editSlot}
          defaultSession={sessionId}
          defaultCourse={courseId}
          defaultSection={sectionId}
          onClose={() => { setModalOpen(false); setEditSlot(null); }}
          onSaved={invalidate}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Slot"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.subject_name} on ${deleteTarget.day_of_week} (${formatTime(deleteTarget.start_time)}–${formatTime(deleteTarget.end_time)}) from the timetable?`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
