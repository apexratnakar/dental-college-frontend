import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { rolesApi, usersApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface PaginatedResponse {
  items: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

interface SimpleUser {
  id: number;
  full_name: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RESOURCE_OPTIONS = [
  'user', 'role', 'permission', 'employee', 'department', 'designation',
  'leave_type', 'leave_application', 'leave_balance', 'loan', 'advance',
  'resignation', 'settlement', 'payroll_run', 'payslip', 'salary_component',
  'salary_structure', 'fee', 'student', 'admission',
];

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('creat') || a.includes('add') || a.includes('register')) return 'bg-green-100 text-green-800';
  if (a.includes('delet') || a.includes('remov')) return 'bg-red-100 text-red-800';
  if (a.includes('updat') || a.includes('edit') || a.includes('chang')) return 'bg-blue-100 text-blue-700';
  if (a.includes('approv') || a.includes('accept')) return 'bg-emerald-100 text-emerald-700';
  if (a.includes('reject') || a.includes('block') || a.includes('suspend')) return 'bg-red-100 text-red-700';
  if (a.includes('login') || a.includes('logout') || a.includes('auth')) return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

// ── JSON Viewer ───────────────────────────────────────────────────────────────

function JsonBlock({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-xs text-slate-300 italic">—</p>
    </div>
  );
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{label}</p>
      <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-48 text-slate-700 border border-slate-200 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);

  // Filter state
  const [resource, setResource] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['audit-logs', page, perPage, resource, actionSearch, userId, dateFrom, dateTo],
    queryFn: () =>
      rolesApi.auditLogs({
        page,
        per_page: perPage,
        resource: resource || undefined,
        action: actionSearch || undefined,
        user_id: userId !== '' ? userId : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: usersData } = useQuery<{ items: SimpleUser[] }>({
    queryKey: ['users-dropdown'],
    queryFn: () => usersApi.list({ per_page: 500 }).then((r) => r.data),
  });
  const users = usersData?.items ?? [];

  const logs = data?.items ?? [];
  const totalPages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  const applyActionSearch = useCallback(() => {
    setActionSearch(actionInput);
    setPage(1);
  }, [actionInput]);

  const clearFilters = () => {
    setResource('');
    setActionSearch('');
    setActionInput('');
    setUserId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = resource || actionSearch || userId !== '' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <PageTitle title="Audit Logs" subtitle="Track all system actions and changes" />

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Action search */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search action..."
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyActionSearch()}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Resource type */}
          <select
            value={resource}
            onChange={(e) => { setResource(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Resources</option>
            {RESOURCE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </select>

          {/* User filter */}
          <select
            value={userId}
            onChange={(e) => { setUserId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="From date"
          />

          {/* Date To */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              title="To date"
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-slate-300 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm text-slate-500">
            {isLoading ? 'Loading...' : `${total.toLocaleString()} log${total !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading audit logs...</p>
        ) : !logs.length ? (
          <p className="p-8 text-center text-slate-400">No audit logs found{hasFilters ? ' for the selected filters' : ''}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Resource</th>
                  <th className="px-4 py-3 text-left">Resource ID</th>
                  <th className="px-4 py-3 text-left">IP Address</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user_name ? (
                        <span className="font-medium text-slate-700">{log.user_name}</span>
                      ) : (
                        <span className="text-slate-300 italic text-xs">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {log.resource?.replace('_', ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {log.resource_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {log.ip_address ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(log.old_values || log.new_values) ? (
                        <button
                          onClick={() => setDetailLog(log)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                          title="View changes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                // Show pages around current
                const half = 3;
                let start = Math.max(1, page - half);
                const end = Math.min(totalPages, start + 6);
                start = Math.max(1, end - 6);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${page === p ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Change Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${actionColor(detailLog.action)}`}>
                    {detailLog.action}
                  </span>
                  {detailLog.resource && <span className="capitalize">{detailLog.resource.replace('_', ' ')}</span>}
                  {detailLog.resource_id && <span className="text-slate-300 mx-1">·</span>}
                  {detailLog.resource_id && <span className="font-mono">#{detailLog.resource_id}</span>}
                </p>
              </div>
              <button onClick={() => setDetailLog(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-1 text-sm border-b border-slate-100">
              <div className="flex gap-4 text-slate-500">
                <span><span className="font-medium text-slate-600">By:</span> {detailLog.user_name ?? 'System'}</span>
                <span><span className="font-medium text-slate-600">At:</span> {formatDateTime(detailLog.created_at)}</span>
                {detailLog.ip_address && <span><span className="font-medium text-slate-600">IP:</span> {detailLog.ip_address}</span>}
              </div>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <JsonBlock label="Before (old values)" data={detailLog.old_values} />
              <JsonBlock label="After (new values)" data={detailLog.new_values} />
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-100">
              <button onClick={() => setDetailLog(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
