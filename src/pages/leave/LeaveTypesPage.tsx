import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';

interface LeaveType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  max_days_per_year: number;
  carry_forward: boolean;
  max_carry_forward_days: number;
  is_paid: boolean;
  applicable_gender: 'all' | 'male' | 'female';
  is_active: boolean;
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(20),
  description: z.string().optional(),
  max_days_per_year: z.coerce.number().min(0),
  max_consecutive_days: z.coerce.number().optional(),
  carry_forward: z.boolean(),
  max_carry_forward_days: z.coerce.number().min(0),
  is_paid: z.boolean(),
  applicable_gender: z.enum(['all', 'male', 'female']),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export function LeaveTypesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LeaveType | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: leaveTypes = [], isLoading } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leave/types').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { carry_forward: false, is_paid: true, applicable_gender: 'all', is_active: true, max_days_per_year: 0, max_carry_forward_days: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => editItem
      ? api.put(`/leave/types/${editItem.id}`, data)
      : api.post('/leave/types', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/leave/types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); setDeleteId(null); },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ carry_forward: false, is_paid: true, applicable_gender: 'all', is_active: true, max_days_per_year: 0, max_carry_forward_days: 0 });
    setShowModal(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditItem(lt);
    reset({
      name: lt.name, code: lt.code, description: lt.description ?? '',
      max_days_per_year: lt.max_days_per_year, carry_forward: lt.carry_forward,
      max_carry_forward_days: lt.max_carry_forward_days, is_paid: lt.is_paid,
      applicable_gender: lt.applicable_gender, is_active: lt.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditItem(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Leave Types" subtitle="Configure leave types available to employees" />
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Add Leave Type
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading...</p>
        ) : leaveTypes.length === 0 ? (
          <p className="p-8 text-center text-slate-400">No leave types configured yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-center">Max Days/Year</th>
                <th className="px-4 py-3 text-center">Carry Forward</th>
                <th className="px-4 py-3 text-center">Paid</th>
                <th className="px-4 py-3 text-center">Gender</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveTypes.map((lt) => (
                <tr key={lt.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{lt.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{lt.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{lt.max_days_per_year}</td>
                  <td className="px-4 py-3 text-center">
                    {lt.carry_forward
                      ? <span className="text-green-600 text-xs">Yes ({lt.max_carry_forward_days}d)</span>
                      : <span className="text-slate-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lt.is_paid
                      ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 capitalize">{lt.applicable_gender}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${lt.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {lt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(lt)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(lt.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editItem ? 'Edit Leave Type' : 'Add Leave Type'}
            </h2>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                  <input {...register('name')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
                  <input {...register('code')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input {...register('description')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Days / Year</label>
                  <input type="number" step="0.5" {...register('max_days_per_year')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Applicable Gender</label>
                  <select {...register('applicable_gender')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="all">All</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Carry Forward Days</label>
                  <input type="number" step="0.5" {...register('max_carry_forward_days')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('carry_forward')} className="rounded border-slate-300 text-primary-600" />
                  Carry Forward
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('is_paid')} className="rounded border-slate-300 text-primary-600" />
                  Paid Leave
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('is_active')} className="rounded border-slate-300 text-primary-600" />
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : (editItem ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Leave Type"
        message="Are you sure you want to delete this leave type?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
