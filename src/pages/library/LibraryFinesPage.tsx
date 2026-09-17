import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { libraryApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { LibraryFineRule, BookIssue, PaginatedResponse } from '../../types';

// ── Fine Rule Schemas & Modal ─────────────────────────────────────────────────

const fineRuleSchema = z.object({
  rule_name: z.string().min(1, 'Name is required').max(200),
  min_overdue_days: z.coerce.number().int().min(1, 'Min days must be at least 1'),
  max_overdue_days: z.coerce.number().int().min(1).nullable().optional(),
  fine_per_day: z.coerce.number().min(0, 'Fine must be ≥ 0'),
  applies_to: z.enum(['all', 'student', 'faculty']),
  is_active: z.boolean(),
});

type FineRuleFormData = z.infer<typeof fineRuleSchema>;

function FineRuleModal({
  rule,
  onClose,
}: {
  rule: LibraryFineRule | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !rule;
  const [unlimited, setUnlimited] = useState(!rule?.max_overdue_days);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FineRuleFormData>({
    resolver: zodResolver(fineRuleSchema) as any,
    defaultValues: rule
      ? {
          rule_name: rule.rule_name,
          min_overdue_days: rule.min_overdue_days,
          max_overdue_days: rule.max_overdue_days,
          fine_per_day: rule.fine_per_day,
          applies_to: rule.applies_to,
          is_active: rule.is_active,
        }
      : {
          rule_name: '',
          min_overdue_days: 1,
          max_overdue_days: null,
          fine_per_day: 2,
          applies_to: 'all',
          is_active: true,
        },
  });

  const mutation = useMutation({
    mutationFn: (data: FineRuleFormData) => {
      const payload = {
        ...data,
        max_overdue_days: unlimited ? null : data.max_overdue_days,
      };
      return isCreate
        ? libraryApi.createFineRule(payload)
        : libraryApi.updateFineRule(rule.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-fine-rules'] });
      onClose();
    },
  });

  const handleUnlimitedChange = (checked: boolean) => {
    setUnlimited(checked);
    if (checked) setValue('max_overdue_days', null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Fine Rule' : 'Edit Fine Rule'}
        </h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Rule Name *</label>
            <input {...register('rule_name')} placeholder="e.g. Standard Fine" className="input-field mt-1 w-full" />
            {errors.rule_name && <p className="mt-1 text-xs text-red-500">{errors.rule_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Min Overdue Days *</label>
              <input
                type="number" min={1}
                {...register('min_overdue_days', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              />
              {errors.min_overdue_days && <p className="mt-1 text-xs text-red-500">{errors.min_overdue_days.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Max Overdue Days</label>
              <input
                type="number" min={1}
                disabled={unlimited}
                {...register('max_overdue_days', { valueAsNumber: true })}
                className="input-field mt-1 w-full disabled:opacity-40"
                placeholder={unlimited ? 'Unlimited' : ''}
              />
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="checkbox"
                  id="unlimited"
                  checked={unlimited}
                  onChange={(e) => handleUnlimitedChange(e.target.checked)}
                  className="h-3 w-3"
                />
                <label htmlFor="unlimited" className="text-xs text-slate-500">Unlimited</label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">₹ per Day *</label>
              <input
                type="number" min={0} step="0.01"
                {...register('fine_per_day', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              />
              {errors.fine_per_day && <p className="mt-1 text-xs text-red-500">{errors.fine_per_day.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Applies To</label>
              <select {...register('applies_to')} className="input-field mt-1 w-full">
                <option value="all">All</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="fr_active" {...register('is_active')} className="h-4 w-4 rounded" />
            <label htmlFor="fr_active" className="text-sm text-slate-700">Active</label>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = 'rules' | 'fines';

export function LibraryFinesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('rules');
  const [ruleModal, setRuleModal] = useState<LibraryFineRule | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<LibraryFineRule | null>(null);
  const [finesPage, setFinesPage] = useState(1);

  // Fine rules
  const { data: rules, isLoading: rulesLoading } = useQuery<LibraryFineRule[]>({
    queryKey: ['library-fine-rules'],
    queryFn: async () => {
      const { data } = await libraryApi.listFineRules();
      return data as LibraryFineRule[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => libraryApi.deleteFineRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-fine-rules'] });
      setDeleteTarget(null);
    },
  });

  // Outstanding fines (issues with fine_amount > 0)
  const { data: finesData, isLoading: finesLoading } = useQuery({
    queryKey: ['library-outstanding-fines', finesPage],
    queryFn: async () => {
      const { data } = await libraryApi.listIssues({ page: finesPage, per_page: 20, status: 'overdue' });
      return data as PaginatedResponse<BookIssue>;
    },
    enabled: tab === 'fines',
  });

  return (
    <div>
      <PageTitle
        title="Library Fines"
        subtitle="Manage fine rules and view outstanding fines"
        action={
          tab === 'rules' ? (
            <button onClick={() => setRuleModal(null)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Rule
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(['rules', 'fines'] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'rules' ? 'Fine Rules' : 'Outstanding Fines'}
          </button>
        ))}
      </div>

      {/* Fine Rules Tab */}
      {tab === 'rules' && (
        <div className="card overflow-hidden">
          {rulesLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !rules?.length ? (
            <div className="py-12 text-center text-sm text-slate-400">No fine rules defined</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Rule Name</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Min Days</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Max Days</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">₹/Day</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Applies To</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Active</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.rule_name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{r.min_overdue_days}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {r.max_overdue_days ?? <span className="text-slate-400">∞</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">₹{Number(r.fine_per_day).toFixed(2)}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{r.applies_to}</td>
                    <td className="px-4 py-3">
                      <span className={r.is_active ? 'badge-active' : 'badge-inactive'}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setRuleModal(r)} className="icon-btn" title="Edit">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(r)} className="icon-btn" title="Delete">
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
      )}

      {/* Outstanding Fines Tab */}
      {tab === 'fines' && (
        <div className="card overflow-hidden">
          {finesLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !finesData?.items.length ? (
            <div className="py-12 text-center text-sm text-slate-400">No outstanding fines</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Book</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Issue Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Due Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Fine ₹</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Days Overdue</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {finesData.items.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">
                        <div className="font-medium">{issue.book_title}</div>
                        {issue.book_isbn && (
                          <div className="text-xs text-slate-400">{issue.book_isbn}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900">{issue.student_name}</div>
                        <div className="text-xs text-slate-400">{issue.enrollment_number}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{issue.issue_date}</td>
                      <td className="px-4 py-3 text-slate-600">{issue.due_date}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {issue.fine_amount != null ? `₹${issue.fine_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600">
                        {issue.days_overdue ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 capitalize">
                          {issue.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {finesData.pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                  <span>{finesData.total} records</span>
                  <div className="flex gap-2">
                    <button disabled={finesPage <= 1} onClick={() => setFinesPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">Prev</button>
                    <span className="px-2">{finesPage} / {finesData.pages}</span>
                    <button disabled={finesPage >= finesData.pages} onClick={() => setFinesPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fine Rule Modal */}
      {ruleModal !== undefined && (
        <FineRuleModal rule={ruleModal} onClose={() => setRuleModal(undefined)} />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Fine Rule"
        message={deleteTarget ? `Delete rule "${deleteTarget.rule_name}"? This cannot be undone.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
