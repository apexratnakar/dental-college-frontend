import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  BookOpen, CheckCircle, AlertTriangle, Users,
  IndianRupee, BookCopy, BookMarked, LayoutGrid,
  ArrowRight,
} from 'lucide-react';
import { libraryApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { LibraryDashboardStats } from '../../types';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${color}-100 shrink-0`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { to: '/library/books',   label: 'Manage Books',     icon: BookOpen },
  { to: '/library/issues',  label: 'Issues & Returns', icon: BookMarked },
  { to: '/library/members', label: 'Members',          icon: Users },
  { to: '/library/fines',   label: 'Fine Rules',       icon: IndianRupee },
];

export function LibraryDashboardPage() {
  const { data, isLoading } = useQuery<LibraryDashboardStats>({
    queryKey: ['library-dashboard'],
    queryFn: async () => {
      const { data } = await libraryApi.getDashboard();
      return data as LibraryDashboardStats;
    },
    refetchInterval: 60_000,
  });

  return (
    <div>
      <PageTitle
        title="Library"
        subtitle="Overview of library operations"
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Books"      value={data?.total_books}      icon={BookOpen}       color="blue" />
            <StatCard label="Total Copies"     value={data?.total_copies}     icon={BookCopy}       color="indigo" />
            <StatCard label="Available"        value={data?.available_copies} icon={CheckCircle}    color="green" />
            <StatCard label="Currently Issued" value={data?.issued_books}     icon={BookMarked}     color="amber" />
            <StatCard label="Overdue"          value={data?.overdue_books}    icon={AlertTriangle}  color="red" />
            <StatCard label="Active Members"   value={data?.total_members}    icon={Users}          color="teal" />
            <StatCard
              label="Pending Fines (₹)"
              value={data?.pending_fines !== undefined ? data.pending_fines.toFixed(2) : undefined}
              icon={IndianRupee}
              color="orange"
            />
            <StatCard label="Dashboard" value="" icon={LayoutGrid} color="slate" />
          </div>

          {/* Today's activity */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Today's Issues</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{data?.today_issues ?? '—'}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Today's Returns</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{data?.today_returns ?? '—'}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 card p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-600">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
