import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, X } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { cn, formatDateShort } from '../../utils';
import { getErrorMessage } from '../../types';
import type { PayslipDetail, PayslipListItem } from '../../types';
import { MyPageState } from './MyPageState';
import { inr } from './format';

function PayslipModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: p, isLoading, error } = useQuery<PayslipDetail>({
    queryKey: ['me', 'payslip', id],
    queryFn: () => meApi.payslip(id).then((r) => r.data),
  });
  const rec = p?.record;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Payslip · {p?.period_name ?? ''}</h2>
            <p className="text-xs text-slate-500">{p?.payslip_number}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Close"><X className="h-4 w-4" /></button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : error || !p || !rec ? (
          <p className="p-6 text-sm text-red-700">{getErrorMessage(error)}</p>
        ) : (
          <div className="space-y-5 p-6 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ['Working days', rec.total_working_days],
                ['Days present', rec.days_present],
                ['Leave days', rec.days_leave],
                ['Bank account', rec.bank_account_number ? `•••• ${rec.bank_account_number.slice(-4)}` : '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Earnings', lines: rec.earnings, total: rec.gross_salary },
                { title: 'Deductions', lines: rec.deductions, total: rec.total_deductions },
              ].map((col) => (
                <div key={col.title}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{col.title}</p>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {col.lines.map((l) => (
                      <li key={l.component_id} className="flex justify-between gap-2 px-3 py-1.5">
                        <span className="text-slate-700">{l.component_name}</span>
                        <span className="tabular-nums text-slate-900">{inr(l.amount)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-2 bg-slate-50 px-3 py-1.5 font-semibold">
                      <span>Total</span><span className="tabular-nums">{inr(col.total)}</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3">
              <span className="font-medium text-slate-700">Net pay</span>
              <span className="text-xl font-bold tabular-nums text-slate-900">{inr(rec.net_salary)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MyPayslipsPage() {
  const [viewing, setViewing] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const { data: slips = [], isLoading, error } = useQuery<PayslipListItem[]>({
    queryKey: ['me', 'payslips'],
    queryFn: () => meApi.payslips().then((r) => r.data),
  });

  const download = async (s: PayslipListItem) => {
    setDownloading(s.id);
    setDownloadError('');
    try {
      const { data } = await meApi.payslipPdf(s.id);
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${s.payslip_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageTitle title="My Payslips" subtitle="Your monthly salary slips. Download a PDF for bank or visa paperwork." />
      {downloadError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p>}
      <MyPageState isLoading={isLoading} error={error} isEmpty={slips.length === 0} emptyText="No payslips yet. They appear here after each month's payroll is processed.">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {slips.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{s.period_name}</p>
                    <p className="text-xs text-slate-500">{s.payslip_number} · issued {formatDateShort(s.generated_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{inr(s.gross_salary)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{inr(s.total_deductions)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{inr(s.net_salary)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', s.is_paid ? 'badge-green' : 'badge-yellow')}>{s.is_paid ? 'Paid' : 'Processing'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setViewing(s.id)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => download(s)} disabled={downloading === s.id}>
                        <Download className="h-3.5 w-3.5" /> {downloading === s.id ? 'Preparing…' : 'PDF'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MyPageState>
      {viewing !== null && <PayslipModal id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
