import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import type { MyEmployeeProfile, MySalary, MySalaryLine } from '../../types';
import { MyPageState } from './MyPageState';
import { inr } from './format';

function LinesTable({ title, lines, total, tone }: { title: string; lines: MySalaryLine[]; total: number; tone: 'earn' | 'deduct' }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{title}</h2>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {lines.map((l) => (
            <tr key={l.code}>
              <td className="px-4 py-2.5">
                <p className="text-slate-900">{l.name}</p>
                <p className="text-xs text-slate-500">{l.basis}</p>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{inr(l.monthly_amount)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="px-4 py-2.5">Total per month</td>
            <td className={cn('px-4 py-2.5 text-right tabular-nums', tone === 'earn' ? 'text-emerald-700' : 'text-red-700')}>{inr(total)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export function MySalaryPage() {
  const profile = useQuery<MyEmployeeProfile>({ queryKey: ['me', 'employee'], queryFn: () => meApi.employee().then((r) => r.data) });
  const { data: s, isLoading, error } = useQuery<MySalary>({ queryKey: ['me', 'salary'], queryFn: () => meApi.salary().then((r) => r.data) });
  const p = profile.data;

  return (
    <div>
      <PageTitle
        title="My Salary"
        subtitle={p ? `${p.full_name} · ${p.employee_code}${p.designation ? ` · ${p.designation}` : ''}${p.department ? `, ${p.department}` : ''}` : 'Your salary structure.'}
      />
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={!!s && !s.assigned}
        emptyText="No salary structure has been assigned to you yet. Contact HR."
      >
        {s && s.assigned && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Annual CTC', value: s.ctc_annual ?? s.gross_monthly * 12, cls: 'text-slate-900' },
                { label: 'Gross per month', value: s.gross_monthly, cls: 'text-slate-900' },
                { label: 'Deductions per month', value: s.deductions_monthly, cls: 'text-red-600' },
                { label: 'Net pay per month', value: s.net_monthly, cls: 'text-emerald-600' },
              ].map((t) => (
                <div key={t.label} className="card p-5">
                  <p className="text-sm text-slate-500">{t.label}</p>
                  <p className={cn('mt-1 text-2xl font-bold tabular-nums', t.cls)}>{inr(t.value)}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              Structure <span className="font-medium text-slate-700">{s.structure_name}</span>
              {s.effective_from && <> · effective from {formatDateShort(s.effective_from)}</>}
              {s.basic_monthly !== null && <> · basic {inr(s.basic_monthly)} per month</>}
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <LinesTable title="Earnings" lines={s.earnings} total={s.gross_monthly} tone="earn" />
              <LinesTable title="Deductions" lines={s.deductions} total={s.deductions_monthly} tone="deduct" />
            </div>
            <p className="text-xs text-slate-500">
              Monthly figures are for a full month. Actual pay can differ for unpaid leave, loan EMIs or arrears. See My Payslips for what was paid.
            </p>
          </div>
        )}
      </MyPageState>
    </div>
  );
}
