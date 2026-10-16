import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { attendanceApi, sessionsApi, subjectsApi, sectionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type {
  AttendanceRecord, AcademicSession, Subject, Section,
  PaginatedResponse,
} from '../../types';
import { usePrefillCurrentSession } from '../../hooks/useCurrentSession';

// ── Create modal ──────────────────────────────────────────────────────────────

const recordSchema = z.object({
  academic_session_id: z.number().min(1, 'Session required'),
  subject_id: z.number().min(1, 'Subject required'),
  section_id: z.number().min(1, 'Section required'),
  record_date: z.string().min(1, 'Date required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  topic_covered: z.string().optional(),
});

type RecordFormData = z.infer<typeof recordSchema>;

function NewSessionModal({
  sessions,
  onClose,
}: {
  sessions: AcademicSession[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { getValues, setValue, register, handleSubmit, watch, formState: { errors } } = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: { record_date: new Date().toISOString().slice(0, 10) },
  });

  // New records default to the current academic session
  usePrefillCurrentSession(
    () => !getValues('academic_session_id'),
    (id) => setValue('academic_session_id', id),
    sessions.length > 0,
  );
  const sessionId = watch('academic_session_id');

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const { data } = await subjectsApi.list({ per_page: 200 });
      return (data as PaginatedResponse<Subject>).items;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections-for-session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await sectionsApi.list({ session_id: sessionId });
      return (data as PaginatedResponse<Section>).items;
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RecordFormData) => {
      const payload = {
        ...data,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        topic_covered: data.topic_covered || undefined,
      };
      return attendanceApi.create(payload);
    },
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      // Navigate to the mark page for this new session
      const record = data as AttendanceRecord;
      onClose();
      window.location.href = `/attendance/${record.id}`;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">New Attendance Session</h2>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Academic Session *</label>
              <select
                {...register('academic_session_id', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              >
                <option value={0}>Select…</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
                ))}
              </select>
              {errors.academic_session_id && (
                <p className="mt-1 text-xs text-red-500">{errors.academic_session_id.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Section *</label>
              <select
                {...register('section_id', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              >
                <option value={0}>Select…</option>
                {sections?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.course_name})</option>
                ))}
              </select>
              {errors.section_id && (
                <p className="mt-1 text-xs text-red-500">{errors.section_id.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Subject *</label>
            <select
              {...register('subject_id', { valueAsNumber: true })}
              className="input-field mt-1 w-full"
            >
              <option value={0}>Select…</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
            {errors.subject_id && (
              <p className="mt-1 text-xs text-red-500">{errors.subject_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <input type="date" {...register('record_date')} className="input-field mt-1 w-full" />
              {errors.record_date && (
                <p className="mt-1 text-xs text-red-500">{errors.record_date.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Start Time</label>
              <input type="time" {...register('start_time')} className="input-field mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End Time</label>
              <input type="time" {...register('end_time')} className="input-field mt-1 w-full" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Topic Covered</label>
            <input
              {...register('topic_covered')}
              placeholder="e.g. Introduction to Calculus"
              className="input-field mt-1 w-full"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">{getErrorMessage(mutation.error)}</p>
          )}
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit((d) => mutation.mutate(d))}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Creating…' : 'Create & Mark Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AttendancePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterSession, setFilterSession] = useState<number | undefined>();
  const [filterSection, setFilterSection] = useState<number | undefined>();
  const [filterSubject, setFilterSubject] = useState<number | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', page, filterSession, filterSection, filterSubject],
    queryFn: async () => {
      const { data } = await attendanceApi.list({
        page, per_page: 30,
        academic_session_id: filterSession,
        section_id: filterSection,
        subject_id: filterSubject,
      });
      return data as PaginatedResponse<AttendanceRecord>;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections-for-session', filterSession],
    enabled: !!filterSession,
    queryFn: async () => {
      const { data } = await sectionsApi.list({ session_id: filterSession });
      return (data as PaginatedResponse<Section>).items;
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const { data } = await subjectsApi.list({ per_page: 200 });
      return (data as PaginatedResponse<Subject>).items;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Attendance"
        subtitle="Record and manage class attendance sessions"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Session
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <select
          value={filterSession ?? ''}
          onChange={(e) => {
            setFilterSession(e.target.value ? Number(e.target.value) : undefined);
            setFilterSection(undefined);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
        </select>
        <select
          value={filterSection ?? ''}
          onChange={(e) => { setFilterSection(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Sections</option>
          {sections?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterSubject ?? ''}
          onChange={(e) => { setFilterSubject(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Subjects</option>
          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No sessions found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Topic</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Attendance</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => navigate(`/attendance/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.record_date}</p>
                      {r.start_time && (
                        <p className="text-xs text-slate-400">{r.start_time}–{r.end_time ?? '?'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{r.subject_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.subject_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.section_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">
                      {r.topic_covered ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {r.is_marked ? (
                        <span className="text-slate-700">
                          <span className="text-green-600 font-medium">{r.present_count}</span>
                          {' / '}
                          <span>{r.total_entries}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_marked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="icon-btn"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} sessions</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">Prev</button>
                  <span className="px-2">{page} / {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <NewSessionModal
          sessions={sessions ?? []}
          onClose={() => setShowCreate(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Session"
        message={deleteTarget ? `Delete attendance session for "${deleteTarget.subject_name}" on ${deleteTarget.record_date}? All entries will be lost.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
