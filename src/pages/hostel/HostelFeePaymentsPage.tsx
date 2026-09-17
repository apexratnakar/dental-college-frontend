import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import type { Hostel, HostelFeePayment, FeePaymentStatus, PaginatedResponse } from '../../types';

const FEE_STATUS_STYLES: Record<FeePaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-slate-100 text-slate-600',
};

export function HostelFeePaymentsPage() {
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: hostels } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => { const { data } = await hostelApi.listHostels(); return data as Hostel[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-fee-payments-global', hostelId, statusFilter, page],
    queryFn: async () => {
      const { data } = await hostelApi.listFeePayments({
        hostel_id: hostelId || undefined,
        status: statusFilter || undefined,
        page, per_page: 20,
      });
      return data as PaginatedResponse<HostelFeePayment>;
    },
  });

  const totalPaid = data?.items
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return (
    <div>
      <PageTitle
        title="Hostel Fee Payments"
        subtitle="Fee payment records across all hostels"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={hostelId}
          onChange={(e) => { setHostelId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          className="input text-sm"
        >
          <option value="">All Hostels</option>
          {hostels?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="waived">Waived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-16 text-center">
          <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No fee payment records found.</p>
        </div>
      ) : (
        <>
          {totalPaid > 0 && (
            <div className="card p-4 mb-4 flex items-center gap-3 bg-emerald-50 border-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Showing page total (paid): ₹{totalPaid.toLocaleString()}
              </span>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Hostel</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Fee Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Mode</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.student_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{p.enrollment_number}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.hostel_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.fee_type_name ?? p.description ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">₹{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FEE_STATUS_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{p.payment_mode ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.paid_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.total > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                <span>{data.total} records</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                  <span>Page {page}</span>
                  <button onClick={() => setPage((p) => p + 1)} disabled={data.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
