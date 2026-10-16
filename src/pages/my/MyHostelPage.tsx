import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, Mail, Phone, UserRound } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import type { MyHostel } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize, inr } from './format';

export function MyHostelPage() {
  const { data: h, isLoading, error } = useQuery<MyHostel>({
    queryKey: ['me', 'hostel'],
    queryFn: () => meApi.hostel().then((r) => r.data),
  });

  return (
    <div>
      <PageTitle title="My Hostel" subtitle="Your room, warden and hostel charges." />
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={!!h && !h.allocated}
        emptyText="You haven't been allotted a hostel room. Contact the hostel warden to apply."
      >
        {h && h.allocated && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="card p-5 lg:col-span-2">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <BedDouble className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{h.hostel_name}</h2>
                    <p className="text-sm text-slate-500">{humanize(h.hostel_type)} hostel{h.address && ` · ${h.address}`}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  {[
                    ['Room', h.room_number],
                    ['Floor', h.floor !== null ? String(h.floor) : '—'],
                    ['Room type', `${humanize(h.room_type)} (${h.capacity} beds)`],
                    ['Checked in', h.check_in_date ? formatDateShort(h.check_in_date) : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roommates</p>
                  {h.roommates.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">No roommates yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {h.roommates.map((m) => (
                        <li key={m.enrollment_number} className="text-slate-800">
                          {m.name} <span className="text-xs text-slate-500">· {m.enrollment_number} · Year {m.year_of_study}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Warden</p>
                {h.warden_name ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-2 font-medium text-slate-900"><UserRound className="h-4 w-4 text-slate-400" />{h.warden_name}</p>
                    {h.warden_mobile && <p className="flex items-center gap-2 text-slate-700 select-all"><Phone className="h-4 w-4 text-slate-400" />{h.warden_mobile}</p>}
                    {h.warden_email && <p className="flex items-center gap-2 break-all text-slate-700 select-all"><Mail className="h-4 w-4 text-slate-400" />{h.warden_email}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No warden assigned yet.</p>
                )}
                <p className="mt-4 text-xs text-slate-500">
                  For leave or outing permission, complaints or visitors, contact the warden.
                </p>
              </section>
            </div>

            <section className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Hostel fees · {h.session_name}</h2>
                  <p className="text-xs text-slate-500">Also included in <Link to="/my/fees" className="text-primary-600 hover:underline">My Fees</Link>.</p>
                </div>
                <p className="text-sm tabular-nums">
                  Paid <span className="font-semibold text-emerald-600">{inr(h.total_paid)}</span> of {inr(h.total_due)} ·
                  Balance <span className={cn('font-semibold', h.total_balance > 0 ? 'text-red-600' : 'text-emerald-600')}>{inr(h.total_balance)}</span>
                </p>
              </header>
              {h.fees.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No hostel charges yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {h.fees.map((f, i) => {
                    const title = (f.description ?? 'Hostel charge').split(' · ')[0];
                    const paid = f.status === 'paid';
                    return (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{title}</p>
                          <p className="text-xs text-slate-500">
                            {f.due_date ? `Due ${formatDateShort(f.due_date)}` : ''}
                            {paid && f.paid_on && ` · Paid ${formatDateShort(f.paid_on)}`}
                            {f.receipt_no && ` · ${f.receipt_no}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums font-medium text-slate-900">{inr(f.amount_due)}</span>
                          <span className={cn('badge',
                            paid ? 'badge-green' : f.is_overdue ? 'badge-red' : f.status === 'waived' ? 'bg-slate-100 text-slate-600' : 'badge-yellow')}>
                            {paid ? 'Paid' : f.is_overdue ? 'Overdue' : humanize(f.status) || 'Pending'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </MyPageState>
    </div>
  );
}
