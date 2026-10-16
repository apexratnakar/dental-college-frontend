import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { studentsApi, coursesApi, sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { Student, Course, AcademicSession, PaginatedResponse } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  passed: 'Passed',
  detained: 'Detained',
  expelled: 'Expelled',
};

const STATUS_CLASSES: Record<string, string> = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  passed: 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700',
  detained: 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700',
  expelled: 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700',
};

export function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterCourse, setFilterCourse] = useState<number | undefined>();
  const [filterSession, setFilterSession] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, filterCourse, filterSession, filterStatus],
    queryFn: async () => {
      const { data } = await studentsApi.list({
        page, per_page: 20,
        search: search || undefined,
        course_id: filterCourse,
        session_id: filterSession,
        status: filterStatus || undefined,
      });
      return data as PaginatedResponse<Student>;
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
    mutationFn: (id: number) => studentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle title="Students" subtitle="View and manage enrolled students" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-56">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search students…"
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
        <select
          value={filterSession ?? ''}
          onChange={(e) => { setFilterSession(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No students found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Enrollment No.</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Session</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{s.email ?? s.mobile_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                        {s.enrollment_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.course_name ?? s.course_id}</td>
                    <td className="px-4 py-3 text-slate-600">{s.session_name ?? s.session_id}</td>
                    <td className="px-4 py-3 text-slate-600">Year {s.year_of_study}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLASSES[s.status] ?? 'badge-inactive'}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button onClick={() => setDeleteTarget(s)} className="icon-btn" title="Remove">
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
                <span>{data.total} students</span>
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Student"
        message={deleteTarget ? `Remove student "${deleteTarget.full_name ?? deleteTarget.enrollment_number}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
