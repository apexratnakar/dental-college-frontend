import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { coursesApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Course, PaginatedResponse } from '../../types';

const courseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  duration_years: z.number().int().min(1).max(10),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type CourseFormData = z.infer<typeof courseSchema>;

function CourseModal({
  course,
  onClose,
}: {
  course: Course | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !course;

  const { register, handleSubmit, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? {
          name: course.name,
          code: course.code,
          duration_years: course.duration_years,
          description: course.description ?? '',
          is_active: course.is_active,
        }
      : { name: '', code: '', duration_years: 3, description: '', is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: CourseFormData) =>
      isCreate ? coursesApi.create(data) : coursesApi.update(course.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Course' : 'Edit Course'}
        </h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Course Name *</label>
            <input {...register('name')} placeholder="Bachelor of Technology" className="input-field mt-1 w-full" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Code *</label>
              <input {...register('code')} placeholder="BTECH" className="input-field mt-1 w-full uppercase" />
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Duration (years) *</label>
              <input
                type="number"
                {...register('duration_years', { valueAsNumber: true })}
                min={1} max={10}
                className="input-field mt-1 w-full"
              />
              {errors.duration_years && <p className="mt-1 text-xs text-red-500">{errors.duration_years.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea {...register('description')} rows={2} className="input-field mt-1 w-full resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 rounded" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
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

export function CoursesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalCourse, setModalCourse] = useState<Course | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search],
    queryFn: async () => {
      const { data } = await coursesApi.list({ page, per_page: 20, search: search || undefined });
      return data as PaginatedResponse<Course>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Courses"
        subtitle="Manage academic courses / programmes"
        action={
          <button onClick={() => setModalCourse(null)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Course
          </button>
        }
      />

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-64">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search courses…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No courses found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.duration_years} yr{c.duration_years !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <span className={c.is_active ? 'badge-active' : 'badge-inactive'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModalCourse(c)} className="icon-btn" title="Edit">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="icon-btn" title="Delete">
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
                <span>{data.total} courses</span>
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

      {modalCourse !== undefined && (
        <CourseModal course={modalCourse} onClose={() => setModalCourse(undefined)} />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Course"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
