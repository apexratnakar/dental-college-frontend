import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import { admissionsApi, coursesApi, sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Admission, Course, AcademicSession, PaginatedResponse } from '../../types';
import { birthDateField, digitsOnly, maxBirthDate, mobileField, mobileInputProps } from '../../utils/validation';
import { usePrefillCurrentSession } from '../../hooks/useCurrentSession';

// ── Status helpers ─────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  documents_submitted: 'Docs Submitted',
  documents_verified: 'Docs Verified',
  merit_listed: 'Merit Listed',
  counselled: 'Counselled',
  approved: 'Approved',
  admitted: 'Admitted',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  documents_submitted: 'bg-blue-100 text-blue-700',
  documents_verified: 'bg-cyan-100 text-cyan-700',
  merit_listed: 'bg-purple-100 text-purple-700',
  counselled: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-yellow-100 text-yellow-700',
  admitted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_TABS = [
  'all',
  'pending',
  'documents_submitted',
  'documents_verified',
  'merit_listed',
  'counselled',
  'approved',
  'admitted',
  'rejected',
] as const;

// ── Create form ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  course_id: z.number().min(1, 'Course is required'),
  session_id: z.number().min(1, 'Session is required'),
  year_of_study: z.number().int().min(1).max(10),
  email: z.string().trim().toLowerCase().email('Invalid email').optional().or(z.literal('')),
  mobile: mobileField,
  date_of_birth: birthDateField,
  gender: z.string().optional(),
  category: z.string().optional(),
  merit_score: z.number().min(0).max(100).optional().nullable(),
  previous_institution: z.string().optional(),
  previous_qualification: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  remarks: z.string().optional(),
}).refine((d) => !!d.email || !!d.mobile, {
  // The email or mobile becomes the student's login once admitted
  message: 'Enter an email or a mobile number',
  path: ['email'],
});

type CreateFormData = z.infer<typeof createSchema>;

function NewAdmissionModal({
  courses,
  sessions,
  onClose,
}: {
  courses: Course[];
  sessions: AcademicSession[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { getValues, setValue, 
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { year_of_study: 1 },
  });
  // New records default to the current academic session
  usePrefillCurrentSession(
    () => !getValues('session_id'),
    (id) => setValue('session_id', id),
    sessions.length > 0,
  );
  const mobileReg = register('mobile');

  const mutation = useMutation({
    mutationFn: (data: CreateFormData) => {
      const payload = {
        ...data,
        email: data.email || undefined,
        mobile: data.mobile || undefined,
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender || undefined,
        category: data.category || undefined,
        previous_institution: data.previous_institution || undefined,
        previous_qualification: data.previous_qualification || undefined,
        father_name: data.father_name || undefined,
        mother_name: data.mother_name || undefined,
        remarks: data.remarks || undefined,
      };
      return admissionsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">New Admission Application</h2>
        </div>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="overflow-y-auto px-6 py-4 space-y-4"
        >
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">First Name *</label>
              <input {...register('first_name')} className="input-field mt-1 w-full" />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <input {...register('last_name')} className="input-field mt-1 w-full" />
            </div>
          </div>

          {/* Course / Session / Year */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Course *</label>
              <select
                {...register('course_id', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              >
                <option value={0}>Select…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
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
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_current ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              {errors.session_id && (
                <p className="mt-1 text-xs text-red-500">{errors.session_id.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Year *</label>
              <input
                type="number"
                {...register('year_of_study', { valueAsNumber: true })}
                min={1}
                max={10}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-400">(email or mobile required)</span></label>
              <input {...register('email')} type="email" className="input-field mt-1 w-full" />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mobile <span className="font-normal text-slate-400">(email or mobile required)</span></label>
              <input
                {...mobileReg}
                {...mobileInputProps}
                className="input-field mt-1 w-full"
                onChange={(e) => mobileReg.onChange(digitsOnly(e))}
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-500">{errors.mobile.message}</p>
              )}
            </div>
          </div>

          {/* DOB / Gender / Category */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Date of Birth</label>
              <input
                type="date"
                {...register('date_of_birth')}
                max={maxBirthDate()}
                className="input-field mt-1 w-full"
              />
              {errors.date_of_birth && (
                <p className="mt-1 text-xs text-red-500">{errors.date_of_birth.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <select {...register('gender')} className="input-field mt-1 w-full">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Category</label>
              <select {...register('category')} className="input-field mt-1 w-full">
                <option value="">—</option>
                <option value="general">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>
          </div>

          {/* Academic */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Merit Score (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('merit_score', {
                  // Blank means "not provided" — valueAsNumber would turn it into NaN and block submit
                  setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                })}
                min={0}
                max={100}
                className="input-field mt-1 w-full"
              />
              {errors.merit_score && (
                <p className="mt-1 text-xs text-red-500">Merit score must be between 0 and 100</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700">Previous Institution</label>
              <input
                {...register('previous_institution')}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>

          {/* Parents */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Father Name</label>
              <input {...register('father_name')} className="input-field mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mother Name</label>
              <input {...register('mother_name')} className="input-field mt-1 w-full" />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              {...register('remarks')}
              rows={2}
              className="input-field mt-1 w-full resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">{getErrorMessage(mutation.error)}</p>
          )}
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit((d) => mutation.mutate(d))}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Saving…' : 'Create Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AdmissionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<number | undefined>();
  const [sessionFilter, setSessionFilter] = useState<number | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Admission | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', page, search, statusFilter, courseFilter, sessionFilter],
    queryFn: async () => {
      const { data } = await admissionsApi.list({
        page,
        per_page: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        course_id: courseFilter,
        session_id: sessionFilter,
      });
      return data as PaginatedResponse<Admission>;
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
    mutationFn: (id: number) => admissionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Admissions"
        subtitle="Manage admission applications and workflow"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Application
          </button>
        }
      />

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={
              statusFilter === s
                ? 'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap bg-primary-600 text-white'
                : 'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-56">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={courseFilter ?? ''}
          onChange={(e) => {
            setCourseFilter(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">All Courses</option>
          {courses?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <select
          value={sessionFilter ?? ''}
          onChange={(e) => {
            setSessionFilter(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.is_current ? ' (Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No applications found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Applicant</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Session / Yr
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Merit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => navigate(`/admissions/${a.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.email ?? a.mobile ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.course_name ?? `#${a.course_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.session_name ?? `#${a.session_id}`}
                      <span className="ml-1 text-slate-400 text-xs">Yr {a.year_of_study}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.merit_score != null ? `${a.merit_score}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/admissions/${a.id}`)}
                          className="icon-btn"
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </button>
                        {a.status !== 'admitted' && (
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="icon-btn"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} applications</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2">
                    {page} / {data.pages}
                  </span>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <NewAdmissionModal
          courses={courses ?? []}
          sessions={sessions ?? []}
          onClose={() => setShowCreate(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Application"
        message={deleteTarget ? `Delete application for "${deleteTarget.full_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
