import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { subjectsApi, coursesApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Subject, Course, PaginatedResponse } from '../../types';

const subjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  course_id: z.number().min(1, 'Course is required'),
  year_of_study: z.number().int().min(1).max(10),
  semester: z.number().int().min(1).max(12),
  credits: z.number().int().min(1).max(10),
  subject_type: z.enum(['theory', 'practical', 'both']),
  is_active: z.boolean(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

function SubjectModal({
  subject,
  courses,
  onClose,
}: {
  subject: Subject | null;
  courses: Course[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !subject;

  const { register, handleSubmit, formState: { errors } } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subject
      ? {
          name: subject.name,
          code: subject.code,
          course_id: subject.course_id,
          year_of_study: subject.year_of_study,
          semester: subject.semester,
          credits: subject.credits,
          subject_type: subject.subject_type as 'theory' | 'practical' | 'both',
          is_active: subject.is_active,
        }
      : { name: '', code: '', course_id: 0, year_of_study: 1, semester: 1, credits: 4, subject_type: 'theory', is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: SubjectFormData) =>
      isCreate ? subjectsApi.create(data) : subjectsApi.update(subject.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Subject' : 'Edit Subject'}
        </h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Subject Name *</label>
              <input {...register('name')} placeholder="Mathematics I" className="input-field mt-1 w-full" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Code *</label>
              <input {...register('code')} placeholder="MATH101" className="input-field mt-1 w-full" />
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Course *</label>
            <select
              {...register('course_id', { valueAsNumber: true })}
              className="input-field mt-1 w-full"
            >
              <option value={0}>Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
            {errors.course_id && <p className="mt-1 text-xs text-red-500">{errors.course_id.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Year *</label>
              <input
                type="number"
                {...register('year_of_study', { valueAsNumber: true })}
                min={1} max={10}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Semester *</label>
              <input
                type="number"
                {...register('semester', { valueAsNumber: true })}
                min={1} max={12}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Credits *</label>
              <input
                type="number"
                {...register('credits', { valueAsNumber: true })}
                min={1} max={10}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select {...register('subject_type')} className="input-field mt-1 w-full">
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="both">Theory + Practical</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="subj_active" {...register('is_active')} className="h-4 w-4 rounded" />
            <label htmlFor="subj_active" className="text-sm text-slate-700">Active</label>
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-500">{getErrorMessage(mutation.error)}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : isCreate ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SubjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [modalSubject, setModalSubject] = useState<Subject | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', page, search, filterCourse],
    queryFn: async () => {
      const { data } = await subjectsApi.list({
        page, per_page: 20,
        search: search || undefined,
        course_id: filterCourse,
      });
      return data as PaginatedResponse<Subject>;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 100 });
      return (data as PaginatedResponse<Course>).items;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setDeleteTarget(null);
    },
  });

  const typeLabel: Record<string, string> = {
    theory: 'Theory',
    practical: 'Practical',
    both: 'Theory + Practical',
  };

  return (
    <div>
      <PageTitle
        title="Subjects"
        subtitle="Manage course subjects and curriculum units"
        action={
          <button onClick={() => setModalSubject(null)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Subject
          </button>
        }
      />

      <div className="mb-4 flex gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-56">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search subjects…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={filterCourse ?? ''}
          onChange={(e) => { setFilterCourse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Courses</option>
          {courses?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No subjects found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Yr / Sem</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Credits</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{s.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.course_name ?? s.course_id}</td>
                    <td className="px-4 py-3 text-slate-600">Y{s.year_of_study} / S{s.semester}</td>
                    <td className="px-4 py-3 text-slate-600">{s.credits}</td>
                    <td className="px-4 py-3 text-slate-600">{typeLabel[s.subject_type] ?? s.subject_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModalSubject(s)} className="icon-btn" title="Edit">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="icon-btn" title="Delete">
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
                <span>{data.total} subjects</span>
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

      {modalSubject !== undefined && (
        <SubjectModal
          subject={modalSubject}
          courses={courses ?? []}
          onClose={() => setModalSubject(undefined)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Subject"
        message={deleteTarget ? `Delete "${deleteTarget.name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
