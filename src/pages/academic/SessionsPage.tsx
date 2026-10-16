import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sessionsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { AcademicSession } from '../../types';
import { formatDateShort } from '../../utils';

/** Today as YYYY-MM-DD in local time (date inputs use the same format, so strings compare correctly). */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type SessionPhase = 'ongoing' | 'upcoming' | 'ended';
const phaseOf = (start: string, end: string): SessionPhase => {
  const t = todayISO();
  return end < t ? 'ended' : start > t ? 'upcoming' : 'ongoing';
};

// Mirrors the backend rules in app/api/v1/sessions.py
const sessionSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    is_current: z.boolean(),
    description: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.start_date && v.end_date && v.end_date <= v.start_date) {
      ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'End date must be after the start date' });
      return;
    }
    if (v.is_current && v.start_date && v.end_date) {
      const phase = phaseOf(v.start_date, v.end_date);
      if (phase !== 'ongoing') {
        ctx.addIssue({
          code: 'custom',
          path: ['is_current'],
          message: `Only the session that includes today (${formatDateShort(todayISO())}) can be current. This one ${
            phase === 'ended' ? 'has already ended' : "hasn't started yet"}.`,
        });
      }
    }
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
  // The current session can only be replaced (by marking another current), not unticked.
  const lockedCurrent = !!session?.is_current;

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
        // a disabled checkbox submits nothing, so keep the current flag as it is
        : sessionsApi.update(session.id, lockedCurrent ? { ...data, is_current: true } : data),
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
            <input {...register('name')} placeholder="2026-27" className="input-field mt-1 w-full" />
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
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                {...register('is_current')}
                disabled={lockedCurrent}
                className="h-4 w-4 rounded disabled:opacity-60"
              />
              <label htmlFor="is_current" className="text-sm text-slate-700">Mark as current session</label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {lockedCurrent
                ? 'This is the current session. To change it, mark another session as current.'
                : 'Only the session whose dates include today can be current. Past sessions can still be added for older batches.'}
            </p>
            {errors.is_current && <p className="mt-1 text-xs text-red-500">{errors.is_current.message}</p>}
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

function StatusCell({ s }: { s: AcademicSession }) {
  const phase = phaseOf(s.start_date, s.end_date);
  if (s.is_current) {
    return phase === 'ongoing' ? (
      <span className="flex items-center gap-1 font-medium text-emerald-600">
        <CheckCircle className="h-4 w-4" /> Current
      </span>
    ) : (
      <span className="flex items-center gap-1 font-medium text-amber-600" title="Marked current, but today is outside its dates">
        <AlertTriangle className="h-4 w-4" /> Current ({phase === 'ended' ? 'ended' : 'not started'})
      </span>
    );
  }
  const label = { ongoing: 'Ongoing', upcoming: 'Upcoming', ended: 'Ended' }[phase];
  const cls = { ongoing: 'text-slate-700', upcoming: 'text-blue-600', ended: 'text-slate-400' }[phase];
  return <span className={cls}>{label}</span>;
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
    onError: () => setDeleteTarget(null),
  });

  const current = data?.find((s) => s.is_current);
  const currentPhase = current ? phaseOf(current.start_date, current.end_date) : null;
  const ongoing = data?.find((s) => !s.is_current && phaseOf(s.start_date, s.end_date) === 'ongoing');

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

      {!isLoading && data && currentPhase !== 'ongoing' && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">
              {!current
                ? 'No session is marked as current.'
                : currentPhase === 'ended'
                  ? `The current session ${current.name} ended on ${formatDateShort(current.end_date)}.`
                  : `The current session ${current.name} doesn't start until ${formatDateShort(current.start_date)}.`}
            </p>
            <p className="mt-0.5">
              {ongoing
                ? `Edit ${ongoing.name} and mark it as current.`
                : "Create the session that includes today's date and mark it as current."}{' '}
              Fees, timetables and student pages use the current session by default.
            </p>
          </div>
        </div>
      )}

      {deleteMutation.isError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{getErrorMessage(deleteMutation.error)}</p>
      )}

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
                  <td className="px-4 py-3 text-slate-600">{formatDateShort(s.start_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateShort(s.end_date)}</td>
                  <td className="px-4 py-3"><StatusCell s={s} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalSession(s)} className="icon-btn" title="Edit">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </button>
                      {!s.is_current && (
                        <button
                          onClick={() => { deleteMutation.reset(); setDeleteTarget(s); }}
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
