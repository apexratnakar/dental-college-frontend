import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Edit2, Trash2, Shield, Lock, Unlock, X, ChevronLeft, ChevronRight,
  KeyRound, Eye, EyeOff, Copy, Check,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersApi, rolesApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { PaginatedResponse, Role, User } from '../../types';
import { getErrorMessage } from '../../types';
import { cn, formatDateShort } from '../../utils';
import { digitsOnly, mobileField, mobileInputProps } from '../../utils/validation';

// ── Schemas ───────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  mobile_number: mobileField,
  username: z.string().optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'At least 8 chars')
    .regex(/[A-Z]/, 'Uppercase required')
    .regex(/[a-z]/, 'Lowercase required')
    .regex(/\d/, 'Digit required'),
  role_ids: z.array(z.number()).optional(),
}).refine((d) => d.email || d.mobile_number, {
  message: 'Email or mobile number is required',
  path: ['email'],
});

type CreateUserData = z.infer<typeof createUserSchema>;

const updateUserSchema = z.object({
  first_name: z.string().min(1, 'Required').optional(),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  mobile_number: mobileField,
  is_active: z.boolean().optional(),
});

type UpdateUserData = z.infer<typeof updateUserSchema>;

// ── Main Component ────────────────────────────────────────────────────────────

export function UserManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRoleId, setFilterRoleId] = useState<number | undefined>();
  const [filterBlocked, setFilterBlocked] = useState<boolean | undefined>();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [blockingUser, setBlockingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [assigningRoleUser, setAssigningRoleUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const { hasRole } = useAuth();
  // Mirrors the backend: only a Super Admin may reset a Super Admin's password
  const canResetPassword = (u: User) => hasRole('Super Admin') || !u.roles.some((r) => r.name === 'Super Admin');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, search, filterRoleId, filterBlocked],
    queryFn: async () => {
      const { data } = await usersApi.list({
        page,
        per_page: 20,
        search: search || undefined,
        role_id: filterRoleId,
        is_blocked: filterBlocked,
      });
      return data as PaginatedResponse<User>;
    },
    placeholderData: (prev) => prev,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await rolesApi.list();
      return data as Role[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => usersApi.create(data),
    onSuccess: () => { invalidateUsers(); setShowCreateModal(false); showToast('User created'); },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserData }) => usersApi.update(id, data),
    onSuccess: () => { invalidateUsers(); setEditingUser(null); showToast('User updated'); },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      blockingUser?.is_blocked ? usersApi.unblock(id) : usersApi.block(id, reason),
    onSuccess: () => {
      invalidateUsers();
      setBlockingUser(null);
      showToast(blockingUser?.is_blocked ? 'User unblocked' : 'User blocked');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { invalidateUsers(); setDeletingUser(null); showToast('User deleted'); },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      usersApi.assignRole(userId, roleId),
    onSuccess: () => { invalidateUsers(); showToast('Role assigned'); },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      usersApi.revokeRole(userId, roleId),
    onSuccess: () => { invalidateUsers(); showToast('Role revoked'); },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  return (
    <div>
      <PageTitle
        title="User Management"
        subtitle="Create and manage system users, roles, and access."
        action={
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Add User
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, mobile…"
            className="input-field pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="input-field w-auto"
          value={filterRoleId ?? ''}
          onChange={(e) => { setFilterRoleId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
        >
          <option value="">All Roles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select
          className="input-field w-auto"
          value={filterBlocked === undefined ? '' : String(filterBlocked)}
          onChange={(e) => {
            setFilterBlocked(e.target.value === '' ? undefined : e.target.value === 'true');
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Roles</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {usersData?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                        No users found
                      </td>
                    </tr>
                  )}
                  {usersData?.items.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {user.first_name[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                            {user.username && <p className="text-xs text-slate-400">@{user.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>{user.email ?? '—'}</div>
                        <div className="text-xs text-slate-400">{user.mobile_number ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="badge-gray">No role</span>
                          ) : (
                            user.roles.map((r) => (
                              <span key={r.id} className="badge-blue">{r.name}</span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_blocked ? (
                          <span className="badge-red">Blocked</span>
                        ) : user.is_active ? (
                          <span className="badge-green">Active</span>
                        ) : (
                          <span className="badge-yellow">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDateShort(user.last_login)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDateShort(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {canResetPassword(user) && (
                            <button
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600"
                              title="Reset password"
                              onClick={() => setResettingUser(user)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600"
                            title="Manage roles"
                            onClick={() => setAssigningRoleUser(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            className={cn(
                              'rounded p-1.5 hover:bg-slate-100',
                              user.is_blocked
                                ? 'text-slate-400 hover:text-emerald-600'
                                : 'text-slate-400 hover:text-amber-600'
                            )}
                            title={user.is_blocked ? 'Unblock' : 'Block'}
                            onClick={() => setBlockingUser(user)}
                          >
                            {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData && usersData.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, usersData.total)} of {usersData.total}
                </p>
                <div className="flex gap-1">
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    disabled={page === usersData.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create User Modal ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <UserFormModal
          title="Create User"
          roles={roles}
          isLoading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate(data as CreateUserData)}
          onClose={() => setShowCreateModal(false)}
          isCreate
        />
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────────── */}
      {editingUser && (
        <UserFormModal
          title="Edit User"
          defaultValues={editingUser}
          roles={roles}
          isLoading={updateMutation.isPending}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, data: data as UpdateUserData })}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* ── Block/Unblock Modal ────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!blockingUser}
        title={blockingUser?.is_blocked ? 'Unblock User' : 'Block User'}
        message={
          blockingUser?.is_blocked
            ? `Unblock ${blockingUser?.full_name}? They will regain access to the system.`
            : `Block ${blockingUser?.full_name}? They will lose access until unblocked.`
        }
        confirmLabel={blockingUser?.is_blocked ? 'Unblock' : 'Block'}
        variant={blockingUser?.is_blocked ? 'warning' : 'danger'}
        isLoading={blockMutation.isPending}
        onConfirm={() => blockingUser && blockMutation.mutate({ id: blockingUser.id })}
        onCancel={() => setBlockingUser(null)}
      />

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deletingUser}
        title="Delete User"
        message={`Permanently delete ${deletingUser?.full_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
        onCancel={() => setDeletingUser(null)}
      />

      {/* ── Reset Password Modal ───────────────────────────────────────────── */}
      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onDone={(msg) => showToast(msg)}
        />
      )}

      {/* ── Assign Role Modal ──────────────────────────────────────────────── */}
      {assigningRoleUser && (
        <RoleModal
          user={assigningRoleUser}
          roles={roles}
          isAssigning={assignRoleMutation.isPending}
          isRevoking={revokeRoleMutation.isPending}
          onAssign={(roleId) => assignRoleMutation.mutate({ userId: assigningRoleUser.id, roleId })}
          onRevoke={(roleId) => revokeRoleMutation.mutate({ userId: assigningRoleUser.id, roleId })}
          onClose={() => setAssigningRoleUser(null)}
        />
      )}
    </div>
  );
}

// ── User Form Modal ────────────────────────────────────────────────────────────

interface UserFormModalProps {
  title: string;
  defaultValues?: Partial<User>;
  roles: Role[];
  isLoading: boolean;
  isCreate?: boolean;
  onSubmit: (data: unknown) => void;
  onClose: () => void;
}

function UserFormModal({
  title, defaultValues, roles, isLoading, isCreate = false, onSubmit, onClose,
}: UserFormModalProps) {
  const schema = isCreate ? createUserSchema : updateUserSchema;
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      email: defaultValues?.email ?? '',
      mobile_number: defaultValues?.mobile_number ?? '',
      username: defaultValues?.username ?? '',
      password: '',
      role_ids: defaultValues?.roles?.map((r) => r.id) ?? [],
      is_active: defaultValues?.is_active ?? true,
    },
  });
  const mobileReg = register('mobile_number');

  const selectedRoleIds: number[] = watch('role_ids') ?? [];

  const toggleRole = (roleId: number) => {
    const current: number[] = selectedRoleIds;
    if (current.includes(roleId)) {
      setValue('role_ids', current.filter((id) => id !== roleId));
    } else {
      setValue('role_ids', [...current, roleId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" {...register('first_name')} />
              {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message as string}</p>}
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input-field" {...register('last_name')} />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="optional if mobile is provided" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input
              {...mobileReg}
              {...mobileInputProps}
              className="input-field"
              placeholder="10 digits, optional if email is provided"
              onChange={(e) => mobileReg.onChange(digitsOnly(e))}
            />
            {errors.mobile_number && <p className="mt-1 text-xs text-red-600">{errors.mobile_number.message as string}</p>}
          </div>

          {isCreate && (
            <div>
              <label className="label">Password *</label>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <input type="password" className="input-field" {...register('password' as never)} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(errors as Record<string, { message?: string }>).password && (
                <p className="mt-1 text-xs text-red-600">
                  {(errors as Record<string, { message?: string }>).password.message}
                </p>
              )}
            </div>
          )}

          {!isCreate && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active account</label>
            </div>
          )}

          {/* Roles */}
          <div>
            <label className="label">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    selectedRoleIds.includes(role.id)
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : null}
              {isCreate ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Role Assignment Modal ─────────────────────────────────────────────────────

interface RoleModalProps {
  user: User;
  roles: Role[];
  isAssigning: boolean;
  isRevoking: boolean;
  onAssign: (roleId: number) => void;
  onRevoke: (roleId: number) => void;
  onClose: () => void;
}

function RoleModal({ user, roles, isAssigning, isRevoking, onAssign, onRevoke, onClose }: RoleModalProps) {
  const userRoleIds = user.roles.map((r) => r.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Manage Roles</h2>
            <p className="text-sm text-slate-500">{user.full_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {roles.map((role) => {
            const assigned = userRoleIds.includes(role.id);
            return (
              <div key={role.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{role.name}</p>
                  <p className="text-xs text-slate-400">{role.description}</p>
                </div>
                {assigned ? (
                  <button
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                    disabled={isRevoking}
                    onClick={() => onRevoke(role.id)}
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    disabled={isAssigning}
                    onClick={() => onAssign(role.id)}
                  >
                    Assign
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────────

/** Same rules as the backend (_validate_password in app/schemas/user.py). */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'At least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Add a lowercase letter';
  if (!/\d/.test(pw)) return 'Add a digit';
  return null;
}

function ResetPasswordModal({
  user, onClose, onDone,
}: { user: User; onClose: () => void; onDone: (message: string) => void }) {
  const [mode, setMode] = useState<'generate' | 'manual'>('generate');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<{ message: string; temp_password: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const problem = mode === 'manual'
    ? passwordProblem(password) ?? (password !== confirm ? 'Passwords do not match' : null)
    : null;

  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id, mode === 'manual' ? password : undefined),
    onSuccess: ({ data }) => {
      setResult(data);
      onDone(data.message);
    },
  });

  const copy = async () => {
    if (!result?.temp_password) return;
    try {
      await navigator.clipboard.writeText(result.temp_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the password is still selectable on screen */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reset password</h2>
            <p className="text-sm text-slate-500">{user.full_name} · {user.email ?? user.mobile_number}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {result ? (
          <div className="space-y-4">
            {result.temp_password ? (
              <>
                <p className="text-sm text-slate-700">New temporary password. It is shown only this once, so copy it and share it with the user privately.</p>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <code className="flex-1 select-all font-mono text-base tracking-wide text-slate-900">{result.temp_password}</code>
                  <button onClick={copy} className="btn-secondary px-2 py-1 text-xs">
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-700">The password has been changed to the one you entered.</p>
            )}
            <p className="text-xs text-slate-500">{user.first_name} has been signed out of all devices and must log in with the new password.</p>
            <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>Done</button></div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!problem) mutation.mutate(); }}
          >
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Passwords are stored encrypted and can't be viewed by anyone. You can only replace them.
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="mode" className="mt-0.5" checked={mode === 'generate'} onChange={() => setMode('generate')} />
                <span><span className="font-medium text-slate-800">Generate a temporary password</span><br />
                  <span className="text-xs text-slate-500">12 random characters, shown once after you reset.</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="mode" className="mt-0.5" checked={mode === 'manual'} onChange={() => setMode('manual')} />
                <span className="font-medium text-slate-800">Set a password myself</span>
              </label>
            </div>

            {mode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-password" className="label">New password</label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-field pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">At least 8 characters with uppercase, lowercase and a digit.</p>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="label">Confirm password</label>
                  <input
                    id="confirm-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="input-field"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                {touched && problem && <p className="text-xs text-red-600">{problem}</p>}
              </div>
            )}

            {mutation.isError && <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
