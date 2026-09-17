import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, TableProperties } from 'lucide-react';
import { payrollApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { PayrollPeriod, PayrollRun, PayrollEmployeeRecord } from '../../types';

// ── Main page ─────────────────────────────────────────────────────────────────

export function SalaryRegisterPage() {
  const [periodId, setPeriodId] = useState<number | ''>('');
  const [runId, setRunId] = useState<number | ''>('');

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // Fetch all periods
  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data } = await payrollApi.listPeriods();
      return data as PayrollPeriod[];
    },
  });

  // Fetch runs for selected period
  const { data: runs = [] } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs', periodId],
    queryFn: async () => {
      const { data } = await payrollApi.listRuns({ period_id: periodId });
      return data as PayrollRun[];
    },
    enabled: !!periodId,
  });

  // Auto-select first non-draft run when runs load
  const selectedRun = runs.find((r) => r.id === runId) ?? null;

  // Fetch employee records for selected run
  const { data: records = [], isLoading } = useQuery<PayrollEmployeeRecord[]>({
    queryKey: ['payroll-records', runId],
    queryFn: async () => {
      const { data } = await payrollApi.listRecords(runId as number);
      return data as PayrollEmployeeRecord[];
    },
    enabled: !!runId,
  });

  // ── Derive column sets from records ─────────────────────────────────────────
  const earningCols: string[] = [];
  const deductionCols: string[] = [];
  records.forEach((r) => {
    r.earnings.forEach((e) => {
      if (!earningCols.includes(e.component_name)) earningCols.push(e.component_name);
    });
    r.deductions.forEach((d) => {
      if (!deductionCols.includes(d.component_name)) deductionCols.push(d.component_name);
    });
  });

  // ── Group by department ──────────────────────────────────────────────────────
  const byDept: Record<string, PayrollEmployeeRecord[]> = {};
  records.forEach((r) => {
    const dept = r.department ?? 'Other';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(r);
  });

  const grandTotals = {
    gross: records.reduce((s, r) => s + r.gross_salary, 0),
    deductions: records.reduce((s, r) => s + r.total_deductions, 0),
    net: records.reduce((s, r) => s + r.net_salary, 0),
  };

  const getEarning = (r: PayrollEmployeeRecord, col: string) =>
    r.earnings.find((e) => e.component_name === col)?.amount ?? 0;
  const getDeduction = (r: PayrollEmployeeRecord, col: string) =>
    r.deductions.find((d) => d.component_name === col)?.amount ?? 0;

  const handlePrint = () => window.print();

  const periodObj = periods.find((p) => p.id === periodId) ?? null;

  return (
    <>
      {/* Print CSS — visibility approach */}
      <style>{`
        @media screen {
          #salary-register-printable {
            position: fixed;
            left: -9999px;
            top: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
        @media print {
          body * { visibility: hidden !important; }
          #salary-register-printable, #salary-register-printable * { visibility: visible !important; }
          #salary-register-printable {
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
      {records.length > 0 && (
        <div id="salary-register-printable">
          <h1 style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
            SALARY REGISTER
          </h1>
          <p style={{ textAlign: 'center', fontSize: 12, marginBottom: 16 }}>
            Period: {periodObj?.name ?? '—'} &nbsp;|&nbsp; Total Employees: {records.length}
          </p>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 9,
            }}
          >
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'left' }}>S.No</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'left' }}>Emp Code</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'left' }}>Dept</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>Days</th>
                {earningCols.map((c) => (
                  <th key={c} style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>{c}</th>
                ))}
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>Gross</th>
                {deductionCols.map((c) => (
                  <th key={c} style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>{c}</th>
                ))}
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>Total Ded.</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDept).map(([dept, deptRecords]) => {
                const deptGross = deptRecords.reduce((s, r) => s + r.gross_salary, 0);
                const deptDed = deptRecords.reduce((s, r) => s + r.total_deductions, 0);
                const deptNet = deptRecords.reduce((s, r) => s + r.net_salary, 0);
                return [
                  // Dept header row
                  <tr key={`dept-${dept}`} style={{ background: '#f8fafc' }}>
                    <td colSpan={5 + earningCols.length + deductionCols.length + 3}
                      style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 'bold', fontSize: 9 }}>
                      {dept}
                    </td>
                  </tr>,
                  // Employee rows
                  ...deptRecords.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontFamily: 'monospace' }}>{r.employee_code ?? '—'}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.employee_name ?? '—'}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px' }}>{r.department ?? '—'}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'center' }}>
                        {r.days_present}/{r.total_working_days}
                      </td>
                      {earningCols.map((c) => (
                        <td key={c} style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right' }}>
                          {fmt(getEarning(r, c))}
                        </td>
                      ))}
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right', fontWeight: '600' }}>
                        {fmt(r.gross_salary)}
                      </td>
                      {deductionCols.map((c) => (
                        <td key={c} style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right' }}>
                          {fmt(getDeduction(r, c))}
                        </td>
                      ))}
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right' }}>
                        {fmt(r.total_deductions)}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                        {fmt(r.net_salary)}
                      </td>
                    </tr>
                  )),
                  // Dept subtotal
                  <tr key={`subtotal-${dept}`} style={{ background: '#eff6ff', fontWeight: '600' }}>
                    <td colSpan={5 + earningCols.length + deductionCols.length}
                      style={{ border: '1px solid #cbd5e1', padding: '3px 6px', textAlign: 'right' }}>
                      Sub-total ({dept})
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', textAlign: 'right' }}>{fmt(deptDed)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(deptNet)}</td>
                  </tr>,
                ];
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={5 + earningCols.length + deductionCols.length}
                  style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                  Grand Total ({records.length} employees)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                  {fmt(grandTotals.deductions)}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                  {fmt(grandTotals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Screen UI ──────────────────────────────────────────────────────────── */}
      <div>
        <PageTitle
          title="Salary Register"
          subtitle="Month-wise salary register with component-level breakdown"
        />

        {/* Selectors */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={periodId}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : '';
              setPeriodId(val);
              setRunId('');
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Period…</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {runs.length > 0 && (
            <select
              value={runId}
              onChange={(e) => setRunId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Payroll Run…</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  Run #{r.id} — {r.status} ({r.total_employees} employees)
                </option>
              ))}
            </select>
          )}

          {records.length > 0 && (
            <button
              onClick={handlePrint}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Printer className="h-4 w-4" /> Print Register
            </button>
          )}
        </div>

        {/* Stat summary */}
        {records.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Employees', value: String(records.length) },
              { label: 'Total Gross', value: `₹${fmt(grandTotals.gross)}` },
              { label: 'Total Deductions', value: `₹${fmt(grandTotals.deductions)}` },
              { label: 'Total Net', value: `₹${fmt(grandTotals.net)}` },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!runId ? (
          <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
            <TableProperties className="mb-2 h-8 w-8" />
            <p className="text-sm">Select a period and payroll run to view the salary register.</p>
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
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="border border-slate-200 px-3 py-2 text-left">#</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Emp Code</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Name</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Dept</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Days P/W</th>
                    {earningCols.map((c) => (
                      <th key={c} className="border border-slate-200 px-3 py-2 text-right whitespace-nowrap">{c}</th>
                    ))}
                    <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Gross</th>
                    {deductionCols.map((c) => (
                      <th key={c} className="border border-slate-200 px-3 py-2 text-right whitespace-nowrap text-red-700">{c}</th>
                    ))}
                    <th className="border border-slate-200 px-3 py-2 text-right text-red-700">Total Ded.</th>
                    <th className="border border-slate-200 px-3 py-2 text-right font-bold text-green-700">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byDept).map(([dept, deptRecords]) => {
                    const deptGross = deptRecords.reduce((s, r) => s + r.gross_salary, 0);
                    const deptDed = deptRecords.reduce((s, r) => s + r.total_deductions, 0);
                    const deptNet = deptRecords.reduce((s, r) => s + r.net_salary, 0);
                    return [
                      <tr key={`dept-${dept}`} className="bg-slate-50">
                        <td
                          colSpan={5 + earningCols.length + deductionCols.length + 3}
                          className="border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          {dept}
                        </td>
                      </tr>,
                      ...deptRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-primary-50/30">
                          <td className="border border-slate-100 px-3 py-1.5 text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-100 px-3 py-1.5 font-mono text-slate-700">{r.employee_code ?? '—'}</td>
                          <td className="border border-slate-100 px-3 py-1.5 font-medium text-slate-800">{r.employee_name ?? '—'}</td>
                          <td className="border border-slate-100 px-3 py-1.5 text-slate-500">{r.department ?? '—'}</td>
                          <td className="border border-slate-100 px-3 py-1.5 text-center text-slate-600">
                            {r.days_present}/{r.total_working_days}
                          </td>
                          {earningCols.map((c) => (
                            <td key={c} className="border border-slate-100 px-3 py-1.5 text-right text-slate-700">
                              {fmt(getEarning(r, c))}
                            </td>
                          ))}
                          <td className="border border-slate-100 px-3 py-1.5 text-right font-semibold text-slate-800">
                            {fmt(r.gross_salary)}
                          </td>
                          {deductionCols.map((c) => (
                            <td key={c} className="border border-slate-100 px-3 py-1.5 text-right text-red-700">
                              {fmt(getDeduction(r, c))}
                            </td>
                          ))}
                          <td className="border border-slate-100 px-3 py-1.5 text-right text-red-700">
                            {fmt(r.total_deductions)}
                          </td>
                          <td className="border border-slate-100 px-3 py-1.5 text-right font-bold text-green-700">
                            {fmt(r.net_salary)}
                          </td>
                        </tr>
                      )),
                      <tr key={`sub-${dept}`} className="bg-blue-50 font-semibold">
                        <td
                          colSpan={5 + earningCols.length + deductionCols.length}
                          className="border border-slate-200 px-3 py-1.5 text-right text-xs text-slate-600"
                        >
                          Sub-total ({dept})
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right text-red-700">
                          {fmt(deptDed)}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-green-700">
                          {fmt(deptNet)}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white">
                    <td
                      colSpan={5 + earningCols.length + deductionCols.length}
                      className="border border-slate-700 px-3 py-2 text-right font-semibold"
                    >
                      Grand Total ({records.length} employees)
                    </td>
                    <td className="border border-slate-700 px-3 py-2 text-right font-semibold">
                      {fmt(grandTotals.deductions)}
                    </td>
                    <td className="border border-slate-700 px-3 py-2 text-right font-bold">
                      {fmt(grandTotals.net)}
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
