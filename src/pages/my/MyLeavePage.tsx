import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import { getErrorMessage } from '../../types';
import type { MyLeaveApplication, MyLeaveBalance } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize } from './format';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  withdrawn: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
  draft: 'bg-slate-100 text-slate-600',
};

const days = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} day${n === 1 ? '' : 's'}`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ApplyLeaveModal({ balances, onClose }: { balances: MyLeaveBalance[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [typeId, setTypeId] = useState<number>(balances[0]?.leave_type_id ?? 0);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const selected = balances.find((b) => b.leave_type_id === typeId);
  const total = halfDay ? 0.5 : from && to && to >= from
    ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1
    : 0;
  const problem =
    !typeId ? 'Choose a leave type'
    : !from || !to ? 'Choose the dates'
    : to < from ? "The end date can't be before the start date"
    : !reason.trim() ? 'Please give a reason'
    : selected?.is_paid && total > selected.available
      ? `Only ${days(selected.available)} of ${selected.leave_type_name} available`
    : null;

  const mutation = useMutation({
    mutationFn: () => meApi.applyLeave({
      leave_type_id: typeId, from_date: from, to_date: halfDay ? from : to, is_half_day: halfDay, reason: reason.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'leave'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Apply for leave</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Close"><X className="h-4 w-4" /></button>
        </div>
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!problem) mutation.mutate(); }}
        >
          <div>
            <label htmlFor="leave-type" className="form-label">Leave type</label>
            <select id="leave-type" className="input w-full" value={typeId} onChange={(e) => setTypeId(Number(e.target.value))}>
              {balances.map((b) => (
                <option key={b.leave_type_id} value={b.leave_type_id}>
                  {b.leave_type_name}{b.is_paid ? ` — ${days(b.available)} available` : ' — unpaid'}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={halfDay} onChange={(e) => { setHalfDay(e.target.checked); if (e.target.checked) setTo(from); }} />
            Half day
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="leave-from" className="form-label">{halfDay ? 'Date' : 'From'}</label>
              <input id="leave-from" type="date" className="input w-full" value={from}
                onChange={(e) => { setFrom(e.target.value); if (halfDay || to < e.target.value) setTo(e.target.value); }} />
            </div>
            {!halfDay && (
              <div>
                <label htmlFor="leave-to" className="form-label">To</label>
                <input id="leave-to" type="date" className="input w-full" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="leave-reason" className="form-label">Reason</label>
            <textarea id="leave-reason" rows={2} className="input w-full resize-none" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {total > 0 ? <>You are applying for <span className="font-semibold">{days(total)}</span>.</> : 'Choose valid dates.'}
            {selected?.is_paid && total > 0 && <> {days(Math.max(selected.available - total, 0))} will remain after approval.</>}
          </p>
          {touched && problem && <p className="text-sm text-red-600">{problem}</p>}
          {mutation.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(mutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MyLeavePage() {
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const year = new Date().getFullYear();

  const balances = useQuery<MyLeaveBalance[]>({
    queryKey: ['me', 'leave', 'balances', year],
    queryFn: () => meApi.leaveBalances(year).then((r) => r.data),
  });
  const apps = useQuery<MyLeaveApplication[]>({
    queryKey: ['me', 'leave', 'applications'],
    queryFn: () => meApi.leaveApplications().then((r) => r.data),
  });
  const withdraw = useMutation({
    mutationFn: (id: number) => meApi.withdrawLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'leave'] }),
  });

  return (
    <div>
      <PageTitle
        title="My Leave"
        subtitle={`Your leave balance for ${year} and your applications. HR approves each request.`}
        action={
          <button className="btn-primary" onClick={() => setApplying(true)} disabled={!balances.data?.length}>
            <Plus className="h-4 w-4" /> Apply for leave
          </button>
        }
      />
      <MyPageState
        isLoading={balances.isLoading || apps.isLoading}
        error={balances.error || apps.error}
        isEmpty={!!balances.data && balances.data.length === 0}
        emptyText="No leave types are set up yet. Contact HR."
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {balances.data?.map((b) => {
              const total = b.allocated || 1;
              return (
                <div key={b.leave_type_id} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">{b.leave_type_name}</p>
                    <span className="text-xs font-mono text-slate-400">{b.leave_type_code}</span>
                  </div>
                  {b.is_paid ? (
                    <>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                        {b.available}<span className="ml-1 text-sm font-normal text-slate-500">of {b.allocated} left</span>
                      </p>
                      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="bg-slate-400" style={{ width: `${(b.used / total) * 100}%` }} title={`Used ${b.used}`} />
                        <div className="bg-amber-400" style={{ width: `${(b.pending / total) * 100}%` }} title={`Pending ${b.pending}`} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Used {b.used} · Pending {b.pending}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Unpaid leave, no balance needed.</p>
                  )}
                </div>
              );
            })}
          </div>

          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">My applications</h2>
            {withdraw.isError && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{getErrorMessage(withdraw.error)}</p>}
            {!apps.data?.length ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You haven't applied for leave yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Dates</th>
                      <th className="px-4 py-2.5 text-right">Days</th>
                      <th className="px-4 py-2.5">Reason</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apps.data.map((a) => {
                      const note = a.approvals?.[a.approvals.length - 1]?.remarks || a.remarks;
                      return (
                        <tr key={a.id} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900">{a.leave_type_name ?? a.leave_type_code}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">
                            {a.from_date === a.to_date ? formatDateShort(a.from_date) : `${formatDateShort(a.from_date)} – ${formatDateShort(a.to_date)}`}
                            {a.is_half_day && <span className="ml-1 text-xs text-slate-500">(half day)</span>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{a.total_days}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {a.reason}
                            {note && <p className="mt-0.5 text-xs text-slate-500">HR: {note}</p>}
                          </td>
                          <td className="px-4 py-3"><span className={cn('badge', STATUS_BADGE[a.status])}>{humanize(a.status)}</span></td>
                          <td className="px-4 py-3 text-right">
                            {a.status === 'pending' && (
                              <button
                                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                                disabled={withdraw.isPending}
                                onClick={() => withdraw.mutate(a.id)}
                              >
                                Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </MyPageState>

      {applying && balances.data && (
        <ApplyLeaveModal balances={balances.data} onClose={() => setApplying(false)} />
      )}
    </div>
  );
}
