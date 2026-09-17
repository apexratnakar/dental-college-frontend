import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Landmark } from 'lucide-react';
import { payrollApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { PayrollRun, PayrollEmployeeRecord } from '../../types';

export function BankTransferPage() {
  const [runId, setRunId] = useState<number | ''>('');

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // All runs (filter to processed/paid on frontend)
  const { data: runs = [] } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs-all'],
    queryFn: async () => {
      const { data } = await payrollApi.listRuns();
      return data as PayrollRun[];
    },
  });

  const eligibleRuns = runs.filter((r) =>
    ['processed', 'paid', 'closed'].includes(r.status),
  );

  const selectedRun = eligibleRuns.find((r) => r.id === runId) ?? null;

  const { data: records = [], isLoading } = useQuery<PayrollEmployeeRecord[]>({
    queryKey: ['payroll-records', runId],
    queryFn: async () => {
      const { data } = await payrollApi.listRecords(runId as number);
      return data as PayrollEmployeeRecord[];
    },
    enabled: !!runId,
  });

  const totalNet = records.reduce((s, r) => s + r.net_salary, 0);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media screen {
          #bank-transfer-printable {
            position: fixed;
            left: -9999px;
            top: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
        @media print {
          body * { visibility: hidden !important; }
          #bank-transfer-printable, #bank-transfer-printable * { visibility: visible !important; }
          #bank-transfer-printable {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100% !important;
            background: white !important;
            padding: 20px;
          }
        }
      `}</style>

      {/* Hidden print content */}
      {records.length > 0 && selectedRun && (
        <div id="bank-transfer-printable">
          <h1 style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
            BANK TRANSFER STATEMENT
          </h1>
          <p style={{ textAlign: 'center', fontSize: 11, marginBottom: 16 }}>
            Payroll Run #{selectedRun.id} &nbsp;·&nbsp; {selectedRun.period_name ?? '—'} &nbsp;·&nbsp;
            {records.length} employees &nbsp;·&nbsp; Total: ₹{fmt(totalNet)}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                {['S.No', 'Emp Code', 'Employee Name', 'Department', 'Bank Name', 'Account No.', 'IFSC Code', 'Branch', 'Net Amount (₹)', 'Remarks'].map((h) => (
                  <th key={h} style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: h === 'Net Amount (₹)' ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontFamily: 'monospace' }}>{r.employee_code ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontWeight: '600' }}>{r.employee_name ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.department ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.bank_name ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontFamily: 'monospace' }}>{r.bank_account_number ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontFamily: 'monospace' }}>{r.bank_ifsc ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.bank_branch ?? '—'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {fmt(r.net_salary)}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.remarks ?? ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={8} style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                  Total ({records.length} employees)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                  {fmt(totalNet)}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }} />
              </tr>
            </tfoot>
          </table>
          <p style={{ marginTop: 24, fontSize: 9, color: '#64748b' }}>
            Prepared by: _________________________ &nbsp;&nbsp;&nbsp; Authorised by: _________________________
          </p>
        </div>
      )}

      {/* ── Screen UI ──────────────────────────────────────────────────────────── */}
      <div>
        <PageTitle
          title="Bank Transfer Statement"
          subtitle="Printable bank transfer list for salary disbursement"
        />

        {/* Run selector */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={runId}
            onChange={(e) => setRunId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Payroll Run…</option>
            {eligibleRuns.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.id} — {r.period_name ?? '—'} ({r.status}) · {r.total_employees} employees
              </option>
            ))}
          </select>

          {records.length > 0 && (
            <button
              onClick={handlePrint}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Printer className="h-4 w-4" /> Print Statement
            </button>
          )}
        </div>

        {/* Summary bar */}
        {records.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3">
            <div>
              <p className="text-xs font-medium text-green-700">Total Employees</p>
              <p className="text-lg font-bold text-green-900">{records.length}</p>
            </div>
            <div className="border-l border-green-200 pl-4">
              <p className="text-xs font-medium text-green-700">Total Net Payable</p>
              <p className="text-lg font-bold text-green-900">₹{fmt(totalNet)}</p>
            </div>
            {selectedRun && (
              <div className="border-l border-green-200 pl-4">
                <p className="text-xs font-medium text-green-700">Period</p>
                <p className="text-lg font-bold text-green-900">{selectedRun.period_name ?? '—'}</p>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {!runId ? (
          <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
            <Landmark className="mb-2 h-8 w-8" />
            <p className="text-sm">Select a processed payroll run to view the bank transfer list.</p>
            {eligibleRuns.length === 0 && (
              <p className="mt-1 text-xs text-slate-300">No processed runs found. Approve and process a payroll run first.</p>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : records.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No employee records in this payroll run.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left">#</th>
                    <th className="px-3 py-3 text-left">Emp Code</th>
                    <th className="px-3 py-3 text-left">Employee Name</th>
                    <th className="px-3 py-3 text-left">Department</th>
                    <th className="px-3 py-3 text-left">Bank Name</th>
                    <th className="px-3 py-3 text-left">Account No.</th>
                    <th className="px-3 py-3 text-left">IFSC</th>
                    <th className="px-3 py-3 text-left">Branch</th>
                    <th className="px-3 py-3 text-right">Net (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.employee_code ?? '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{r.employee_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.department ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.bank_name ?? (
                        <span className="text-amber-500 text-xs">Not set</span>
                      )}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.bank_account_number ?? (
                        <span className="text-amber-500 text-xs">Not set</span>
                      )}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.bank_ifsc ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.bank_branch ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                        ₹{fmt(r.net_salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white">
                    <td colSpan={8} className="px-3 py-2.5 text-right font-semibold">
                      Total ({records.length} employees)
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      ₹{fmt(totalNet)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
