import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { getErrorMessage } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';

// ── Types ────────────────────────────────────────────────────────────────────

type LoanStatus = 'pending' | 'approved' | 'active' | 'closed' | 'rejected';
type AdvanceStatus = 'pending' | 'approved' | 'recovering' | 'recovered' | 'rejected';
type LoanType = 'personal' | 'education' | 'home' | 'vehicle' | 'emergency' | 'other';

interface Installment {
  id: number;
  installment_number: number;
  due_year: number;
  due_month: number;
  amount: number;
  paid_amount: number;
  is_paid: boolean;
  paid_at: string | null;
}

interface Loan {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  loan_type: LoanType;
  purpose: string;
  loan_amount: number;
  interest_rate: number;
  total_installments: number;
  emi_amount: number;
  disbursement_date: string | null;
  start_month: number;
  start_year: number;
  outstanding_amount: number;
  status: LoanStatus;
  approved_at: string | null;
  remarks: string | null;
  installments: Installment[];
}

interface Advance {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  advance_amount: number;
  reason: string;
  advance_date: string;
  recovery_months: number;
  monthly_recovery: number;
  recovered_amount: number;
  outstanding_amount: number;
  status: AdvanceStatus;
  approved_at: string | null;
  remarks: string | null;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const loanSchema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  loan_type: z.enum(['personal', 'education', 'home', 'vehicle', 'emergency', 'other']),
  purpose: z.string().min(1, 'Purpose required'),
  loan_amount: z.coerce.number().min(1, 'Amount required'),
  interest_rate: z.coerce.number().min(0).max(100).default(0),
  total_installments: z.coerce.number().min(1).max(360),
  start_month: z.coerce.number().min(1).max(12),
  start_year: z.coerce.number().min(2020).max(2099),
});
type LoanForm = z.infer<typeof loanSchema>;

/** Monthly EMI on a reducing balance — same formula as the backend (calculate_emi). */
function calcEmi(principal: number, annualRatePct: number, months: number): number {
  if (!(principal > 0) || !(months >= 1)) return 0;
  const r = (annualRatePct || 0) / 1200;
  if (r === 0) return Math.round((principal / months) * 100) / 100;
  const g = Math.pow(1 + r, months);
  return Math.round(((principal * r * g) / (g - 1)) * 100) / 100;
}
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const advanceSchema = z.object({
  employee_id: z.coerce.number().min(1, 'Employee required'),
  advance_amount: z.coerce.number().min(1, 'Amount required'),
  reason: z.string().min(1, 'Reason required'),
  advance_date: z.string().min(1, 'Date required'),
  recovery_months: z.coerce.number().min(1),
});
type AdvanceForm = z.infer<typeof advanceSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-700',
  active:   'bg-green-100 text-green-800',
  closed:   'bg-slate-100 text-slate-500',
  rejected: 'bg-red-100 text-red-800',
};

const ADVANCE_STATUS_COLORS: Record<AdvanceStatus, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  approved:   'bg-blue-100 text-blue-700',
  recovering: 'bg-green-100 text-green-800',
  recovered:  'bg-slate-100 text-slate-500',
  rejected:   'bg-red-100 text-red-800',
};

const LOAN_TYPES: LoanType[] = ['personal', 'education', 'home', 'vehicle', 'emergency', 'other'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── Component ─────────────────────────────────────────────────────────────────

export function LoansPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'loans' | 'advances'>('loans');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [viewLoan, setViewLoan] = useState<Loan | null>(null);
  const [loanStatusFilter, setLoanStatusFilter] = useState<LoanStatus | ''>('');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<AdvanceStatus | ''>('');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: empData } = useQuery<{ items: Employee[] }>({
    queryKey: ['employees-list-all'],
    queryFn: () => api.get('/employees?is_active=true&per_page=500').then((r) => r.data),
  });
  const employees = empData?.items ?? [];

  const { data: loansData, isLoading: loansLoading } = useQuery<{ items: Loan[]; total: number }>({
    queryKey: ['loans', loanStatusFilter],
    queryFn: () => api.get(`/loans?per_page=100${loanStatusFilter ? `&status=${loanStatusFilter}` : ''}`).then((r) => r.data),
    enabled: activeTab === 'loans',
  });

  const { data: advancesData, isLoading: advancesLoading } = useQuery<{ items: Advance[]; total: number }>({
    queryKey: ['advances', advanceStatusFilter],
    queryFn: () => api.get(`/advances?per_page=100${advanceStatusFilter ? `&status=${advanceStatusFilter}` : ''}`).then((r) => r.data),
    enabled: activeTab === 'advances',
  });

  // Loan form
  const loanForm = useForm<LoanForm>({
    resolver: zodResolver(loanSchema) as any,
    defaultValues: { loan_type: 'personal', interest_rate: 0, start_month: currentMonth, start_year: currentYear },
  });

  const createLoanMutation = useMutation({
    mutationFn: (data: LoanForm) => api.post('/loans', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); setShowLoanModal(false); loanForm.reset(); },
  });

  const approveLoanMutation = useMutation({
    mutationFn: (id: number) => api.post(`/loans/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });

  const rejectLoanMutation = useMutation({
    mutationFn: (id: number) => api.post(`/loans/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });

  // Advance form
  const advanceForm = useForm<AdvanceForm>({
    resolver: zodResolver(advanceSchema) as any,
    defaultValues: { advance_date: new Date().toISOString().split('T')[0], recovery_months: 1 },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: (data: AdvanceForm) => api.post('/advances', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); setShowAdvanceModal(false); advanceForm.reset(); },
  });

  const approveAdvanceMutation = useMutation({
    mutationFn: (id: number) => api.post(`/advances/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['advances'] }),
  });

  const rejectAdvanceMutation = useMutation({
    mutationFn: (id: number) => api.post(`/advances/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['advances'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Loans & Advances" subtitle="Manage employee loans and salary advances" />
        <button
          onClick={() => activeTab === 'loans' ? (loanForm.reset({ loan_type: 'personal', interest_rate: 0, start_month: currentMonth, start_year: currentYear }), createLoanMutation.reset(), setShowLoanModal(true)) : (advanceForm.reset({ advance_date: new Date().toISOString().split('T')[0], recovery_months: 1 }), createAdvanceMutation.reset(), setShowAdvanceModal(true))}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> {activeTab === 'loans' ? 'New Loan' : 'New Advance'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['loans', 'advances'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <>
          <div className="flex gap-2">
            {(['', 'pending', 'approved', 'active', 'closed', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setLoanStatusFilter(s as LoanStatus | '')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${loanStatusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loansLoading ? (
              <p className="p-8 text-center text-slate-400">Loading...</p>
            ) : !loansData?.items.length ? (
              <p className="p-8 text-center text-slate-400">No loans found.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">EMI</th>
                    <th className="px-4 py-3 text-center">Installments</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loansData.items.map((loan) => (
                    <>
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {expandedLoan === loan.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{loan.employee_name}</p>
                          <p className="text-xs text-slate-400">{loan.employee_code}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">{loan.loan_type}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">₹{fmt(loan.loan_amount)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{fmt(loan.emi_amount)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{loan.total_installments}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">₹{fmt(loan.outstanding_amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LOAN_STATUS_COLORS[loan.status]}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setViewLoan(loan)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                              <Eye className="h-4 w-4" />
                            </button>
                            {loan.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveLoanMutation.mutate(loan.id)}
                                  disabled={approveLoanMutation.isPending}
                                  className="rounded-md p-1.5 text-green-500 hover:bg-green-50"
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => rejectLoanMutation.mutate(loan.id)}
                                  disabled={rejectLoanMutation.isPending}
                                  className="rounded-md p-1.5 text-red-400 hover:bg-red-50"
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Installment schedule expandable row */}
                      {expandedLoan === loan.id && loan.installments?.length > 0 && (
                        <tr key={`${loan.id}-installments`}>
                          <td colSpan={9} className="px-8 py-2 bg-slate-50">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Installment Schedule</p>
                            <div className="grid grid-cols-6 gap-1 text-xs">
                              {loan.installments.map((inst) => (
                                <div
                                  key={inst.id}
                                  className={`rounded-lg p-2 text-center ${inst.is_paid ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 text-slate-600'}`}
                                >
                                  <p className="font-medium">#{inst.installment_number}</p>
                                  <p>{MONTHS[inst.due_month - 1]} {inst.due_year}</p>
                                  <p>₹{fmt(inst.amount)}</p>
                                  {inst.is_paid && <p className="text-xs text-green-600 mt-0.5">Paid</p>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Advances Tab */}
      {activeTab === 'advances' && (
        <>
          <div className="flex gap-2">
            {(['', 'pending', 'approved', 'recovering', 'recovered', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setAdvanceStatusFilter(s as AdvanceStatus | '')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${advanceStatusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {advancesLoading ? (
              <p className="p-8 text-center text-slate-400">Loading...</p>
            ) : !advancesData?.items.length ? (
              <p className="p-8 text-center text-slate-400">No advances found.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Monthly Recovery</th>
                    <th className="px-4 py-3 text-center">Months</th>
                    <th className="px-4 py-3 text-right">Recovered</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advancesData.items.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{adv.employee_name}</p>
                        <p className="text-xs text-slate-400">{adv.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">₹{fmt(adv.advance_amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{fmt(adv.monthly_recovery)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{adv.recovery_months}</td>
                      <td className="px-4 py-3 text-right text-green-600">₹{fmt(adv.recovered_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">₹{fmt(adv.outstanding_amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{adv.advance_date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ADVANCE_STATUS_COLORS[adv.status]}`}>
                          {adv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {adv.status === 'pending' && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => approveAdvanceMutation.mutate(adv.id)}
                              disabled={approveAdvanceMutation.isPending}
                              className="rounded-md p-1.5 text-green-500 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => rejectAdvanceMutation.mutate(adv.id)}
                              disabled={rejectAdvanceMutation.isPending}
                              className="rounded-md p-1.5 text-red-400 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* New Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">New Loan Application</h2>
            <form onSubmit={loanForm.handleSubmit((d) => createLoanMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                <select {...loanForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                </select>
                {loanForm.formState.errors.employee_id && <p className="text-xs text-red-500 mt-1">{loanForm.formState.errors.employee_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loan Type *</label>
                  <select {...loanForm.register('loan_type')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {LOAN_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loan Amount *</label>
                  <input type="number" {...loanForm.register('loan_amount')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                  {loanForm.formState.errors.loan_amount && <p className="text-xs text-red-500 mt-1">{loanForm.formState.errors.loan_amount.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Interest Rate %</label>
                  <input type="number" step="0.01" {...loanForm.register('interest_rate')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Installments *</label>
                  <input type="number" {...loanForm.register('total_installments')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="12" />
                  {loanForm.formState.errors.total_installments && <p className="text-xs text-red-500 mt-1">{loanForm.formState.errors.total_installments.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Month *</label>
                  <select {...loanForm.register('start_month')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Year *</label>
                  <input type="number" {...loanForm.register('start_year')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose *</label>
                <textarea {...loanForm.register('purpose')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {loanForm.formState.errors.purpose && <p className="text-xs text-red-500 mt-1">{loanForm.formState.errors.purpose.message}</p>}
              </div>
              {(() => {
                const amount = Number(loanForm.watch('loan_amount')) || 0;
                const rate = Number(loanForm.watch('interest_rate')) || 0;
                const months = Number(loanForm.watch('total_installments')) || 0;
                const emi = calcEmi(amount, rate, months);
                if (!emi) return (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Enter the amount and number of installments to see the monthly EMI.</p>
                );
                const total = emi * months;
                return (
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2.5 text-center">
                    <div><p className="text-[11px] text-slate-500">Monthly EMI</p><p className="text-sm font-semibold tabular-nums text-slate-900">{rupees(emi)}</p></div>
                    <div><p className="text-[11px] text-slate-500">Total interest</p><p className="text-sm font-semibold tabular-nums text-slate-900">{rupees(Math.max(total - amount, 0))}</p></div>
                    <div><p className="text-[11px] text-slate-500">Total payable</p><p className="text-sm font-semibold tabular-nums text-slate-900">{rupees(total)}</p></div>
                  </div>
                );
              })()}
              {Object.keys(loanForm.formState.errors).some((k) => !['employee_id', 'loan_amount', 'total_installments', 'purpose'].includes(k)) && (
                <p className="text-xs text-red-500">Check the interest rate (0–100%), start month and start year.</p>
              )}
              {createLoanMutation.isError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(createLoanMutation.error)}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLoanModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createLoanMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createLoanMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">New Salary Advance</h2>
            <form onSubmit={advanceForm.handleSubmit((d) => createAdvanceMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
                <select {...advanceForm.register('employee_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ''} ({e.employee_code})</option>)}
                </select>
                {advanceForm.formState.errors.employee_id && <p className="text-xs text-red-500 mt-1">{advanceForm.formState.errors.employee_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Advance Amount *</label>
                  <input type="number" {...advanceForm.register('advance_amount')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                  {advanceForm.formState.errors.advance_amount && <p className="text-xs text-red-500 mt-1">{advanceForm.formState.errors.advance_amount.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Recovery Months *</label>
                  <input type="number" {...advanceForm.register('recovery_months')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="1" />
                  {advanceForm.formState.errors.recovery_months && <p className="text-xs text-red-500 mt-1">{advanceForm.formState.errors.recovery_months.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Advance Date *</label>
                <input type="date" {...advanceForm.register('advance_date')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {advanceForm.formState.errors.advance_date && <p className="text-xs text-red-500 mt-1">{advanceForm.formState.errors.advance_date.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                <textarea {...advanceForm.register('reason')} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {advanceForm.formState.errors.reason && <p className="text-xs text-red-500 mt-1">{advanceForm.formState.errors.reason.message}</p>}
              </div>
              {createAdvanceMutation.isError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(createAdvanceMutation.error)}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createAdvanceMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createAdvanceMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Detail View Modal */}
      {viewLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Loan Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Employee</dt><dd className="font-medium">{viewLoan.employee_name} ({viewLoan.employee_code})</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="capitalize">{viewLoan.loan_type}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Loan Amount</dt><dd className="font-medium">₹{fmt(viewLoan.loan_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Interest Rate</dt><dd>{viewLoan.interest_rate}%</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">EMI</dt><dd>₹{fmt(viewLoan.emi_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Installments</dt><dd>{viewLoan.total_installments}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd>{MONTHS[viewLoan.start_month - 1]} {viewLoan.start_year}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Outstanding</dt><dd className="font-medium text-orange-600">₹{fmt(viewLoan.outstanding_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LOAN_STATUS_COLORS[viewLoan.status]}`}>{viewLoan.status}</span></dd></div>
              {viewLoan.purpose && <div className="pt-2"><dt className="text-slate-500 mb-1">Purpose</dt><dd className="text-slate-700 bg-slate-50 rounded-lg p-2">{viewLoan.purpose}</dd></div>}
            </dl>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewLoan(null)} className="rounded-lg px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
