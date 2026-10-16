import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Receipt, Search, Plus, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Printer,
} from 'lucide-react';
import { feeApi, sessionsApi, studentsApi, settingsApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import type {
  FeePayment, FeeCategory, PaymentMethod,
  AcademicSession, Student, StudentFeeStatement, PaginatedResponse,
  OrganizationSettings,
} from '../../types';
import { usePrefillCurrentSession } from '../../hooks/useCurrentSession';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FeeCategory, string> = {
  tuition: 'Tuition', hostel: 'Hostel', library: 'Library',
  examination: 'Examination', transport: 'Transport', miscellaneous: 'Miscellaneous',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash', upi: 'UPI', online: 'Online', cheque: 'Cheque', neft: 'NEFT', dd: 'DD',
};

const METHOD_STYLES: Record<PaymentMethod, string> = {
  cash: 'bg-emerald-100 text-emerald-700',
  upi: 'bg-purple-100 text-purple-700',
  online: 'bg-blue-100 text-blue-700',
  cheque: 'bg-amber-100 text-amber-700',
  neft: 'bg-teal-100 text-teal-700',
  dd: 'bg-slate-100 text-slate-600',
};

// ── Record Payment Modal ───────────────────────────────────────────────────────

const paymentSchema = z.object({
  student_id: z.number().int().positive('Select a student'),
  academic_session_id: z.number().int().positive('Select a session'),
  fee_category: z.enum(['tuition', 'hostel', 'library', 'examination', 'transport', 'miscellaneous']),
  fee_structure_id: z.number().int().optional().nullable(),
  amount_paid: z.number().positive('Amount must be > 0'),
  payment_date: z.string().min(1, 'Required'),
  payment_method: z.enum(['cash', 'upi', 'online', 'cheque', 'neft', 'dd']),
  transaction_id: z.string().max(100).optional(),
  remarks: z.string().max(500).optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

function PaymentModal({
  onClose,
  onSuccess,
  prefilledStudentId,
  prefilledSessionId,
}: {
  onClose: () => void;
  onSuccess: (payment: FeePayment) => void;
  prefilledStudentId?: number;
  prefilledSessionId?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  const { data: sessions } = useQuery<AcademicSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: async () => {
      const { data } = await studentsApi.list({ per_page: 500, status: 'active' });
      return data as { items: Student[] };
    },
  });

  const { getValues, register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      student_id: prefilledStudentId ?? undefined,
      academic_session_id: prefilledSessionId ?? undefined,
      payment_date: new Date().toISOString().slice(0, 10),
      fee_category: 'tuition',
      payment_method: 'cash',
    },
  });

  // New records default to the current academic session
  usePrefillCurrentSession(
    () => !getValues('academic_session_id'),
    (id) => setValue('academic_session_id', id),
    !!sessions?.length,
  );
  const selectedSessionId = watch('academic_session_id');
  const selectedStudentId = watch('student_id');
  const selectedCategory = watch('fee_category');
  const selectedFeeStructureId = watch('fee_structure_id');

  // Load structures when session is selected
  const { data: structures } = useQuery({
    queryKey: ['fee-structures-for-payment', selectedStudentId, selectedSessionId],
    queryFn: async () => {
      const { data } = await feeApi.listStructures({
        academic_session_id: Number(selectedSessionId),
        is_active: true,
      });
      return data as import('../../types').FeeStructure[];
    },
    enabled: !!selectedSessionId,
  });

  // Fetch fee statement to track partial payments
  const { data: statement } = useQuery<StudentFeeStatement>({
    queryKey: ['fee-statement-modal', selectedStudentId, selectedSessionId],
    queryFn: async () => {
      const { data } = await feeApi.getStatement(
        Number(selectedStudentId),
        Number(selectedSessionId),
      );
      return data as StudentFeeStatement;
    },
    enabled: !!selectedStudentId && !!selectedSessionId
      && !isNaN(Number(selectedStudentId)) && !isNaN(Number(selectedSessionId))
      && Number(selectedStudentId) > 0 && Number(selectedSessionId) > 0,
  });

  // Find the balance line for the currently selected category / structure
  const balanceLine = (() => {
    if (!statement?.lines) return null;
    // Hostel-module charges are collected in Hostel → Fee Payments, never here
    const courseLines = statement.lines.filter((l) => l.source !== 'hostel');
    const fsId = selectedFeeStructureId ? Number(selectedFeeStructureId) : null;
    if (fsId) return courseLines.find((l) => l.fee_structure_id === fsId) ?? null;
    return courseLines.find((l) => l.fee_category === selectedCategory) ?? null;
  })();

  // Auto-fill remaining balance when category or structure changes
  useEffect(() => {
    if (balanceLine && balanceLine.balance > 0) {
      setValue('amount_paid', balanceLine.balance, { shouldValidate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedFeeStructureId, statement]);

  const onSubmit = async (values: PaymentForm) => {
    setError(null);
    try {
      const { data } = await feeApi.recordPayment({
        ...values,
        fee_structure_id: values.fee_structure_id || null,
        transaction_id: values.transaction_id || null,
        remarks: values.remarks || null,
      });
      onSuccess(data as FeePayment);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-900">Record Fee Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Student *</label>
              <select
                {...register('student_id', { valueAsNumber: true })}
                className="input w-full"
              >
                <option value="">Select student…</option>
                {studentsData?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.enrollment_number})
                  </option>
                ))}
              </select>
              {errors.student_id && <p className="form-error">{errors.student_id.message}</p>}
            </div>
            <div>
              <label className="form-label">Session *</label>
              <select
                {...register('academic_session_id', { valueAsNumber: true })}
                className="input w-full"
              >
                <option value="">Select session…</option>
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
                ))}
              </select>
              {errors.academic_session_id && <p className="form-error">{errors.academic_session_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fee Category *</label>
              <select {...register('fee_category')} className="input w-full">
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Fee Structure (optional)</label>
              <select
                {...register('fee_structure_id', {
                  setValueAs: (v) => (v === '' ? null : Number(v)),
                })}
                className="input w-full"
              >
                <option value="">None / Ad-hoc</option>
                {structures?.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {CATEGORY_LABELS[fs.fee_category]} — ₹{fs.amount.toLocaleString('en-IN')} (Yr {fs.year_of_study})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Partial payment summary — shown when student + session + a fee line exists */}
          {balanceLine && balanceLine.amount_due > 0 && (
            <div className={`rounded-lg border px-3 py-2.5 text-xs ${
              balanceLine.balance === 0
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-slate-600">
                    Due: <span className="font-semibold text-slate-800">
                      ₹{balanceLine.amount_due.toLocaleString('en-IN')}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    Paid: <span className="font-semibold text-emerald-700">
                      ₹{balanceLine.amount_paid.toLocaleString('en-IN')}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    Balance:{' '}
                    <span className={`font-semibold ${balanceLine.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      ₹{balanceLine.balance.toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
                {balanceLine.balance > 0 ? (
                  <button
                    type="button"
                    onClick={() => setValue('amount_paid', balanceLine.balance)}
                    className="shrink-0 font-medium text-primary-600 hover:underline"
                  >
                    Pay remaining
                  </button>
                ) : (
                  <span className="shrink-0 font-medium text-emerald-600">Fully paid ✓</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount Paid (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('amount_paid', { valueAsNumber: true })}
                className="input w-full"
                placeholder="0.00"
              />
              {errors.amount_paid && <p className="form-error">{errors.amount_paid.message}</p>}
            </div>
            <div>
              <label className="form-label">Payment Date *</label>
              <input type="date" {...register('payment_date')} className="input w-full" />
              {errors.payment_date && <p className="form-error">{errors.payment_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Payment Method *</label>
              <select {...register('payment_method')} className="input w-full">
                {Object.entries(METHOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Transaction ID</label>
              <input {...register('transaction_id')} className="input w-full" placeholder="Ref / Cheque no." />
            </div>
          </div>

          <div>
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} className="input w-full" rows={2} placeholder="Optional remarks…" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Receipt Modal ──────────────────────────────────────────────────────────────

function ReceiptModal({
  payment,
  onClose,
  orgSettings,
}: {
  payment: FeePayment;
  onClose: () => void;
  orgSettings?: OrganizationSettings;
}) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #fee-receipt-printable, #fee-receipt-printable * { visibility: visible !important; }
          #fee-receipt-printable {
            position: fixed !important;
            top: 0; left: 0;
            width: 100%;
            background: white !important;
            padding: 32px 40px;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">

          {/* Header (hidden on print) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold text-slate-900">Payment Recorded</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
          </div>

          {/* Printable receipt body */}
          <div id="fee-receipt-printable" className="p-6">
            <div className="text-center mb-4">
              {orgSettings?.logo_data && (
                <img
                  src={orgSettings.logo_data}
                  alt="logo"
                  style={{ height: 52, margin: '0 auto 6px', display: 'block', objectFit: 'contain' }}
                />
              )}
              {orgSettings?.org_name && (
                <p className="font-bold text-sm uppercase tracking-wide text-slate-900">
                  {orgSettings.org_name}
                </p>
              )}
              {orgSettings?.phone_no && (
                <p className="text-[10px] text-slate-500">{orgSettings.phone_no}</p>
              )}
              {orgSettings?.website && (
                <p className="text-[10px] text-slate-500">{orgSettings.website}</p>
              )}
              {orgSettings?.org_name && <hr className="my-2 border-slate-200" />}
              <h1 className="text-base font-bold uppercase tracking-wide text-slate-900">Fee Payment Receipt</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Official Receipt</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Receipt No.</p>
              <p className="font-mono font-bold text-slate-900 text-lg">{payment.receipt_number}</p>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Student</dt>
                <dd className="font-medium text-slate-900 text-right">{payment.student_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Enrollment No.</dt>
                <dd className="font-mono text-slate-700 text-right text-xs">{payment.enrollment_number ?? '—'}</dd>
              </div>
              {payment.session_name && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Session</dt>
                  <dd className="text-slate-700 text-right">{payment.session_name}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Fee Category</dt>
                <dd className="text-slate-700 text-right">{CATEGORY_LABELS[payment.fee_category]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Payment Date</dt>
                <dd className="text-slate-700 text-right">{payment.payment_date}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Payment Method</dt>
                <dd className="text-slate-700 text-right">{METHOD_LABELS[payment.payment_method]}</dd>
              </div>
              {payment.transaction_id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Ref / Txn ID</dt>
                  <dd className="font-mono text-slate-700 text-right text-xs">{payment.transaction_id}</dd>
                </div>
              )}
              {payment.remarks && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Remarks</dt>
                  <dd className="text-slate-600 text-right text-xs">{payment.remarks}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2 mt-1">
                <dt className="font-bold text-slate-900">Amount Paid</dt>
                <dd className="font-bold text-emerald-600 text-xl">
                  ₹{payment.amount_paid.toLocaleString('en-IN')}
                </dd>
              </div>
            </dl>

            {payment.collected_by_name && (
              <p className="mt-3 text-right text-[11px] text-slate-400">
                Collected by: {payment.collected_by_name}
              </p>
            )}

            <p className="mt-4 border-t border-dashed border-slate-200 pt-3 text-center text-[10px] text-slate-300">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>

          {/* Actions (hidden on print) */}
          <div className="flex gap-3 px-6 pb-6 print:hidden">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Statement Card ─────────────────────────────────────────────────────────────

function StatementCard({ stmt }: { stmt: StudentFeeStatement }) {
  const pct = stmt.total_due > 0
    ? Math.round((stmt.total_paid / stmt.total_due) * 100)
    : 100;
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="card mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{stmt.student_name}</h3>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{stmt.enrollment_number}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-slate-500">Total Due</p>
            <p className="font-bold text-slate-900">₹{stmt.total_due.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Paid</p>
            <p className="font-bold text-emerald-600">₹{stmt.total_paid.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Balance</p>
            <p className={`font-bold ${stmt.total_balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              ₹{stmt.total_balance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {stmt.total_due > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>Fee paid</span><span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              <th className="pb-2 text-left text-xs font-semibold text-slate-500">Category</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-500">Due</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-500">Paid</th>
              <th className="pb-2 text-right text-xs font-semibold text-slate-500">Balance</th>
              <th className="pb-2 text-center text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stmt.lines.map((line, i) => (
              <tr key={`${line.source ?? 'course'}-${line.fee_category}-${line.fee_structure_id ?? i}`}>
                <td className="py-2 text-slate-700">
                  {CATEGORY_LABELS[line.fee_category]}
                  {line.source === 'hostel' && (
                    <>
                      <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">Hostel module</span>
                      <p className="text-xs text-slate-500">{line.description}</p>
                      {line.receipt_no && <p className="text-[11px] text-slate-400">Receipt {line.receipt_no}</p>}
                    </>
                  )}
                </td>
                <td className="py-2 text-right text-slate-500">
                  {line.amount_due > 0 ? `₹${line.amount_due.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="py-2 text-right font-medium text-emerald-700">
                  ₹{line.amount_paid.toLocaleString('en-IN')}
                </td>
                <td className="py-2 text-right font-medium text-slate-900">
                  {line.balance > 0 ? `₹${line.balance.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="py-2 text-center">
                  {line.is_overdue ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle className="h-3 w-3" /> Overdue
                    </span>
                  ) : line.balance === 0 && line.amount_due > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Paid
                    </span>
                  ) : line.amount_paid > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <Clock className="h-3 w-3" /> Partial
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FeePaymentsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<FeePayment | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [filterSession, setFilterSession] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Statement fetch
  const [stmtStudentId, setStmtStudentId] = useState<number | null>(null);
  const [stmtSessionId, setStmtSessionId] = useState<number | null>(null);

  const { data: orgSettings } = useQuery<OrganizationSettings>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const { data } = await settingsApi.getOrgSettings();
      return data as OrganizationSettings;
    },
  });

  const { data: sessions } = useQuery<AcademicSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: async () => {
      const { data } = await studentsApi.list({
        per_page: 50,
        search: studentSearch || undefined,
        status: 'active',
      });
      return data as { items: Student[] };
    },
    enabled: studentSearch.length > 1,
  });

  const paymentsParams = {
    page,
    per_page: 20,
    ...(filterSession ? { academic_session_id: Number(filterSession) } : {}),
    ...(selectedStudentId ? { student_id: selectedStudentId } : {}),
  };

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['fee-payments', paymentsParams],
    queryFn: async () => {
      const { data } = await feeApi.listPayments(paymentsParams);
      return data as PaginatedResponse<FeePayment>;
    },
  });

  const { data: statement } = useQuery<StudentFeeStatement>({
    queryKey: ['fee-statement', stmtStudentId, stmtSessionId],
    queryFn: async () => {
      const { data } = await feeApi.getStatement(stmtStudentId!, stmtSessionId!);
      return data as StudentFeeStatement;
    },
    enabled: !!stmtStudentId && !!stmtSessionId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fee-payments'] });
    qc.invalidateQueries({ queryKey: ['fee-statement'] });
  };

  const handlePaymentSuccess = (payment: FeePayment) => {
    setModal(false);
    setReceiptPayment(payment);
  };

  const closeReceipt = () => {
    invalidate();
    setReceiptPayment(null);
  };

  const handleViewStatement = () => {
    if (selectedStudentId && filterSession) {
      setStmtStudentId(selectedStudentId);
      setStmtSessionId(Number(filterSession));
    }
  };

  const totalPages = Math.ceil((paymentsData?.total ?? 0) / 20);

  return (
    <div>
      <PageTitle
        title="Fee Payments"
        subtitle="Record and track student fee payments"
        action={
          <button
            onClick={() => setModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        }
      />

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="form-label">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSelectedStudentId(null);
                setStmtStudentId(null);
              }}
              className="input w-full pl-9"
              placeholder="Name or enrolment…"
            />
          </div>
          {studentSearch.length > 1 && studentsData?.items.length ? (
            <div className="absolute z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {studentsData.items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setStudentSearch(`${s.full_name} (${s.enrollment_number})`);
                  }}
                  className="flex w-full flex-col px-4 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium">{s.full_name}</span>
                  <span className="text-xs font-mono text-slate-400">{s.enrollment_number}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-[160px]">
          <label className="form-label">Session</label>
          <select
            value={filterSession}
            onChange={(e) => { setFilterSession(e.target.value); setPage(1); }}
            className="input w-full"
          >
            <option value="">All Sessions</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
            ))}
          </select>
        </div>

        {selectedStudentId && filterSession && (
          <button
            onClick={handleViewStatement}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <TrendingUp className="h-4 w-4" /> Fee Statement
          </button>
        )}
      </div>

      {/* Statement card */}
      {statement && <StatementCard stmt={statement} />}

      {/* Payments table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !paymentsData?.items.length ? (
        <div className="card py-14 text-center">
          <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No payments found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Receipt</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden lg:table-cell">Collected By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paymentsData.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {p.receipt_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.student_name ?? '—'}</p>
                    <p className="text-xs font-mono text-slate-400">{p.enrollment_number}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-600">{CATEGORY_LABELS[p.fee_category]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    ₹{p.amount_paid.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${METHOD_STYLES[p.payment_method]}`}>
                      {METHOD_LABELS[p.payment_method]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.payment_date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                    {p.collected_by_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setReceiptPayment(p)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Print receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{paymentsData.total} payments</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border p-1 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border p-1 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <PaymentModal
          onClose={() => setModal(false)}
          onSuccess={handlePaymentSuccess}
          prefilledStudentId={selectedStudentId ?? undefined}
          prefilledSessionId={filterSession ? Number(filterSession) : undefined}
        />
      )}

      {receiptPayment && (
        <ReceiptModal payment={receiptPayment} onClose={closeReceipt} orgSettings={orgSettings} />
      )}
    </div>
  );
}
