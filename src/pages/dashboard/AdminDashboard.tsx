import { useQuery } from '@tanstack/react-query';
import { Users, Shield, Clock, Activity } from 'lucide-react';
import { usersApi, rolesApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils';
import type { AuditLog, PaginatedResponse, User } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-summary'],
    queryFn: async () => {
      const { data } = await usersApi.list({ per_page: 1 });
      return data as PaginatedResponse<User>;
    },
  });

  const { data: activeUsers } = useQuery({
    queryKey: ['users-active'],
    queryFn: async () => {
      const { data } = await usersApi.list({ per_page: 1, is_active: true });
      return data as PaginatedResponse<User>;
    },
  });

  const { data: blockedUsers } = useQuery({
    queryKey: ['users-blocked'],
    queryFn: async () => {
      const { data } = await usersApi.list({ per_page: 1, is_blocked: true });
      return data as PaginatedResponse<User>;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await rolesApi.list();
      return data as import('../../types').Role[];
    },
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs-recent'],
    queryFn: async () => {
      const { data } = await rolesApi.auditLogs({ per_page: 10 });
      return data as PaginatedResponse<AuditLog>;
    },
  });

  const stats = [
    {
      title: 'Total Users',
      value: loadingUsers ? '…' : (usersData?.total ?? 0),
      icon: Users,
      color: 'bg-primary-600',
      subtitle: 'All registered users',
    },
    {
      title: 'Active Users',
      value: activeUsers?.total ?? '…',
      icon: Activity,
      color: 'bg-emerald-500',
      subtitle: 'Currently active accounts',
    },
    {
      title: 'Blocked Users',
      value: blockedUsers?.total ?? '…',
      icon: Users,
      color: 'bg-red-500',
      subtitle: 'Suspended accounts',
    },
    {
      title: 'Roles',
      value: rolesData?.length ?? '…',
      icon: Shield,
      color: 'bg-violet-500',
      subtitle: 'System roles defined',
    },
  ];

  return (
    <div>
      <PageTitle
        title={`Welcome, ${user?.first_name}!`}
        subtitle="Here's an overview of the system."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Recent Audit Logs */}
      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Clock className="h-5 w-5 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
        </div>

        {!auditData ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : auditData.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No activity yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {auditData.items.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {log.action.replace(/\./g, ' › ')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {log.user_name ?? 'System'} • {log.ip_address ?? '—'}
                  </p>
                </div>
                <p className="text-xs text-slate-400 shrink-0">{formatDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
