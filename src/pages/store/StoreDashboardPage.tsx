import { useQuery } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  PackageCheck,
  PackageOpen,
  MonitorCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../services/api';
import type { StoreDashboard } from '../../types';
import { PageTitle } from '../../components/common/PageTitle';

export function StoreDashboardPage() {
  const { data: stats, isLoading } = useQuery<StoreDashboard>({
    queryKey: ['store-dashboard'],
    queryFn: () => storeApi.getDashboard().then((r) => r.data),
  });

  const cards = [
    {
      label: 'Total Items',
      value: stats?.total_items ?? 0,
      icon: Package,
      to: '/store/items',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Low Stock',
      value: stats?.low_stock_items ?? 0,
      icon: AlertTriangle,
      to: '/store/low-stock',
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Pending PRs',
      value: stats?.pending_purchase_requests ?? 0,
      icon: ClipboardList,
      to: '/store/purchase-requests',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Pending POs',
      value: stats?.pending_purchase_orders ?? 0,
      icon: ShoppingCart,
      to: '/store/purchase-orders',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Pending Receipts',
      value: stats?.pending_receipts ?? 0,
      icon: PackageCheck,
      to: '/store/receipts',
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Pending Issues',
      value: stats?.pending_issues ?? 0,
      icon: PackageOpen,
      to: '/store/issues',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Total Assets',
      value: stats?.total_assets ?? 0,
      icon: MonitorCheck,
      to: '/store/assets',
      color: 'text-slate-600 bg-slate-50',
    },
    {
      label: 'Active Assets',
      value: stats?.active_assets ?? 0,
      icon: MonitorCheck,
      to: '/store/assets',
      color: 'text-teal-600 bg-teal-50',
    },
  ];

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-6">
      <PageTitle
        title="Store Dashboard"
        subtitle="Overview of store operations"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex rounded-lg p-2 mb-3 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-sm text-slate-500 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
