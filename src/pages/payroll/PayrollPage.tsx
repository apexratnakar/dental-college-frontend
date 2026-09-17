import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Lock, Eye, Play, Send, CheckCircle, FileText, CreditCard, Download } from 'lucide-react';
import { payrollApi } from '../../services/api';
import type { PayrollPeriod, PayrollRun, PayrollStatus, PayrollEmployeeRecord } from '../../types';
import { getErrorMessage } from '../../types';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS: Record<PayrollStatus, string> = {
  draft:        'bg-slate-100 text-slate-600',
  calculated:   'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved:     'bg-green-100 text-green-700',
  processed:    'bg-teal-100 text-teal-700',
  paid:         'bg-emerald-100 text-emerald-700',
  closed:       'bg-slate-200 text-slate-500',
};

const periodSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  month: z.coerce.number().min(1).max(12),
  name: z.string().min(1, 'Name is required'),
});
type PeriodForm = z.infer<typeof periodSchema>;

const runSchema = z.object({
  period_id: z.coerce.number().min(1, 'Select a period'),
  description: z.string().optional(),
});
type RunForm = z.infer<typeof runSchema>;

const calcSchema = z.object({
  working_days: z.coerce.number().min(1).max(31),
});
type CalcForm = z.infer<typeof calcSchema>;

type Tab = 'periods' | 'runs';

export function PayrollPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('periods');
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [showCalculate, setShowCalculate] = useState(false);
  const [actionRun, setActionRun] = useState<PayrollRun | null>(null);
  const [viewRecordsRunId, setViewRecordsRunId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data: periods = [], isLoading: periodsLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ['payroll-periods'],
    queryFn: () => payrollApi.listPeriods().then((r: { data: PayrollPeriod[] }) => r.data),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs'],
    queryFn: () => payrollApi.listRuns().then((r: { data: PayrollRun[] }) => r.data),
  });

  const { data: records = [] } = useQuery<PayrollEmployeeRecord[]>({
    queryKey: ['payroll-records', viewRecordsRunId],
    queryFn: () => payrollApi.listRecords(viewRecordsRunId!).then((r: { data: PayrollEmployeeRecord[] }) => r.data),
    enabled: viewRecordsRunId != null,
  });

  const periodForm = useForm<PeriodForm>({
    resolver: zodResolver(periodSchema) as any,
    defaultValues: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, name: '' },
  });

  const runForm = useForm<RunForm>({ resolver: zodResolver(runSchema) as any });

  const calcForm = useForm<CalcForm>({
    resolver: zodResolver(calcSchema) as any,
    defaultValues: { working_days: 26 },
  });

  // Auto-fill period name when year/month changes
  const watchYear = periodForm.watch('year');
  const watchMonth = periodForm.watch('month');
  const autoName = `${MONTH_NAMES[(watchMonth ?? 1) - 1]} ${watchYear}`;

  const createPeriodMutation = useMutation({
    mutationFn: (data: PeriodForm) => payrollApi.createPeriod(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }); setShowCreatePeriod(false); periodForm.reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const lockPeriodMutation = useMutation({
    mutationFn: (id: number) => payrollApi.lockPeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const createRunMutation = useMutation({
    mutationFn: (data: RunForm) => payrollApi.createRun(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setShowCreateRun(false); runForm.reset(); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const calculateMutation = useMutation({
    mutationFn: ({ runId, workingDays }: { runId: number; workingDays: number }) => payrollApi.calculatePayroll(runId, workingDays),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setShowCalculate(false); setActionRun(null); calcForm.reset({ working_days: 26 }); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const statusActionMutation = useMutation({
    mutationFn: ({ action, runId }: { action: string; runId: number }) => {
      switch (action) {
        case 'submit': return payrollApi.submitForReview(runId);
        case 'approve': return payrollApi.approveRun(runId);
        case 'payslips': return payrollApi.generatePayslips(runId);
        case 'paid': return payrollApi.markPaid(runId);
        default: throw new Error('Unknown action');
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setActionRun(null); setError(''); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const openCreatePeriod = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    periodForm.reset({ year, month, name: `${MONTH_NAMES[month - 1]} ${year}` });
    setShowCreatePeriod(true);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
        {tab === 'periods' ? (
          <button onClick={openCreatePeriod} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />Create Period
          </button>
        ) : (
          <button onClick={() => { setShowCreateRun(true); setError(''); }} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />Create Run
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {(['periods', 'runs'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'periods' ? 'Payroll Periods' : 'Payroll Runs'}
            </button>
          ))}
        </nav>
      </div>

      {/* PERIODS TAB */}
      {tab === 'periods' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {periodsLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
          ) : periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <FileText className="h-8 w-8 mb-2" /><p>No payroll periods created yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Year</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Month</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">End Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.year}</td>
                    <td className="px-4 py-3 text-slate-600">{MONTH_NAMES[p.month - 1]}</td>
                    <td className="px-4 py-3 text-slate-500">{p.start_date}</td>
                    <td className="px-4 py-3 text-slate-500">{p.end_date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.is_locked ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                        {p.is_locked ? 'Locked' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!p.is_locked && (
                        <button
                          onClick={() => lockPeriodMutation.mutate(p.id)}
                          disabled={lockPeriodMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-slate-400 disabled:opacity-50"
                          title="Lock Period"
                        >
                          <Lock className="h-3.5 w-3.5" />Lock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RUNS TAB */}
      {tab === 'runs' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {runsLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <CreditCard className="h-8 w-8 mb-2" /><p>No payroll runs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Employees</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{run.period_name ?? `Period #${run.period_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status]}`}>
                        {run.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{run.total_employees}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">₹{run.total_gross.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{run.total_deductions.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">₹{run.total_net.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(run.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {run.status === 'draft' && (
                          <button onClick={() => { setActionRun(run); setShowCalculate(true); setError(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Calculate">
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {run.status === 'calculated' && (
                          <button onClick={() => statusActionMutation.mutate({ action: 'submit', runId: run.id })} disabled={statusActionMutation.isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-600 hover:bg-yellow-50" title="Submit for Review">
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {run.status === 'under_review' && (
                          <button onClick={() => statusActionMutation.mutate({ action: 'approve', runId: run.id })} disabled={statusActionMutation.isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50" title="Approve">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {run.status === 'approved' && (
                          <button onClick={() => statusActionMutation.mutate({ action: 'payslips', runId: run.id })} disabled={statusActionMutation.isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50" title="Generate Payslips">
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {run.status === 'processed' && (
                          <button onClick={() => statusActionMutation.mutate({ action: 'paid', runId: run.id })} disabled={statusActionMutation.isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Mark Paid">
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => setViewRecordsRunId(run.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50" title="View Records">
                          <Eye className="h-4 w-4" />
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

      {/* CREATE PERIOD MODAL */}
      {showCreatePeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Payroll Period</h2>
              <button onClick={() => { setShowCreatePeriod(false); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={periodForm.handleSubmit((d) => createPeriodMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                  <input {...periodForm.register('year')} type="number" min="2000" max="2100" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month *</label>
                  <select {...periodForm.register('month')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period Name *</label>
                <input
                  {...periodForm.register('name')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={autoName}
                />
                <p className="text-xs text-slate-400 mt-1">Auto-suggested: {autoName}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreatePeriod(false); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={createPeriodMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {createPeriodMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RUN MODAL */}
      {showCreateRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Payroll Run</h2>
              <button onClick={() => { setShowCreateRun(false); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={runForm.handleSubmit((d) => createRunMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payroll Period *</label>
                <select {...runForm.register('period_id')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select period</option>
                  {periods.filter((p) => !p.is_locked).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {runForm.formState.errors.period_id && <p className="text-xs text-red-500 mt-1">{runForm.formState.errors.period_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...runForm.register('description')} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Optional notes about this run" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateRun(false); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={createRunMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {createRunMutation.isPending ? 'Creating...' : 'Create Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALCULATE MODAL */}
      {showCalculate && actionRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Calculate Payroll</h2>
              <button onClick={() => { setShowCalculate(false); setActionRun(null); setError(''); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Period: <strong>{actionRun.period_name}</strong></p>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={calcForm.handleSubmit((d) => calculateMutation.mutate({ runId: actionRun.id, workingDays: d.working_days }))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Working Days *</label>
                <input {...calcForm.register('working_days')} type="number" min="1" max="31" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {calcForm.formState.errors.working_days && <p className="text-xs text-red-500 mt-1">{calcForm.formState.errors.working_days.message}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowCalculate(false); setActionRun(null); setError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button type="submit" disabled={calculateMutation.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECORDS MODAL */}
      {viewRecordsRunId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Payroll Records — {runs.find((r) => r.id === viewRecordsRunId)?.period_name}</h2>
              <button onClick={() => setViewRecordsRunId(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="overflow-auto flex-1">
              {records.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-400">No records yet — run Calculate first</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Employee</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600">Days</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Gross</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Deductions</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{rec.employee_name ?? '—'}</div>
                          <div className="text-xs text-slate-400 font-mono">{rec.employee_code ?? ''}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{rec.days_present} / {rec.total_working_days}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">₹{rec.gross_salary.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">₹{rec.total_deductions.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">₹{rec.net_salary.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          {rec.payslip_id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500">{rec.payslip_number}</span>
                              <button
                                title="Download PDF"
                                onClick={async () => {
                                  try {
                                    const response = await payrollApi.downloadPayslip(rec.payslip_id!);
                                    const url = URL.createObjectURL(response.data as Blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `payslip_${rec.payslip_number}.pdf`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch { /* ignore */ }
                                }}
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
