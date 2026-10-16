import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import type { FeeStatementLine, StudentFeeStatement } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize, inr } from './format';

function FeeTable({ lines, hostel }: { lines: FeeStatementLine[]; hostel: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Fee</th>
            <th className="px-4 py-3">Due date</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Balance</th>
            <th className="px-4 py-3">Payments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {lines.map((l, i) => {
            // Hostel descriptions read "Mess charges – Oct 2026 · Sushruta Boys Hostel, Room B-101"
            const [title, place] = (l.description ?? '').split(' · ');
            return (
              <tr key={`${l.source}-${l.fee_structure_id ?? i}`} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{hostel ? title || 'Hostel charge' : humanize(l.fee_category)}</p>
                  {hostel && place && <p className="text-xs text-slate-500">{place}</p>}
                </td>
                <td className="px-4 py-3">
                  {l.due_date ? formatDateShort(l.due_date) : '—'}
                  {l.is_overdue && l.balance > 0 && <span className="badge badge-red ml-2">Overdue</span>}
                </td>
                <td className="px-4 py-3 text-right">{inr(l.amount_due)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{inr(l.amount_paid)}</td>
                <td className={cn('px-4 py-3 text-right font-medium', l.balance > 0 ? 'text-red-600' : 'text-slate-500')}>
                  {inr(l.balance)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {hostel ? (
                    l.status === 'paid' ? (
                      <div>
                        {l.paid_on ? formatDateShort(l.paid_on) : 'Paid'}
                        {l.receipt_no && <span className="text-slate-400"> · {l.receipt_no}</span>}
                      </div>
                    ) : l.status === 'waived' ? 'Waived' : '—'
                  ) : l.payments.length === 0 ? '—' : l.payments.map((p) => (
                    <div key={p.id}>
                      {formatDateShort(p.payment_date)} · {inr(p.amount_paid)}
                      {p.receipt_number && <span className="text-slate-400"> · {p.receipt_number}</span>}
                    </div>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MyFeesPage() {
  const { data, isLoading, error } = useQuery<StudentFeeStatement>({
    queryKey: ['me', 'fees'],
    queryFn: () => meApi.fees().then((r) => r.data),
  });

  const course = data?.lines.filter((l) => l.source !== 'hostel') ?? [];
  const hostel = data?.lines.filter((l) => l.source === 'hostel') ?? [];
  const sum = (ls: FeeStatementLine[]) => ls.reduce((t, l) => t + l.balance, 0);

  return (
    <div>
      <PageTitle
        title="My Fees"
        subtitle={data?.session_name ? `Fee statement for session ${data.session_name}.` : 'Your fee statement.'}
      />
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={!!data && data.lines.length === 0}
        emptyText="No fees have been set for your course and year in this session."
      >
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Total due', value: data.total_due, cls: 'text-slate-900' },
                { label: 'Paid', value: data.total_paid, cls: 'text-emerald-600' },
                { label: 'Balance', value: data.total_balance, cls: data.total_balance > 0 ? 'text-red-600' : 'text-emerald-600' },
              ].map((t) => (
                <div key={t.label} className="card p-5">
                  <p className="text-sm text-slate-500">{t.label}</p>
                  <p className={cn('mt-1 text-2xl font-bold tabular-nums', t.cls)}>{inr(t.value)}</p>
                  {t.label === 'Balance' && hostel.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Course {inr(sum(course))} · Hostel {inr(sum(hostel))}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {course.length > 0 && (
              <section className="card overflow-hidden">
                <header className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">Course fees</h2>
                  <p className="text-xs text-slate-500">Pay at the accounts office.</p>
                </header>
                <FeeTable lines={course} hostel={false} />
              </section>
            )}

            {hostel.length > 0 && (
              <section className="card overflow-hidden">
                <header className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">Hostel fees</h2>
                  <p className="text-xs text-slate-500">Pay at the hostel office. See My Hostel for your room details.</p>
                </header>
                <FeeTable lines={hostel} hostel />
              </section>
            )}
          </div>
        )}
      </MyPageState>
    </div>
  );
}
