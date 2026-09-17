import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Eye, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';

// ── Types ────────────────────────────────────────────────────────────────────

type ResignationStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed';
type SettlementStatus = 'draft' | 'verified' | 'approved' | 'paid';

interface Resignation {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  resignation_date: string;
  notice_period_days: number;
  last_working_date: string | null;
  reason: string;
  status: ResignationStatus;
  cleared_at: string | null;
  remarks: string | null;
}

interface Settlement {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  resignation_id: number | null;
  settlement_date: string;
  notice_period_recovery: number;
  leave_encashment: number;
  gratuity: number;
  outstanding_loan_deduction: number;
  advance_recovery: number;
  other_deductions: number;
  other_earnings: number;
  gross_salary_payable: number;
  total_deductions: number;
  net_payable: number;
  status: SettlementStatus;
  processed_by_name: string | null;
  approved_by_name: string | null;
  remarks: string | null;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const resignationSchema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  resignation_date: z.string().min(1, 'Date required'),
  notice_period_days: z.coerce.number().min(0).default(30),
  last_working_date: z.string().optional(),
  reason: z.string().min(1, 'Reason required'),
});
type ResignationForm = z.infer<typeof resignationSchema>;

const settlementSchema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  resignation_id: z.coerce.number().optional(),
  settlement_date: z.string().min(1, 'Date required'),
  gross_salary_payable: z.coerce.number().min(0),
  notice_period_recovery: z.coerce.number().default(0),
  leave_encashment: z.coerce.number().min(0).default(0),
  gratuity: z.coerce.number().min(0).default(0),
  outstanding_loan_deduction: z.coerce.number().min(0).default(0),
  advance_recovery: z.coerce.number().min(0).default(0),
  other_deductions: z.coerce.number().min(0).default(0),
  other_earnings: z.coerce.number().min(0).default(0),
  remarks: z.string().optional(),
});
type SettlementForm = z.infer<typeof settlementSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const RES_STATUS_COLORS: Record<ResignationStatus, string> = {
  submitted:    'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-800',
  accepted:     'bg-green-100 text-green-800',
  rejected:     'bg-red-100 text-red-800',
  completed:    'bg-slate-100 text-slate-500',
};

const SET_STATUS_COLORS: Record<SettlementStatus, string> = {
  draft:    'bg-slate-100 text-slate-600',
  verified: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-800',
  paid:     'bg-emerald-100 text-emerald-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── Component ─────────────────────────────────────────────────────────────────

export function SeparationPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resignations' | 'settlements'>('resignations');
  const [showResModal, setShowResModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [viewResignation, setViewResignation] = useState<Resignation | null>(null);
  const [viewSettlement, setViewSettlement] = useState<Settlement | null>(null);
  const [resStatusFilter, setResStatusFilter] = useState<ResignationStatus | ''>('');
  const [setStatusFilter, setSetStatusFilter] = useState<SettlementStatus | ''>('');

  const { data: empData } = useQuery<{ items: Employee[] }>({
    queryKey: ['employees-list-all'],
    queryFn: () => api.get('/employees?is_active=true&per_page=500').then((r) => r.data),
  });
  const employees = empData?.items ?? [];

  const { data: resignationsData, isLoading: resLoading } = useQuery<{ items: Resignation[]; total: number }>({
    queryKey: ['resignations', resStatusFilter],
    queryFn: () => api.get(`/separation/resignations?per_page=100${resStatusFilter ? `&status=${resStatusFilter}` : ''}`).then((r) => r.data),
    enabled: activeTab === 'resignations',
  });

  const { data: settlementsData, isLoading: setLoading } = useQuery<{ items: Settlement[]; total: number }>({
    queryKey: ['settlements', setStatusFilter],
    queryFn: () => api.get(`/separation/settlements?per_page=100${setStatusFilter ? `&status=${setStatusFilter}` : ''}`).then((r) => r.data),
    enabled: activeTab === 'settlements',
  });

  // Resignation form
  const resForm = useForm<ResignationForm>({
    resolver: zodResolver(resignationSchema) as any,
    defaultValues: { resignation_date: new Date().toISOString().split('T')[0], notice_period_days: 30 },
  });

  const createResMutation = useMutation({
    mutationFn: (data: ResignationForm) => api.post('/separation/resignations', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resignations'] }); setShowResModal(false); resForm.reset(); },
  });

  const acceptResMutation = useMutation({
    mutationFn: (id: number) => api.put(`/separation/resignations/${id}/accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });

  // Settlement form
  const setForm = useForm<SettlementForm>({
    resolver: zodResolver(settlementSchema) as any,
    defaultValues: {
      settlement_date: new Date().toISOString().split('T')[0],
      gross_salary_payable: 0,
      notice_period_recovery: 0,
      leave_encashment: 0,
      gratuity: 0,
      outstanding_loan_deduction: 0,
      advance_recovery: 0,
      other_deductions: 0,
      other_earnings: 0,
    },
  });

  const createSetMutation = useMutation({
    mutationFn: (data: SettlementForm) => api.post('/separation/settlements', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settlements'] }); setShowSetModal(false); setForm.reset(); },
  });

  const approveSetMutation = useMutation({
    mutationFn: (id: number) => api.put(`/separation/settlements/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });

  const paySetMutation = useMutation({
    mutationFn: (id: number) => api.put(`/separation/settlements/${id}/pay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Employee Separation" subtitle="Manage resignations and full & final settlements" />
        <button
          onClick={() => activeTab === 'resignations' ? (resForm.reset({ resignation_date: new Date().toISOString().split('T')[0], notice_period_days: 30 }), setShowResModal(true)) : (setForm.reset(), setShowSetModal(true))}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> {activeTab === 'resignations' ? 'New Resignation' : 'New Settlement'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['resignations', 'settlements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'settlements' ? 'F&F Settlements' : 'Resignations'}
          </button>
        ))}
      </div>

      {/* Resignations Tab */}
      {activeTab === 'resignations' && (
        <>
          <div className="flex gap-2">
            {(['', 'submitted', 'under_review', 'accepted', 'rejected', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setResStatusFilter(s as ResignationStatus | '')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${resStatusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {resLoading ? (
              <p className="p-8 text-center text-slate-400">Loading...</p>
            ) : !resignationsData?.items.length ? (
              <p className="p-8 text-center text-slate-400">No resignations found.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Resignation Date</th>
                    <th className="px-4 py-3 text-center">Notice Period</th>
                    <th className="px-4 py-3 text-left">Last Working Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resignationsData.items.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{res.employee_name}</p>
                        <p className="text-xs text-slate-400">{res.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{res.resignation_date}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{res.notice_period_days} days</td>
                      <td className="px-4 py-3 text-slate-600">{res.last_working_date ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RES_STATUS_COLORS[res.status]}`}>
                          {res.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setViewResignation(res)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Eye className="h-4 w-4" />
                          </button>
                          {(res.status === 'submitted' || res.status === 'under_review') && (
                            <button
                              onClick={() => acceptResMutation.mutate(res.id)}
                              disabled={acceptResMutation.isPending}
                              className="rounded-md p-1.5 text-green-500 hover:bg-green-50"
                              title="Accept Resignation"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <>
          <div className="flex gap-2">
            {(['', 'draft', 'verified', 'approved', 'paid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSetStatusFilter(s as SettlementStatus | '')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${setStatusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {setLoading ? (
              <p className="p-8 text-center text-slate-400">Loading...</p>
            ) : !settlementsData?.items.length ? (
              <p className="p-8 text-center text-slate-400">No settlements found.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Settlement Date</th>
                    <th className="px-4 py-3 text-right">Gross Salary</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Payable</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlementsData.items.map((sett) => (
                    <tr key={sett.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{sett.employee_name}</p>
                        <p className="text-xs text-slate-400">{sett.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sett.settlement_date}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{fmt(sett.gross_salary_payable)}</td>
                      <td className="px-4 py-3 text-right text-red-600">₹{fmt(sett.total_deductions)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">₹{fmt(sett.net_payable)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SET_STATUS_COLORS[sett.status]}`}>
                          {sett.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setViewSettlement(sett)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Eye className="h-4 w-4" />
                          </button>
                          {sett.status === 'draft' && (
                            <button
                              onClick={() => approveSetMutation.mutate(sett.id)}
                              disabled={approveSetMutation.isPending}
                              className="rounded-md p-1.5 text-green-500 hover:bg-green-50"
                              title="Approve Settlement"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {sett.status === 'approved' && (
                            <button
                              onClick={() => paySetMutation.mutate(sett.id)}
                              disabled={paySetMutation.isPending}
                              className="rounded-md p-1.5 text-blue-500 hover:bg-blue-50"
                              title="Mark as Paid"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* New Resignation Modal */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Record Resignation</h2>
            <form onSubmit={resForm.handleSubmit((d) => createResMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                <select {...resForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                </select>
                {resForm.formState.errors.employee_id && <p className="text-xs text-red-500 mt-1">{resForm.formState.errors.employee_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Resignation Date *</label>
                  <input type="date" {...resForm.register('resignation_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notice Period (days)</label>
                  <input type="number" {...resForm.register('notice_period_days')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last Working Date</label>
                <input type="date" {...resForm.register('last_working_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                <textarea {...resForm.register('reason')} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {resForm.formState.errors.reason && <p className="text-xs text-red-500 mt-1">{resForm.formState.errors.reason.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowResModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createResMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createResMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Settlement Modal */}
      {showSetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Full & Final Settlement</h2>
            <p className="text-sm text-slate-500 mb-4">Enter settlement components. Net payable will be auto-calculated.</p>
            <form onSubmit={setForm.handleSubmit((d) => createSetMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                  <select {...setForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select employee</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                  </select>
                  {setForm.formState.errors.employee_id && <p className="text-xs text-red-500 mt-1">{setForm.formState.errors.employee_id.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Settlement Date *</label>
                  <input type="date" {...setForm.register('settlement_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase mt-2">Earnings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gross Salary Payable</label>
                  <input type="number" step="0.01" {...setForm.register('gross_salary_payable')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Leave Encashment</label>
                  <input type="number" step="0.01" {...setForm.register('leave_encashment')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gratuity</label>
                  <input type="number" step="0.01" {...setForm.register('gratuity')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Other Earnings</label>
                  <input type="number" step="0.01" {...setForm.register('other_earnings')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase mt-2">Deductions</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notice Period Recovery</label>
                  <input type="number" step="0.01" {...setForm.register('notice_period_recovery')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loan Deduction</label>
                  <input type="number" step="0.01" {...setForm.register('outstanding_loan_deduction')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Advance Recovery</label>
                  <input type="number" step="0.01" {...setForm.register('advance_recovery')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Other Deductions</label>
                  <input type="number" step="0.01" {...setForm.register('other_deductions')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
                <textarea {...setForm.register('remarks')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSetModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createSetMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createSetMutation.isPending ? 'Creating...' : 'Create Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Resignation Modal */}
      {viewResignation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Resignation Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Employee</dt><dd className="font-medium">{viewResignation.employee_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Employee Code</dt><dd>{viewResignation.employee_code}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Resignation Date</dt><dd>{viewResignation.resignation_date}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Notice Period</dt><dd>{viewResignation.notice_period_days} days</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Last Working Date</dt><dd>{viewResignation.last_working_date ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RES_STATUS_COLORS[viewResignation.status]}`}>{viewResignation.status.replace('_', ' ')}</span></dd></div>
              <div className="pt-2"><dt className="text-slate-500 mb-1">Reason</dt><dd className="text-slate-700 bg-slate-50 rounded-lg p-2">{viewResignation.reason}</dd></div>
              {viewResignation.remarks && <div><dt className="text-slate-500 mb-1">Remarks</dt><dd className="text-slate-700 bg-slate-50 rounded-lg p-2">{viewResignation.remarks}</dd></div>}
            </dl>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewResignation(null)} className="rounded-lg px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Settlement Modal */}
      {viewSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">F&F Settlement Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Employee</dt><dd className="font-medium">{viewSettlement.employee_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Settlement Date</dt><dd>{viewSettlement.settlement_date}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SET_STATUS_COLORS[viewSettlement.status]}`}>{viewSettlement.status}</span></dd></div>
            </dl>

            <p className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-2">Earnings</p>
            <dl className="space-y-1.5 text-sm bg-green-50 rounded-lg p-3">
              <div className="flex justify-between"><dt className="text-slate-600">Gross Salary Payable</dt><dd className="font-medium">₹{fmt(viewSettlement.gross_salary_payable)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Leave Encashment</dt><dd>₹{fmt(viewSettlement.leave_encashment)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Gratuity</dt><dd>₹{fmt(viewSettlement.gratuity)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Other Earnings</dt><dd>₹{fmt(viewSettlement.other_earnings)}</dd></div>
            </dl>

            <p className="text-xs font-semibold text-slate-500 uppercase mt-3 mb-2">Deductions</p>
            <dl className="space-y-1.5 text-sm bg-red-50 rounded-lg p-3">
              <div className="flex justify-between"><dt className="text-slate-600">Notice Period Recovery</dt><dd>₹{fmt(viewSettlement.notice_period_recovery)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Loan Deduction</dt><dd>₹{fmt(viewSettlement.outstanding_loan_deduction)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Advance Recovery</dt><dd>₹{fmt(viewSettlement.advance_recovery)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Other Deductions</dt><dd>₹{fmt(viewSettlement.other_deductions)}</dd></div>
              <div className="flex justify-between font-medium border-t border-red-200 pt-1.5"><dt className="text-red-700">Total Deductions</dt><dd className="text-red-700">₹{fmt(viewSettlement.total_deductions)}</dd></div>
            </dl>

            <div className="mt-3 flex justify-between items-center bg-slate-800 text-white rounded-lg p-3">
              <span className="font-semibold">Net Payable</span>
              <span className="text-lg font-bold text-green-300">₹{fmt(viewSettlement.net_payable)}</span>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewSettlement(null)} className="rounded-lg px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
