import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import type { BookIssue } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize, inr } from './format';

const STATUS_BADGE: Record<string, string> = {
  issued: 'bg-blue-50 text-blue-700',
  overdue: 'badge-red',
  returned: 'badge-green',
  lost: 'bg-slate-100 text-slate-600',
};

export function MyLibraryPage() {
  const { data: issues = [], isLoading, error } = useQuery<BookIssue[]>({
    queryKey: ['me', 'library'],
    queryFn: () => meApi.library().then((r) => r.data),
  });

  const current = issues.filter((i) => i.status === 'issued' || i.status === 'overdue');
  const history = issues.filter((i) => !(i.status === 'issued' || i.status === 'overdue'));
  const unpaidFines = issues.filter((i) => (i.fine_amount ?? 0) > 0 && !i.fine_paid)
    .reduce((sum, i) => sum + (i.fine_amount ?? 0), 0);

  const table = (rows: BookIssue[], showReturn: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Book</th>
            <th className="px-4 py-2.5">Issued</th>
            <th className="px-4 py-2.5">{showReturn ? 'Returned' : 'Due'}</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Fine</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className="px-4 py-2.5">
                <p className="font-medium text-slate-900">{i.book_title}</p>
                {i.accession_number && <p className="text-xs text-slate-500">Acc. {i.accession_number}</p>}
              </td>
              <td className="px-4 py-2.5">{formatDateShort(i.issue_date)}</td>
              <td className="px-4 py-2.5">
                {showReturn ? (i.return_date ? formatDateShort(i.return_date) : '—') : formatDateShort(i.due_date)}
                {!showReturn && (i.days_overdue ?? 0) > 0 && (
                  <span className="ml-2 text-xs text-red-600">{i.days_overdue} days late</span>
                )}
              </td>
              <td className="px-4 py-2.5"><span className={cn('badge', STATUS_BADGE[i.status])}>{humanize(i.status)}</span></td>
              <td className="px-4 py-2.5 text-right">
                {(i.fine_amount ?? 0) > 0 ? (
                  <span className={i.fine_paid ? 'text-slate-500' : 'text-red-600'}>
                    {inr(i.fine_amount)}{i.fine_paid && ' (paid)'}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <PageTitle title="My Library" subtitle="Books you have borrowed. Return or renew them at the library counter." />
      <MyPageState isLoading={isLoading} error={error} isEmpty={issues.length === 0} emptyText="You haven't borrowed any books yet.">
        <div className="space-y-6">
          {unpaidFines > 0 && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              You have unpaid library fines of <span className="font-semibold">{inr(unpaidFines)}</span>.
            </p>
          )}
          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              Currently borrowed ({current.length})
            </h2>
            {current.length ? table(current, false) : <p className="px-4 py-6 text-sm text-slate-500">No books with you right now.</p>}
          </section>
          {history.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">History</h2>
              {table(history, true)}
            </section>
          )}
        </div>
      </MyPageState>
    </div>
  );
}
