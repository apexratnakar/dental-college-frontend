import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Pencil, Trash2, X, UserPlus, AlertCircle, RefreshCw,
} from 'lucide-react';
import { employeeApi, facultyApi, usersApi, rolesApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { Department, Designation, Faculty, Role, PaginatedResponse } from '../../types';
import { getErrorMessage } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { digitsOnly, isValidMobile, MOBILE_ERROR, mobileInputProps } from '../../utils/validation';

// ── Department / designation masters ──────────────────────────────────────────
// Managed under Employee Management › Departments and › Designations.

function useFacultyMasters() {
  const { can } = useAuth();
  const enabled = can('employees:read');
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments', 'active'],
    queryFn: () => employeeApi.listDepartments({ is_active: true }).then((r) => r.data),
    enabled,
  });
  const { data: designations = [] } = useQuery<Designation[]>({
    queryKey: ['designations', 'active'],
    queryFn: () => employeeApi.listDesignations({ is_active: true }).then((r) => r.data),
    enabled,
  });
  return {
    departments: departments.map((d) => d.name),
    // Librarian, Warden etc. are staff designations — faculty pick from teaching ones
    designations: designations.filter((d) => d.category === 'teaching').map((d) => d.name),
    canManage: can('employees:create'),
  };
}

/** Keeps a saved value selectable even if it was renamed or removed from the master. */
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function MasterLabel({ label, required, to, canManage }: { label: string; required?: boolean; to: string; canManage: boolean }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <label className="block text-xs font-medium text-slate-700">{label}{required && ' *'}</label>
      {canManage && (
        <Link to={to} target="_blank" className="text-xs text-primary-600 hover:underline">Manage</Link>
      )}
    </div>
  );
}

// ── Add Faculty Modal ─────────────────────────────────────────────────────────

interface AddForm {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  role_id: string;
  employee_id: string;
  designation: string;
  department: string;
  specialization: string;
  qualification: string;
  experience_years: string;
  date_of_joining: string;
}

const defaultAddForm: AddForm = {
  first_name: '', last_name: '', email: '', mobile_number: '',
  password: '', confirm_password: '', role_id: '',
  employee_id: '', designation: '', department: '',
  specialization: '', qualification: '',
  experience_years: '', date_of_joining: '',
};

function AddFacultyModal({
  isOpen, onClose, roles, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSuccess: () => void;
}) {
  const masters = useFacultyMasters();
  const [form, setForm] = useState<AddForm>(defaultAddForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A faculty login must never carry the Student role
  const assignableRoles = roles.filter((r) => r.name.toLowerCase() !== 'student');

  useEffect(() => {
    const facultyRole = roles.find((r) => r.name === 'Faculty');
    if (facultyRole) setForm((f) => ({ ...f, role_id: String(facultyRole.id) }));
  }, [roles]);

  const set =
    (field: keyof AddForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (!form.employee_id.trim()) { setError('Employee ID is required'); return; }
    if (!form.designation) { setError('Designation is required'); return; }
    if (!isValidMobile(form.mobile_number)) { setError(MOBILE_ERROR); return; }

    setIsSubmitting(true);
    try {
      const { data: newUser } = await usersApi.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim() || undefined,
        mobile_number: form.mobile_number.trim() || undefined,
        password: form.password,
        role_ids: form.role_id ? [parseInt(form.role_id)] : [],
      });

      await facultyApi.create({
        user_id: newUser.id,
        employee_id: form.employee_id.trim(),
        designation: form.designation,
        department: form.department || undefined,
        specialization: form.specialization.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        date_of_joining: form.date_of_joining || undefined,
      });

      setForm(defaultAddForm);
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Add Faculty Member</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Personal Information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">First Name *</label>
                  <input value={form.first_name} onChange={set('first_name')} required className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Last Name</label>
                  <input value={form.last_name} onChange={set('last_name')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                  <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Mobile</label>
                  <input
                    {...mobileInputProps}
                    value={form.mobile_number}
                    onChange={(e) => set('mobile_number')(digitsOnly(e))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Confirm Password *</label>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={set('confirm_password')}
                    required
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">System Role</label>
                  <select value={form.role_id} onChange={set('role_id')} className={inputCls}>
                    <option value="">— No role —</option>
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Employee ID *</label>
                  <input value={form.employee_id} onChange={set('employee_id')} required className={inputCls} />
                </div>
                <div>
                  <MasterLabel label="Designation" required to="/employees/designations" canManage={masters.canManage} />
                  <select value={form.designation} onChange={set('designation')} required className={inputCls}>
                    <option value="">Select designation</option>
                    {withCurrent(masters.designations, form.designation).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <MasterLabel label="Department" to="/employees/departments" canManage={masters.canManage} />
                  <select value={form.department} onChange={set('department')} className={inputCls}>
                    <option value="">Select department</option>
                    {withCurrent(masters.departments, form.department).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Specialization</label>
                  <input value={form.specialization} onChange={set('specialization')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Qualification</label>
                  <input
                    value={form.qualification}
                    onChange={set('qualification')}
                    placeholder="e.g. BDS, MDS (Orthodontics)"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.experience_years}
                    onChange={set('experience_years')}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Date of Joining</label>
                  <input
                    type="date"
                    value={form.date_of_joining}
                    onChange={set('date_of_joining')}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? <Spinner size="sm" /> : <UserPlus className="h-4 w-4" />}
              Add Faculty
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Faculty Modal ────────────────────────────────────────────────────────

interface EditForm {
  designation: string;
  department: string;
  specialization: string;
  qualification: string;
  experience_years: string;
  date_of_joining: string;
  is_active: boolean;
  remarks: string;
}

function EditFacultyModal({
  faculty,
  onClose,
  onSuccess,
}: {
  faculty: Faculty;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const masters = useFacultyMasters();
  const [form, setForm] = useState<EditForm>({
    designation: faculty.designation ?? '',
    department: faculty.department ?? '',
    specialization: faculty.specialization ?? '',
    qualification: faculty.qualification ?? '',
    experience_years: faculty.experience_years != null ? String(faculty.experience_years) : '',
    date_of_joining: faculty.date_of_joining ?? '',
    is_active: faculty.is_active,
    remarks: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set =
    (field: keyof Omit<EditForm, 'is_active'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.designation) { setError('Designation is required'); return; }
    setIsSubmitting(true);
    try {
      await facultyApi.update(faculty.id, {
        designation: form.designation || undefined,
        department: form.department || undefined,
        specialization: form.specialization.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        date_of_joining: form.date_of_joining || undefined,
        is_active: form.is_active,
        remarks: form.remarks.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit Faculty</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Editing:{' '}
              <span className="font-medium text-slate-800">{faculty.full_name ?? faculty.employee_id}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <MasterLabel label="Designation" required to="/employees/designations" canManage={masters.canManage} />
                <select value={form.designation} onChange={set('designation')} required className={inputCls}>
                  <option value="">Select designation</option>
                  {withCurrent(masters.designations, form.designation).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <MasterLabel label="Department" to="/employees/departments" canManage={masters.canManage} />
                <select value={form.department} onChange={set('department')} className={inputCls}>
                  <option value="">Select department</option>
                  {withCurrent(masters.departments, form.department).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Specialization</label>
                <input value={form.specialization} onChange={set('specialization')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Qualification</label>
                <input value={form.qualification} onChange={set('qualification')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={form.experience_years}
                  onChange={set('experience_years')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date of Joining</label>
                <input
                  type="date"
                  value={form.date_of_joining}
                  onChange={set('date_of_joining')}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={set('remarks')}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-slate-700">
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? <Spinner size="sm" /> : <Pencil className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FacultyPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Faculty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['faculty', page, search, deptFilter],
    queryFn: async () => {
      const { data } = await facultyApi.list({
        page,
        per_page: 20,
        search: search || undefined,
        department: deptFilter || undefined,
      });
      return data as PaginatedResponse<Faculty>;
    },
  });

  // Filter by the department master; users who can't read it get the departments in the current list
  const masters = useFacultyMasters();
  const deptOptions = withCurrent(
    masters.departments.length
      ? masters.departments
      : [...new Set((data?.items ?? []).map((f) => f.department).filter((d): d is string => !!d))],
    deptFilter,
  );

  // Adding faculty creates a login, so it needs both permissions; the roles list is only for that form.
  const canAddFaculty = can('faculty:create') && can('users:create');
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r: { data: Role[] }) => r.data),
    enabled: canAddFaculty && can('roles:read'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => facultyApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      setDeleteTarget(null);
    },
  });

  const invalidateFaculty = () => qc.invalidateQueries({ queryKey: ['faculty'] });

  return (
    <div>
      <PageTitle title="Faculty" subtitle="Manage faculty members and their department assignments" />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search faculty…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          {deptOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {canAddFaculty && (
          <div className="ml-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Faculty
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-slate-600">Failed to load faculty. Check server connection.</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {search || deptFilter
              ? 'No faculty match your filters.'
              : 'No faculty found. Add faculty members using the button above.'}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Employee ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Exp.</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{f.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{f.email ?? f.mobile_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                        {f.employee_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.designation ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{f.department ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {f.experience_years != null ? `${f.experience_years} yr` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={f.is_active ? 'badge-active' : 'badge-inactive'}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(f)}
                          className="icon-btn"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-slate-400 hover:text-primary-600" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          className="icon-btn"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} faculty members</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2">
                    {page} / {data.pages}
                  </span>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <AddFacultyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          roles={roles}
          onSuccess={invalidateFaculty}
        />
      )}

      {editTarget && (
        <EditFacultyModal
          faculty={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={invalidateFaculty}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Faculty"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.full_name ?? deleteTarget.employee_id}" from faculty records? This cannot be undone.`
            : ''
        }
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
