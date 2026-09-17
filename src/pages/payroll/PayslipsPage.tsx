import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText, Download, Eye, X, Printer, CreditCard, IndianRupee,
} from 'lucide-react';
import { payrollApi, settingsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { PayslipDetail, PayslipListItem, PayrollPeriod, PaymentMode, OrganizationSettings } from '../../types';

// ── Number to words (Indian) ─────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function _convert(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + _convert(n % 100) : '');
  if (n < 100000) return _convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + _convert(n % 1000) : '');
  if (n < 10000000) return _convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + _convert(n % 100000) : '');
  return _convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + _convert(n % 10000000) : '');
}

function numToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = (_convert(rupees) || 'Zero') + ' Rupees';
  if (paise) result += ' and ' + _convert(paise) + ' Paise';
  return result + ' Only';
}

// ── Payslip view (print target) ───────────────────────────────────────────────

function PayslipView({ slip, orgSettings, forPrint = false }: { slip: PayslipDetail; orgSettings?: OrganizationSettings; forPrint?: boolean }) {
  const rec = slip.record;
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div
      id={forPrint ? 'payslip-printable' : undefined}
      className="mx-auto bg-white p-8 text-slate-800"
      style={{ width: 680, fontFamily: 'Arial, sans-serif', fontSize: 12 }}
    >
      {/* Header */}
      <div className="mb-4 border-b-2 border-slate-800 pb-3 text-center">
        {orgSettings?.logo_data && (
          <img
            src={orgSettings.logo_data}
            alt="logo"
            style={{ height: 56, margin: '0 auto 6px', display: 'block', objectFit: 'contain' }}
          />
        )}
        <h1 className="text-xl font-bold uppercase">
          {orgSettings?.org_name ?? 'Pay Slip'}
        </h1>
        {orgSettings?.tagline && (
          <p className="text-xs text-slate-500">{orgSettings.tagline}</p>
        )}
        {orgSettings?.phone_no && (
          <p className="text-xs text-slate-500">Phone: {orgSettings.phone_no}</p>
        )}
        {orgSettings?.website && (
          <p className="text-xs text-slate-500">{orgSettings.website}</p>
        )}
        <h2 className="mt-2 text-base font-semibold">Pay Slip</h2>
        <p className="text-sm text-slate-500">Pay Period: {slip.period_name ?? '—'}</p>
      </div>

      {/* Employee info */}
      <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
        {[
          ['Employee Code', rec.employee_code ?? '—'],
          ['Name', slip.employee_name ?? '—'],
          ['Department', slip.department ?? '—'],
          ['Designation', slip.designation ?? '—'],
          ['Days Present', String(rec.days_present)],
          ['Days Absent', String(rec.days_absent)],
          ['Bank A/C', rec.bank_account_number ?? '—'],
          ['Payslip No.', slip.payslip_number],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="w-28 shrink-0 font-medium text-slate-600">{label}</span>
            <span>: {value}</span>
          </div>
        ))}
      </div>

      {/* Earnings / Deductions table */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        {/* Earnings */}
        <div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Earnings</th>
                <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rec.earnings.map((e) => (
                <tr key={e.component_id}>
                  <td className="border border-slate-200 px-2 py-1">{e.component_name}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(e.amount)}</td>
                </tr>
              ))}
              {rec.bonus > 0 && (
                <tr>
                  <td className="border border-slate-200 px-2 py-1">Bonus</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(rec.bonus)}</td>
                </tr>
              )}
              {rec.arrears > 0 && (
                <tr>
                  <td className="border border-slate-200 px-2 py-1">Arrears</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(rec.arrears)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td className="border border-slate-300 px-2 py-1">Gross Salary</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{fmt(rec.gross_salary)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Deductions</th>
                <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rec.deductions.map((d) => (
                <tr key={d.component_id}>
                  <td className="border border-slate-200 px-2 py-1">{d.component_name}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(d.amount)}</td>
                </tr>
              ))}
              {rec.loan_deduction > 0 && (
                <tr>
                  <td className="border border-slate-200 px-2 py-1">Loan Deduction</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(rec.loan_deduction)}</td>
                </tr>
              )}
              {rec.advance_deduction > 0 && (
                <tr>
                  <td className="border border-slate-200 px-2 py-1">Advance Recovery</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{fmt(rec.advance_deduction)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td className="border border-slate-300 px-2 py-1">Total Deductions</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{fmt(rec.total_deductions)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net salary */}
      <div className="mb-4 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-4 py-3">
        <span className="text-sm font-bold text-blue-900">Net Salary Payable</span>
        <span className="text-lg font-bold text-blue-900">₹ {fmt(rec.net_salary)}</span>
      </div>
      <p className="mb-6 text-xs italic text-slate-500">
        Amount in Words: <strong>{numToWords(rec.net_salary)}</strong>
      </p>

      {/* Footer */}
      <div className="flex justify-between border-t border-slate-200 pt-3 text-xs text-slate-400">
        <span>Generated: {slip.generated_at}</span>
        <span>This is a computer-generated payslip. No signature required.</span>
      </div>
    </div>
  );
}

// ── Record payment form ───────────────────────────────────────────────────────

const paymentSchema = z.object({
  payment_date: z.string().min(1, 'Required'),
  payment_mode: z.enum(['bank_transfer', 'cash', 'cheque', 'neft', 'rtgs', 'upi']),
  amount: z.coerce.number().positive('Must be > 0'),
  transaction_reference: z.string().optional(),
  remarks: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

function RecordPaymentModal({
  slip,
  onClose,
}: {
  slip: PayslipListItem;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: 'bank_transfer',
      amount: slip.net_salary,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PaymentForm) =>
      payrollApi.recordPayment({ payslip_id: slip.id, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Record Payment</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Payslip: <span className="font-mono font-medium">{slip.payslip_number}</span> &nbsp;·&nbsp; {slip.employee_name}
        </p>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Payment Date</label>
            <input type="date" {...register('payment_date')} className="form-input w-full" />
            {errors.payment_date && <p className="mt-1 text-xs text-red-500">{errors.payment_date.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Payment Mode</label>
            <select {...register('payment_mode')} className="form-input w-full">
              {['bank_transfer', 'cash', 'cheque', 'neft', 'rtgs', 'upi'].map((m) => (
                <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Amount (₹)</label>
            <input type="number" step="0.01" {...register('amount')} className="form-input w-full" />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Transaction Reference</label>
            <input type="text" {...register('transaction_reference')} className="form-input w-full" placeholder="UTR/Ref No." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Remarks</label>
            <input type="text" {...register('remarks')} className="form-input w-full" />
          </div>
          {mutation.error && (
            <p className="text-xs text-red-500">Failed to record payment.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
              {mutation.isPending ? <Spinner size="sm" /> : <CreditCard className="h-4 w-4" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Payslip view drawer ───────────────────────────────────────────────────────

function PayslipDrawer({
  payslipId,
  onClose,
  orgSettings,
}: {
  payslipId: number;
  onClose: () => void;
  orgSettings?: OrganizationSettings;
}) {
  const { data: slip, isLoading } = useQuery<PayslipDetail>({
    queryKey: ['payslip-detail', payslipId],
    queryFn: async () => {
      const { data } = await payrollApi.getPayslip(payslipId);
      return data as PayslipDetail;
    },
  });

  const handleDownload = async () => {
    try {
      const response = await payrollApi.downloadPayslip(payslipId);
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${slip?.payslip_number ?? payslipId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print-only visibility CSS */}
      <style>{`
        @media screen {
          #payslip-printable {
            position: fixed;
            left: -9999px;
            top: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
        @media print {
          body * { visibility: hidden !important; }
          #payslip-printable, #payslip-printable * { visibility: visible !important; }
          #payslip-printable {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Print-only hidden element (rendered off-screen) */}
      {slip && (
        <div style={{ position: 'fixed', left: -9999, top: 0, visibility: 'hidden' }}>
          <PayslipView slip={slip} orgSettings={orgSettings} forPrint={true} />
        </div>
      )}

      {/* Drawer overlay */}
      <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
        <div
          className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Pay Slip</h2>
              {slip && (
                <p className="text-xs text-slate-400">{slip.payslip_number} · {slip.period_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button onClick={onClose} className="ml-2">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : slip ? (
              <PayslipView slip={slip} orgSettings={orgSettings} />
            ) : (
              <p className="text-center text-sm text-slate-400">Payslip not found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PayslipsPage() {
  const [periodId, setPeriodId] = useState<number | ''>('');
  const [empSearch, setEmpSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [paymentSlip, setPaymentSlip] = useState<PayslipListItem | null>(null);

  const { data: orgSettings } = useQuery<OrganizationSettings>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const { data } = await settingsApi.getOrgSettings();
      return data as OrganizationSettings;
    },
  });

  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data } = await payrollApi.listPeriods();
      return data as PayrollPeriod[];
    },
  });

  const { data: payslips = [], isLoading } = useQuery<PayslipListItem[]>({
    queryKey: ['payslips', { periodId, empSearch }],
    queryFn: async () => {
      const params: Record<string, unknown> = { per_page: 100 };
      if (periodId) params.period_id = periodId;
      const { data } = await payrollApi.listPayslips(params);
      return (data as { items: PayslipListItem[] }).items ?? (data as PayslipListItem[]);
    },
  });

  const filtered = empSearch
    ? payslips.filter(
        (s) =>
          s.employee_name?.toLowerCase().includes(empSearch.toLowerCase()) ||
          s.employee_code?.toLowerCase().includes(empSearch.toLowerCase()),
      )
    : payslips;

  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const handleDownload = async (slip: PayslipListItem) => {
    try {
      const response = await payrollApi.downloadPayslip(slip.id);
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${slip.payslip_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {viewId !== null && (
        <PayslipDrawer payslipId={viewId} onClose={() => setViewId(null)} orgSettings={orgSettings} />
      )}
      {paymentSlip && (
        <RecordPaymentModal slip={paymentSlip} onClose={() => setPaymentSlip(null)} />
      )}

      <div>
        <PageTitle
          title="Pay Slips"
          subtitle="View, download, and record payments for generated pay slips"
        />

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            placeholder="Search employee name or code…"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ minWidth: 220 }}
          />

          <span className="ml-auto text-xs text-slate-400">
            {filtered.length} payslip{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="mb-2 h-8 w-8" />
              <p className="text-sm">No payslips found. Generate payslips from a payroll run first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Payslip No.</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{slip.payslip_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{slip.employee_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{slip.employee_code} · {slip.department ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{slip.period_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{fmt(slip.gross_salary)}</td>
                      <td className="px-4 py-3 text-right text-red-600">₹{fmt(slip.total_deductions)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{fmt(slip.net_salary)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            slip.is_paid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {slip.is_paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewId(slip.id)}
                            title="View payslip"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(slip)}
                            title="Download PDF"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {!slip.is_paid && (
                            <button
                              onClick={() => setPaymentSlip(slip)}
                              title="Record payment"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-green-600"
                            >
                              <IndianRupee className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
