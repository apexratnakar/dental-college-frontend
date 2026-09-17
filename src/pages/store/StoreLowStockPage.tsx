import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../services/api';
import type { StoreItem } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';

export function StoreLowStockPage() {
  const { data, isLoading } = useQuery<{ items: StoreItem[]; total: number }>({
    queryKey: ['store-low-stock'],
    queryFn: () => storeApi.getLowStockItems({ per_page: 200 }).then((r) => r.data),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <PageTitle title="Low Stock Alert" subtitle="Items at or below minimum stock level" />
        {items.length > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">{items.length} items</span>
        )}
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Package className="h-16 w-16 mb-4 text-green-300" />
          <p className="text-lg font-medium text-green-600">All stock levels are adequate</p>
          <p className="text-sm mt-1">No items are currently below minimum stock</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Min Stock</th>
                <th className="px-4 py-3 text-right">Shortage</th>
                <th className="px-4 py-3 text-right">Reorder Level</th>
                <th className="px-4 py-3 text-left">Last Price</th>
                <th className="px-4 py-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const shortage = item.minimum_stock - item.current_stock;
                const isCritical = item.current_stock === 0;
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 ${isCritical ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isCritical && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.code ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>{item.current_stock}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.minimum_stock}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-red-600">-{shortage.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-slate-600">{item.last_purchase_price ? `₹${item.last_purchase_price}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.shelf_location ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 flex gap-3">
          <Link to="/store/purchase-requests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Purchase Request
          </Link>
          <Link to="/store/items" className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">
            View All Items
          </Link>
        </div>
      )}
    </div>
  );
}
