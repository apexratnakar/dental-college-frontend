import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../../services/api';
import type { StockLedgerEntry, LedgerTxnType, StoreItem, StoreLocation } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';

const TXN_COLORS: Record<LedgerTxnType, string> = {
  opening: 'bg-slate-100 text-slate-600',
  purchase_receipt: 'bg-green-100 text-green-700',
  issue: 'bg-red-100 text-red-700',
  return: 'bg-amber-100 text-amber-700',
  transfer_in: 'bg-blue-100 text-blue-700',
  transfer_out: 'bg-orange-100 text-orange-700',
  adjustment_in: 'bg-teal-100 text-teal-700',
  adjustment_out: 'bg-purple-100 text-purple-700',
};

export function StoreLedgerPage() {
  const [itemId, setItemId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [txnType, setTxnType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ items: StockLedgerEntry[]; total: number; page: number; per_page: number }>({
    queryKey: ['store-ledger', itemId, storeId, txnType, dateFrom, dateTo, page],
    queryFn: () => storeApi.getLedger({
      item_id: itemId || undefined,
      store_id: storeId || undefined,
      txn_type: txnType || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page, per_page: 50,
    }).then((r) => r.data),
  });

  const { data: itemData } = useQuery<{ items: StoreItem[] }>({ queryKey: ['store-items'], queryFn: () => storeApi.listItems({ per_page: 500 }).then((r) => r.data) });
  const { data: storeData } = useQuery<{ items: StoreLocation[] }>({ queryKey: ['store-locations'], queryFn: () => storeApi.listStores({ per_page: 100 }).then((r) => r.data) });

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6">
      <PageTitle title="Stock Ledger" subtitle="Complete audit trail of all stock movements" />

      <div className="flex flex-wrap gap-3 mt-4 mb-4">
        <select value={itemId} onChange={(e) => { setItemId(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Items</option>
          {(itemData?.items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={storeId} onChange={(e) => { setStoreId(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Stores</option>
          {(storeData?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={txnType} onChange={(e) => { setTxnType(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          {(['opening','purchase_receipt','issue','return','transfer_in','transfer_out','adjustment_in','adjustment_out'] as LedgerTxnType[]).map(t => (
            <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {(itemId || storeId || txnType || dateFrom || dateTo) && (
          <button onClick={() => { setItemId(''); setStoreId(''); setTxnType(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200">Clear</button>
        )}
      </div>

      {isLoading ? <div className="text-slate-500">Loading...</div> : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Store</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">In</th>
                  <th className="px-4 py-3 text-right">Out</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{e.txn_date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.item?.name ?? `Item ${e.store_item_id}`}</td>
                    <td className="px-4 py-3 text-slate-600">{e.store?.name ?? `Store ${e.store_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TXN_COLORS[e.txn_type]}`}>{e.txn_type.replace(/_/g,' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{Number(e.quantity_in) > 0 ? `+${e.quantity_in}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{Number(e.quantity_out) > 0 ? `-${e.quantity_out}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{e.balance_quantity}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{e.reference_type ? `${e.reference_type} #${e.reference_id}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{e.remarks ?? '—'}</td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No ledger entries found</td></tr>}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
              <span>Showing {entries.length} of {total} entries</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
