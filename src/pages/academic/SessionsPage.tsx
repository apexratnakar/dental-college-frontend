import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { AcademicSession } from '../../types';

const sessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_current: z.boolean(),
  description: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

function SessionModal({
  session,
  onClose,
}: {
  session: AcademicSession | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !session;

  const { register, handleSubmit, formState: { errors } } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: session
      ? {
          name: session.name,
          start_date: session.start_date,
          end_date: session.end_date,
          is_current: session.is_current,
          description: session.description ?? '',
        }
      : { name: '', start_date: '', end_date: '', is_current: false, description: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: SessionFormData) =>
      isCreate
        ? sessionsApi.create(data)
        : sessionsApi.update(session.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Academic Session' : 'Edit Session'}
        </h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Session Name *</label>
            <input {...register('name')} placeholder="2025-26" className="input-field mt-1 w-full" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Start Date *</label>
              <input type="date" {...register('start_date')} className="input-field mt-1 w-full" />
              {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End Date *</label>
              <input type="date" {...register('end_date')} className="input-field mt-1 w-full" />
              {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea {...register('description')} rows={2} className="input-field mt-1 w-full resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_current" {...register('is_current')} className="h-4 w-4 rounded" />
            <label htmlFor="is_current" className="text-sm text-slate-700">Mark as current session</label>
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

export function SessionsPage() {
  const qc = useQueryClient();
  const [modalSession, setModalSession] = useState<AcademicSession | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSession | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sessionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Academic Sessions"
        subtitle="Manage academic year sessions"
        action={
          <button onClick={() => setModalSession(null)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Session
          </button>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No sessions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Start</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">End</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.start_date}</td>
                  <td className="px-4 py-3 text-slate-600">{s.end_date}</td>
                  <td className="px-4 py-3">
                    {s.is_current ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> Current
                      </span>
                    ) : (
                      <span className="text-slate-400">Past</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalSession(s)} className="icon-btn" title="Edit">
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
        )}
      </div>

      {modalSession !== undefined && (
        <SessionModal session={modalSession} onClose={() => setModalSession(undefined)} />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Session"
        message={deleteTarget ? `Delete session "${deleteTarget.name}"? This cannot be undone.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
