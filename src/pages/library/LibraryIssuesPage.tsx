import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, RotateCcw, RefreshCw } from 'lucide-react';
import { libraryApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import type { BookIssue, IssueStatus } from '../../types';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<IssueStatus, string> = {
  issued:   'bg-blue-100 text-blue-700',
  overdue:  'bg-red-100 text-red-700',
  returned: 'bg-green-100 text-green-700',
  lost:     'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  issued:   'Issued',
  overdue:  'Overdue',
  returned: 'Returned',
  lost:     'Lost',
};

// ── Return modal ──────────────────────────────────────────────────────────────

const returnSchema = z.object({
  return_date: z.string().min(1, 'Required'),
  fine_amount: z.number().min(0).nullable().optional(),
  remarks: z.string().max(500).optional(),
  condition_on_return: z.enum(['good', 'damaged', 'lost']).optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

function ReturnModal({
  issue,
  onClose,
  onSaved,
}: {
  issue: BookIssue;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      return_date: new Date().toISOString().slice(0, 10),
      fine_amount: issue.days_overdue ? Math.max(0, issue.days_overdue * 2) : undefined,
      condition_on_return: 'good',
    },
  });

  const onSubmit = async (values: ReturnFormData) => {
    setError(null);
    try {
      await libraryApi.returnBook(issue.id, {
        return_date: values.return_date,
        fine_amount: values.fine_amount ?? null,
        remarks: values.remarks || null,
        condition_on_return: values.condition_on_return || null,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Process Return</h2>
            <p className="text-xs text-slate-500 mt-0.5">{issue.book_title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Issue summary */}
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Student</span>
              <span className="font-medium text-slate-900">{issue.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issued</span>
              <span className="text-slate-700">{issue.issue_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due date</span>
              <span className={issue.days_overdue ? 'text-red-600 font-medium' : 'text-slate-700'}>
                {issue.due_date}
                {issue.days_overdue ? ` (${issue.days_overdue}d overdue)` : ''}
              </span>
            </div>
            {issue.accession_number && (
              <div className="flex justify-between">
                <span className="text-slate-500">Copy</span>
                <span className="font-mono text-xs text-slate-700">{issue.accession_number}</span>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Return Date *</label>
            <input type="date" {...register('return_date')} className="input w-full" />
            {errors.return_date && <p className="form-error">{errors.return_date.message}</p>}
          </div>

          <div>
            <label className="form-label">Condition on Return</label>
            <select {...register('condition_on_return')} className="input w-full">
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="form-label">Fine Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('fine_amount', { valueAsNumber: true })}
              className="input w-full"
              placeholder="0.00"
            />
            {issue.days_overdue && (
              <p className="text-xs text-amber-600 mt-1">
                Suggested: ₹{(issue.days_overdue * 2).toFixed(2)} (₹2/day × {issue.days_overdue} days)
              </p>
            )}
          </div>

          <div>
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} className="input w-full" rows={2} placeholder="Additional notes…" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Processing…' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Renew modal ───────────────────────────────────────────────────────────────

const renewSchema = z.object({
  new_due_date: z.string().optional(),
});

type RenewFormData = z.infer<typeof renewSchema>;

function RenewModal({
  issue,
  onClose,
}: {
  issue: BookIssue;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Default new due date: due_date + 14 days
  const defaultNewDue = new Date(issue.due_date);
  defaultNewDue.setDate(defaultNewDue.getDate() + 14);
  const defaultNewDueStr = defaultNewDue.toISOString().slice(0, 10);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<RenewFormData>({
    resolver: zodResolver(renewSchema),
    defaultValues: { new_due_date: defaultNewDueStr },
  });

  const mutation = useMutation({
    mutationFn: (data: RenewFormData) =>
      libraryApi.renewIssue(issue.id, { new_due_date: data.new_due_date || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-issues'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const maxRenewals = 2; // soft UI limit; backend enforces actual
  const renewalsLeft = maxRenewals - (issue.renewal_count ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Renew Issue</h2>
            <p className="text-xs text-slate-500 mt-0.5">{issue.book_title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Student</span>
              <span className="font-medium text-slate-900">{issue.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current due date</span>
              <span className={issue.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-700'}>
                {issue.due_date}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Renewals used</span>
              <span className="text-slate-700">{issue.renewal_count ?? 0} / {maxRenewals}</span>
            </div>
            {renewalsLeft <= 0 && (
              <p className="text-xs text-red-600 mt-1">Renewal limit reached — backend may reject this request.</p>
            )}
          </div>

          <div>
            <label className="form-label">New Due Date</label>
            <input type="date" {...register('new_due_date')} className="input w-full" />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use default loan period extension.</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Renewing…' : 'Confirm Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const STATUS_TABS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'issued', label: 'Issued' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
];

export function LibraryIssuesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');
  const [page, setPage] = useState(1);
  const [returnIssue, setReturnIssue] = useState<BookIssue | null>(null);
  const [renewTarget, setRenewTarget] = useState<BookIssue | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library-issues', statusFilter, page],
    queryFn: async () => {
      const { data } = await libraryApi.listIssues({
        page,
        per_page: 20,
        status: statusFilter || undefined,
      });
      return data as { items: BookIssue[]; total: number; page: number; per_page: number; pages: number };
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['library-issues'] });
    qc.invalidateQueries({ queryKey: ['library-books'] });
    setReturnIssue(null);
  };

  const overdueCount = data?.items.filter((i) => i.status === 'overdue').length ?? 0;
  const totalPages = data?.pages ?? Math.ceil((data?.total ?? 0) / 20);

  return (
    <div>
      <PageTitle
        title="Library — Issues"
        subtitle="Track book loans, overdue items, and process returns"
      />

      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.value === 'overdue' && overdueCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No issues found for the selected filter.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Book</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Issued</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Due / Returned</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((issue) => (
                <tr
                  key={issue.id}
                  className={
                    issue.status === 'overdue' ? 'bg-red-50/30' :
                    issue.status === 'returned' ? 'bg-green-50/10' : ''
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 leading-tight line-clamp-1">{issue.book_title}</p>
                    {issue.accession_number && (
                      <p className="text-[11px] text-slate-400 font-mono">{issue.accession_number}</p>
                    )}
                    {!issue.accession_number && issue.book_isbn && (
                      <p className="text-[11px] text-slate-400 font-mono">{issue.book_isbn}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{issue.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{issue.enrollment_number}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                    {issue.issue_date}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {issue.return_date ? (
                      <span className="text-green-700">{issue.return_date}</span>
                    ) : (
                      <span className={issue.days_overdue ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                        {issue.due_date}
                        {issue.days_overdue ? (
                          <span className="ml-1 text-[10px]">({issue.days_overdue}d late)</span>
                        ) : null}
                      </span>
                    )}
                    {issue.fine_amount != null && issue.fine_amount > 0 && (
                      <p className="text-amber-700 mt-0.5">Fine: ₹{issue.fine_amount.toFixed(2)}</p>
                    )}
                    {(issue.renewal_count ?? 0) > 0 && (
                      <p className="text-slate-400 mt-0.5 text-[10px]">Renewed ×{issue.renewal_count}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[issue.status]}`}>
                      {issue.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                      {issue.status === 'returned' && <CheckCircle2 className="h-3 w-3" />}
                      {STATUS_LABELS[issue.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(issue.status === 'issued' || issue.status === 'overdue') && (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Renew button — visible when renewal_count < 2 */}
                        {(issue.renewal_count ?? 0) < 2 && (
                          <button
                            onClick={() => setRenewTarget(issue)}
                            className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            title="Renew"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Renew
                          </button>
                        )}
                        <button
                          onClick={() => setReturnIssue(issue)}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Return
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{data.total} records</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1 text-xs disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Return modal */}
      {returnIssue && (
        <ReturnModal
          issue={returnIssue}
          onClose={() => setReturnIssue(null)}
          onSaved={invalidate}
        />
      )}

      {/* Renew modal */}
      {renewTarget && (
        <RenewModal
          issue={renewTarget}
          onClose={() => setRenewTarget(null)}
        />
      )}
    </div>
  );
}
