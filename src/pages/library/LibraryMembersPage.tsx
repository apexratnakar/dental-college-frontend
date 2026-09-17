import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { libraryApi, studentsApi, employeeApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { LibraryMember, MemberType, PaginatedResponse } from '../../types';

// ── Zod Schema ────────────────────────────────────────────────────────────────

const memberSchema = z.object({
  member_type: z.enum(['student', 'faculty', 'employee']),
  student_id: z.coerce.number().int().positive().nullable().optional(),
  employee_id: z.coerce.number().int().positive().nullable().optional(),
  issue_limit: z.coerce.number().int().min(1).max(20).default(3),
  loan_days: z.coerce.number().int().min(1).max(365).default(14),
  max_renewals: z.coerce.number().int().min(0).max(10).default(2),
  membership_start: z.string().optional().nullable(),
  membership_end: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

type MemberFormData = z.infer<typeof memberSchema>;

// ── Member Modal ──────────────────────────────────────────────────────────────

function MemberModal({
  member,
  onClose,
}: {
  member: LibraryMember | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isCreate = !member;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema) as any,
    defaultValues: member
      ? {
          member_type: member.member_type,
          student_id: member.student_id,
          employee_id: member.employee_id,
          issue_limit: member.issue_limit,
          loan_days: member.loan_days,
          max_renewals: member.max_renewals,
          membership_start: member.membership_start ?? '',
          membership_end: member.membership_end ?? '',
          is_active: member.is_active,
          notes: member.notes ?? '',
        }
      : {
          member_type: 'student',
          issue_limit: 3,
          loan_days: 14,
          max_renewals: 2,
          is_active: true,
        },
  });

  const memberType = watch('member_type');

  // Load students for dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-select'],
    queryFn: async () => {
      const { data } = await studentsApi.list({ per_page: 500 });
      return data;
    },
  });

  // Load employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-select'],
    queryFn: async () => {
      const { data } = await employeeApi.listEmployees({ per_page: 500 });
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: (data: MemberFormData) => {
      const payload = {
        ...data,
        student_id: data.member_type === 'student' ? data.student_id : null,
        employee_id: data.member_type !== 'student' ? data.employee_id : null,
        membership_start: data.membership_start || null,
        membership_end: data.membership_end || null,
        notes: data.notes || null,
      };
      return isCreate
        ? libraryApi.createMember(payload)
        : libraryApi.updateMember(member.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-members'] });
      onClose();
    },
  });

  const students = (studentsData as any)?.items ?? [];
  const employees = (employeesData as any)?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isCreate ? 'New Library Member' : 'Edit Member'}
        </h2>

        {member && (
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
            Card: {member.library_card_number}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Member Type */}
          <div>
            <label className="text-sm font-medium text-slate-700">Member Type *</label>
            <select {...register('member_type')} className="input-field mt-1 w-full">
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {/* Conditional person selector */}
          {memberType === 'student' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Student *</label>
              <select {...register('student_id')} className="input-field mt-1 w-full">
                <option value="">— Select student —</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name || s.enrollment_number} ({s.enrollment_number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700">Employee *</label>
              <select {...register('employee_id')} className="input-field mt-1 w-full">
                <option value="">— Select employee —</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Issue Limit</label>
              <input
                type="number" min={1} max={20}
                {...register('issue_limit', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              />
              {errors.issue_limit && <p className="mt-1 text-xs text-red-500">{errors.issue_limit.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Loan Days</label>
              <input
                type="number" min={1} max={365}
                {...register('loan_days', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Max Renewals</label>
              <input
                type="number" min={0} max={10}
                {...register('max_renewals', { valueAsNumber: true })}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>

          {/* Membership dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Membership Start</label>
              <input type="date" {...register('membership_start')} className="input-field mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Membership End</label>
              <input type="date" {...register('membership_end')} className="input-field mt-1 w-full" />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active_m" {...register('is_active')} className="h-4 w-4 rounded" />
            <label htmlFor="is_active_m" className="text-sm text-slate-700">Active</label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-field mt-1 w-full resize-none" />
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

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  student: 'Student',
  faculty: 'Faculty',
  employee: 'Employee',
};

const MEMBER_TYPE_COLORS: Record<MemberType, string> = {
  student: 'bg-blue-100 text-blue-700',
  faculty: 'bg-purple-100 text-purple-700',
  employee: 'bg-teal-100 text-teal-700',
};

export function LibraryMembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [memberType, setMemberType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<LibraryMember | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<LibraryMember | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library-members', page, search, memberType],
    queryFn: async () => {
      const { data } = await libraryApi.listMembers({
        page,
        per_page: 20,
        search: search || undefined,
        member_type: memberType || undefined,
      });
      return data as PaginatedResponse<LibraryMember>;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => libraryApi.deleteMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-members'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageTitle
        title="Library Members"
        subtitle="Manage library membership for students, faculty, and employees"
        action={
          <button onClick={() => setModal(null)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Member
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-64">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by card or notes…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={memberType}
          onChange={(e) => { setMemberType(e.target.value); setPage(1); }}
          className="input-field py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No members found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Card Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Limit</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Loan Days</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{m.library_card_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.member_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${MEMBER_TYPE_COLORS[m.member_type]}`}>
                        {MEMBER_TYPE_LABELS[m.member_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{m.issue_limit}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{m.loan_days}d</td>
                    <td className="px-4 py-3">
                      <span className={m.is_active ? 'badge-active' : 'badge-inactive'}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModal(m)} className="icon-btn" title="Edit">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(m)} className="icon-btn" title="Deactivate">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} members</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">Prev</button>
                  <span className="px-2">{page} / {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal !== undefined && (
        <MemberModal member={modal} onClose={() => setModal(undefined)} />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Deactivate Member"
        message={
          deleteTarget
            ? `Deactivate library membership for "${deleteTarget.member_name}" (${deleteTarget.library_card_number})?`
            : ''
        }
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
