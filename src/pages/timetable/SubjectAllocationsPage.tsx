import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, UserCheck } from 'lucide-react';
import { sessionsApi, sectionsApi, subjectsApi, facultyApi, timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { FacultySubjectAllocation } from '../../types';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePrefillCurrentSession } from '../../hooks/useCurrentSession';

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function AllocationModal({ onClose, onSaved }: ModalProps) {
  const [error, setError] = useState<string | null>(null);

  const { getValues, setValue, register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      session_id: '', section_id: '', subject_id: '', faculty_id: '', hours_per_week: '',
    },
  });

  const watchedSession = watch('session_id');

  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string; is_current?: boolean }[];
    },
  });

  // New records default to the current academic session
  usePrefillCurrentSession(
    () => !getValues('session_id'),
    (id) => setValue('session_id', String(id)),
    !!sessions?.length,
  );

  const { data: sections } = useQuery({
    queryKey: ['sections', watchedSession],
    queryFn: async () => {
      const { data } = await sectionsApi.list({ session_id: Number(watchedSession), per_page: 200 });
      return (data as { items: { id: number; name: string }[] }).items;
    },
    enabled: !!watchedSession,
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

  const onSubmit = async (values: Record<string, string>) => {
    setError(null);
    try {
      await timetableApi.createAllocation({
        session_id:     Number(values.session_id),
        section_id:     Number(values.section_id),
        subject_id:     Number(values.subject_id),
        faculty_id:     Number(values.faculty_id),
        hours_per_week: values.hours_per_week ? Number(values.hours_per_week) : null,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Assign Faculty to Subject</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Academic Session *</label>
              <select {...register('session_id', { required: 'Required' })} className="input w-full">
                <option value="">Select…</option>
                {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
              </select>
              {errors.session_id && <p className="form-error">{errors.session_id.message as string}</p>}
            </div>
            <div>
              <label className="form-label">Section *</label>
              <select
                {...register('section_id', { required: 'Required' })}
                className="input w-full"
                disabled={!watchedSession}
              >
                <option value="">Select…</option>
                {sections?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.section_id && <p className="form-error">{errors.section_id.message as string}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Subject *</label>
            <select {...register('subject_id', { required: 'Required' })} className="input w-full">
              <option value="">Select subject…</option>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
            {errors.subject_id && <p className="form-error">{errors.subject_id.message as string}</p>}
          </div>

          <div>
            <label className="form-label">Faculty *</label>
            <select {...register('faculty_id', { required: 'Required' })} className="input w-full">
              <option value="">Select faculty…</option>
              {faculty?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name ?? 'Unknown'}
                </option>
              ))}
            </select>
            {errors.faculty_id && <p className="form-error">{errors.faculty_id.message as string}</p>}
          </div>

          <div>
            <label className="form-label">Hours / Week</label>
            <input type="number" {...register('hours_per_week')} className="input w-full" placeholder="e.g. 4" min={1} max={30} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SubjectAllocationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FacultySubjectAllocation | null>(null);
  const [filterSessionChoice, setFilterSession] = useState<string | null>(null);
  const currentSession = useCurrentSession();
  // Current session until the user picks another one
  const filterSession = filterSessionChoice ?? (currentSession ? String(currentSession.id) : '');
  const [filterSection, setFilterSection] = useState('');

  const { data: sessions } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as { id: number; name: string; is_current?: boolean }[];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', filterSession],
    queryFn: async () => {
      const { data } = await sectionsApi.list({ session_id: Number(filterSession), per_page: 200 });
      return (data as { items: { id: number; name: string }[] }).items;
    },
    enabled: !!filterSession,
  });

  const { data: allocs = [], isLoading } = useQuery({
    queryKey: ['allocations', filterSession, filterSection],
    queryFn: async () => {
      const { data } = await timetableApi.listAllocations({
        session_id: filterSession ? Number(filterSession) : undefined,
        section_id: filterSection ? Number(filterSection) : undefined,
      });
      return data as FacultySubjectAllocation[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timetableApi.deleteAllocation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      setDeleteTarget(null);
    },
  });

  // Group by section for display
  const grouped = allocs.reduce((acc, a) => {
    const key = a.section_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, FacultySubjectAllocation[]>);

  return (
    <div>
      <PageTitle
        title="Subject Allocation"
        subtitle="Assign faculty members to subjects for each section"
        action={
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Assign Faculty
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Academic Session</label>
            <select
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setFilterSection(''); }}
              className="input w-full"
            >
              <option value="">All Sessions</option>
              {sessions?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Section</label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="input w-full"
              disabled={!filterSession}
            >
              <option value="">All Sections</option>
              {sections?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : allocs.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No allocations found. Start by assigning a faculty member to a subject.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([sectionName, items]) => (
            <div key={sectionName} className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  {sectionName}
                  {items[0]?.session_name && (
                    <span className="ml-2 text-xs font-normal text-slate-400">({items[0].session_name})</span>
                  )}
                </h3>
                <span className="ml-auto text-xs text-slate-400">{items.length} subject{items.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Faculty</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Hrs/Week</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.subject_name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {a.subject_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.faculty_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.hours_per_week ? `${a.hours_per_week}h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AllocationModal
          onClose={() => setModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['allocations'] });
            setModal(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Allocation"
        message={`Remove ${deleteTarget?.faculty_name} from ${deleteTarget?.subject_name} in ${deleteTarget?.section_name}?`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
