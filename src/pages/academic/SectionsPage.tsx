import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sectionsApi, coursesApi, sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Section, Course, AcademicSession, PaginatedResponse } from '../../types';

const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  course_id: z.number().min(1, 'Course is required'),
  session_id: z.number().min(1, 'Session is required'),
  year_of_study: z.number().int().min(1).max(10),
  capacity: z.number().int().min(1),
  is_active: z.boolean(),
});

type SectionFormData = z.infer<typeof sectionSchema>;

function SectionModal({
  section,
  courses,
  sessions,
  onClose,
}: {
  section: Section | null;
  courses: Course[];
  sessions: AcademicSession[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !section;

  const { register, handleSubmit, formState: { errors } } = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: section
      ? {
          name: section.name,
          course_id: section.course_id,
          session_id: section.session_id,
          year_of_study: section.year_of_study,
          capacity: section.capacity,
          is_active: section.is_active,
        }
      : { name: '', course_id: 0, session_id: 0, year_of_study: 1, capacity: 60, is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: SectionFormData) =>
      isCreate ? sectionsApi.create(data) : sectionsApi.update(section.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Section' : 'Edit Section'}
        </h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Section Name *</label>
              <input {...register('name')} placeholder="A" className="input-field mt-1 w-full" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
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
          <div>
            <label className="text-sm font-medium text-slate-700">Session *</label>
            <select
              {...register('session_id', { valueAsNumber: true })}
              className="input-field mt-1 w-full"
            >
              <option value={0}>Select session…</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.session_id && <p className="mt-1 text-xs text-red-500">{errors.session_id.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Capacity</label>
            <input
              type="number"
              {...register('capacity', { valueAsNumber: true })}
              min={1}
              className="input-field mt-1 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sec_active" {...register('is_active')} className="h-4 w-4 rounded" />
            <label htmlFor="sec_active" className="text-sm text-slate-700">Active</label>
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

export function SectionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterCourse, setFilterCourse] = useState<number | undefined>();
  const [filterSession, setFilterSession] = useState<number | undefined>();
  const [modalSection, setModalSection] = useState<Section | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sections', page, filterCourse, filterSession],
    queryFn: async () => {
      const { data } = await sectionsApi.list({
        page, per_page: 20,
        course_id: filterCourse,
        session_id: filterSession,
      });
      return data as PaginatedResponse<Section>;
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
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sectionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Sections"
        subtitle="Manage class sections per course and session"
        action={
          <button onClick={() => setModalSection(null)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Section
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={filterCourse ?? ''}
          onChange={(e) => { setFilterCourse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Courses</option>
          {courses?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select
          value={filterSession ?? ''}
          onChange={(e) => { setFilterSession(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No sections found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Session</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Capacity</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.course_name ?? s.course_id}</td>
                    <td className="px-4 py-3 text-slate-600">{s.session_name ?? s.session_id}</td>
                    <td className="px-4 py-3 text-slate-600">Year {s.year_of_study}</td>
                    <td className="px-4 py-3 text-slate-600">{s.capacity}</td>
                    <td className="px-4 py-3">
                      <span className={s.is_active ? 'badge-active' : 'badge-inactive'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModalSection(s)} className="icon-btn" title="Edit">
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
                <span>{data.total} sections</span>
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

      {modalSection !== undefined && (
        <SectionModal
          section={modalSection}
          courses={courses ?? []}
          sessions={sessions ?? []}
          onClose={() => setModalSection(undefined)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Section"
        message={deleteTarget ? `Delete section "${deleteTarget.name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
