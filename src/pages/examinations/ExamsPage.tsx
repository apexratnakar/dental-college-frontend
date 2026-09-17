import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Eye, Trash2, BookOpenCheck } from 'lucide-react';
import { examsApi, coursesApi, sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Exam, Course, AcademicSession, PaginatedResponse, ExamType, ExamStatus } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  internal: 'Internal',
  mid_term: 'Mid-Term',
  end_term: 'End-Term',
  annual: 'Annual',
  practical: 'Practical',
};

export const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  internal: 'bg-blue-100 text-blue-700',
  mid_term: 'bg-purple-100 text-purple-700',
  end_term: 'bg-indigo-100 text-indigo-700',
  annual: 'bg-red-100 text-red-700',
  practical: 'bg-green-100 text-green-700',
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  published: 'Published',
};

export const EXAM_STATUS_COLORS: Record<ExamStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
};

// ── Create / Edit modal ───────────────────────────────────────────────────────

const examSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  exam_type: z.enum(['internal', 'mid_term', 'end_term', 'annual', 'practical']),
  session_id: z.number().min(1, 'Session is required'),
  course_id: z.number().min(1, 'Course is required'),
  year_of_study: z.number().int().min(1).max(10),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

function ExamModal({
  exam,
  courses,
  sessions,
  onClose,
}: {
  exam: Exam | null;
  courses: Course[];
  sessions: AcademicSession[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !exam;

  const { register, handleSubmit, formState: { errors } } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: exam
      ? {
          name: exam.name,
          exam_type: exam.exam_type,
          session_id: exam.session_id,
          course_id: exam.course_id,
          year_of_study: exam.year_of_study,
          semester: exam.semester ?? undefined,
          start_date: exam.start_date,
          end_date: exam.end_date,
          description: exam.description ?? '',
        }
      : { year_of_study: 1, exam_type: 'internal' },
  });

  const mutation = useMutation({
    mutationFn: (data: ExamFormData) => {
      const payload = { ...data, semester: data.semester || undefined };
      return isCreate
        ? examsApi.create(payload)
        : examsApi.update(exam.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            {isCreate ? 'New Exam' : 'Edit Exam'}
          </h2>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Exam Name *</label>
            <input
              {...register('name')}
              placeholder="Mid-Term Examination 2025"
              className="input-field mt-1 w-full"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Type *</label>
              <select {...register('exam_type')} className="input-field mt-1 w-full">
                {Object.entries(EXAM_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Semester</label>
              <input
                type="number"
                {...register('semester', { valueAsNumber: true })}
                min={1} max={12}
                placeholder="—"
                className="input-field mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Course *</label>
              <select
                {...register('course_id', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              >
                <option value={0}>Select…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
              {errors.course_id && (
                <p className="mt-1 text-xs text-red-500">{errors.course_id.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Session *</label>
              <select
                {...register('session_id', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              >
                <option value={0}>Select…</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.session_id && (
                <p className="mt-1 text-xs text-red-500">{errors.session_id.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Year of Study *</label>
            <input
              type="number"
              {...register('year_of_study', { valueAsNumber: true })}
              min={1} max={10}
              className="input-field mt-1 w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Start Date *</label>
              <input
                type="date"
                {...register('start_date')}
                className="input-field mt-1 w-full"
              />
              {errors.start_date && (
                <p className="mt-1 text-xs text-red-500">{errors.start_date.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End Date *</label>
              <input
                type="date"
                {...register('end_date')}
                className="input-field mt-1 w-full"
              />
              {errors.end_date && (
                <p className="mt-1 text-xs text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              className="input-field mt-1 w-full resize-none"
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
            {mutation.isPending ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function ExamsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterSession, setFilterSession] = useState<number | undefined>();
  const [filterCourse, setFilterCourse] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<ExamStatus | undefined>(
    (searchParams.get('status') as ExamStatus) || undefined
  );

  // Sync filter when URL param changes (e.g. clicking sidebar nav links)
  useEffect(() => {
    setFilterStatus((searchParams.get('status') as ExamStatus) || undefined);
    setPage(1);
  }, [searchParams]);

  const [modalExam, setModalExam] = useState<Exam | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['exams', page, filterSession, filterCourse, filterStatus],
    queryFn: async () => {
      const { data } = await examsApi.list({
        page, per_page: 20,
        session_id: filterSession,
        course_id: filterCourse,
        status: filterStatus,
      });
      return data as PaginatedResponse<Exam>;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 100 });
      return (data as PaginatedResponse<Course>).items;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Examinations"
        subtitle="Create and manage exams, enter marks, and view results"
        action={
          <button
            onClick={() => setModalExam(null)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Exam
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <select
          value={filterSession ?? ''}
          onChange={(e) => { setFilterSession(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterCourse ?? ''}
          onChange={(e) => { setFilterCourse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Courses</option>
          {courses?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select
          value={filterStatus ?? ''}
          onChange={(e) => {
            const val = (e.target.value as ExamStatus) || undefined;
            setFilterStatus(val);
            setPage(1);
            if (val) setSearchParams({ status: val });
            else setSearchParams({});
          }}
          className="input-field text-sm"
        >
          <option value="">All Statuses</option>
          {(Object.keys(EXAM_STATUS_LABELS) as ExamStatus[]).map((s) => (
            <option key={s} value={s}>{EXAM_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No exams found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course / Yr</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Session</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date Range</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => navigate(`/examinations/${e.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.schedules.length} subject(s)</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXAM_TYPE_COLORS[e.exam_type] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {EXAM_TYPE_LABELS[e.exam_type] ?? e.exam_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.course_name ?? `#${e.course_id}`}
                      <span className="ml-1 text-xs text-slate-400">Yr {e.year_of_study}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.session_name ?? `#${e.session_id}`}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {e.start_date} → {e.end_date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXAM_STATUS_COLORS[e.status] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {EXAM_STATUS_LABELS[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/examinations/${e.id}`)}
                          className="icon-btn"
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </button>
                        {e.status === 'draft' && (
                          <>
                            <button
                              onClick={() => setModalExam(e)}
                              className="icon-btn"
                              title="Edit"
                            >
                              <BookOpenCheck className="h-4 w-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(e)}
                              className="icon-btn"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} exams</span>
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

      {modalExam !== undefined && (
        <ExamModal
          exam={modalExam}
          courses={courses ?? []}
          sessions={sessions ?? []}
          onClose={() => setModalExam(undefined)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Exam"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? All schedules and marks will be lost.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
