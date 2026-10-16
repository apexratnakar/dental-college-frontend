import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Search, Trash2, Eye, X, Building2 } from 'lucide-react';
import { employeeApi } from '../../services/api';
import type { EmployeeListItem, Department } from '../../types';
import { getErrorMessage } from '../../types';
import { digitsOnly, mobileField, mobileInputProps } from '../../utils/validation';

const CATEGORY_COLORS: Record<string, string> = {
  teaching: 'bg-blue-100 text-blue-700',
  administrative: 'bg-purple-100 text-purple-700',
  support: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_leave: 'bg-yellow-100 text-yellow-700',
  resigned: 'bg-red-100 text-red-700',
  terminated: 'bg-red-100 text-red-700',
  retired: 'bg-slate-100 text-slate-600',
  suspended: 'bg-orange-100 text-orange-700',
  joined: 'bg-blue-100 text-blue-700',
  selected: 'bg-teal-100 text-teal-700',
  applicant: 'bg-slate-100 text-slate-600',
};

const createSchema = z.object({
  employee_code: z.string().min(1, 'Employee code is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  mobile: mobileField,
  official_email: z.string().email('Invalid email').optional().or(z.literal('')),
  department_id: z.number().optional().nullable(),
  designation_id: z.number().optional().nullable(),
  category: z.enum(['teaching', 'administrative', 'support']),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  status: z.enum(['applicant', 'selected', 'joined', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'terminated']),
  date_of_joining: z.string().optional(),
  highest_qualification: z.string().optional(),
  experience_years: z.coerce.number().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  date_of_birth: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ items: EmployeeListItem[]; total: number; pages: number }>({
    queryKey: ['employees', page, search, deptFilter, categoryFilter, statusFilter],
    queryFn: () =>
      employeeApi.listEmployees({
        page, per_page: 20,
        search: search || undefined,
        department_id: deptFilter,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      }).then((r: { data: { items: EmployeeListItem[]; total: number; pages: number } }) => r.data),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeeApi.listDepartments({ is_active: true }).then((r: { data: Department[] }) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: { category: 'administrative', employment_type: 'full_time', status: 'active' },
  });
  const mobileReg = register('mobile');

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => {
      const payload = {
        ...data,
        official_email: data.official_email || undefined,
        date_of_joining: data.date_of_joining || undefined,
        date_of_birth: data.date_of_birth || undefined,
        department_id: data.department_id || undefined,
        designation_id: data.designation_id || undefined,
        gender: data.gender || undefined,
      };
      return employeeApi.createEmployee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowCreate(false);
      reset();
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const employees: EmployeeListItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} employees total</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          value={deptFilter ?? ''}
          onChange={(e) => { setDeptFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
        >
          <option value="">All Departments</option>
          {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          <option value="teaching">Teaching</option>
          <option value="administrative">Administrative</option>
          <option value="support">Support</option>
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="resigned">Resigned</option>
          <option value="terminated">Terminated</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Building2 className="h-8 w-8 mb-2" />
            <p>No employees found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Joining Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employee_code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {emp.first_name} {emp.last_name ?? ''}
                    </div>
                    {emp.official_email && (
                      <div className="text-xs text-slate-400">{emp.official_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.department_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.designation_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[emp.category] ?? ''}`}>
                      {emp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[emp.status] ?? ''}`}>
                      {emp.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {emp.date_of_joining ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {pages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Employee</h2>
              <button onClick={() => { setShowCreate(false); reset(); setError(''); }}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code *</label>
                  <input {...register('employee_code')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.employee_code && <p className="text-xs text-red-500 mt-1">{errors.employee_code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select {...register('gender')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input {...register('first_name')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input {...register('last_name')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                  <input
                    {...mobileReg}
                    {...mobileInputProps}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    onChange={(e) => mobileReg.onChange(digitsOnly(e))}
                  />
                  {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
                  <input {...register('official_email')} type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.official_email && <p className="text-xs text-red-500 mt-1">{errors.official_email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select {...register('department_id', { setValueAs: (v) => v ? Number(v) : null })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select Department</option>
                    {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input {...register('date_of_birth')} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select {...register('category')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="teaching">Teaching</option>
                    <option value="administrative">Administrative</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type *</label>
                  <select {...register('employment_type')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                  <select {...register('status')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="applicant">Applicant</option>
                    <option value="selected">Selected</option>
                    <option value="joined">Joined</option>
                    <option value="active">Active</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Joining</label>
                  <input {...register('date_of_joining')} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                  <input {...register('highest_qualification')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                  <input {...register('experience_years')} type="number" min="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); reset(); setError(''); }} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Employee</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>? This action cannot be undone.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

