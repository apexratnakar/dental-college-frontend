import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Check, X, Search, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { rolesApi } from '../../services/api';
import type { Role, Permission } from '../../types';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});
}

const MODULE_LABELS: Record<string, string> = {
  auth: 'Authentication',
  users: 'Users',
  roles: 'Roles',
  permissions: 'Permissions',
  audit_logs: 'Audit Logs',
  sessions: 'Academic Sessions',
  courses: 'Courses',
  sections: 'Sections',
  subjects: 'Subjects',
  curriculum: 'Curriculum',
  admissions: 'Admissions',
  counselling: 'Counselling',
  students: 'Students',
  attendance: 'Attendance',
  assignments: 'Assignments',
  leaves: 'Leaves',
  feedback: 'Feedback',
  queries: 'Queries',
  faculty: 'Faculty',
  lectures: 'Lectures',
  materials: 'Materials',
  hostel: 'Hostel',
  library: 'Library',
  exams: 'Examinations',
  schedule: 'Timetable',
  fee: 'Fee Management',
  employees: 'Employee Management',
  payroll: 'Payroll',
  notifications: 'Notifications',
  reports: 'Reports',
};

function moduleLabel(m: string) {
  return MODULE_LABELS[m] ?? m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── sub-components ──────────────────────────────────────────────────────── */

function PermissionCard({ p, granted }: { p: Permission; granted: boolean }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
        granted
          ? 'border-green-200 bg-green-50'
          : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <div
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
          granted ? 'bg-green-500' : 'bg-slate-200'
        }`}
      >
        {granted ? (
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        ) : (
          <X className="h-2.5 w-2.5 text-slate-400" strokeWidth={3} />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium leading-snug ${granted ? 'text-slate-800' : 'text-slate-400'}`}>
          {p.description || p.name}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-400">{p.name}</p>
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */

export function RolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permSearch, setPermSearch] = useState('');

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r: { data: Role[] }) => r.data),
  });

  const {
    data: allPermissions = [],
    isLoading: permsLoading,
    isError: permsError,
    refetch: refetchPerms,
  } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.listPermissions().then((r: { data: Permission[] }) => r.data),
  });

  /* derive selected role */
  const displayRole: Role | null = useMemo(() => {
    if (roles.length === 0) return null;
    return roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  }, [roles, selectedRoleId]);

  /* granted permission names for selected role */
  const grantedNames = useMemo(
    () => new Set(displayRole?.permissions.map((p) => p.name) ?? []),
    [displayRole],
  );

  /* all permissions grouped by module */
  const allByModule = useMemo(() => groupByModule(allPermissions), [allPermissions]);

  /* filtered modules & permissions for search */
  const filteredByModule = useMemo(() => {
    const q = permSearch.toLowerCase().trim();
    if (!q) return allByModule;
    const result: Record<string, Permission[]> = {};
    for (const [mod, perms] of Object.entries(allByModule)) {
      const matched = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          mod.toLowerCase().includes(q),
      );
      if (matched.length > 0) result[mod] = matched;
    }
    return result;
  }, [allByModule, permSearch]);

  const isLoading = rolesLoading || permsLoading;
  const isError = rolesError || permsError;

  const handleRetry = () => {
    refetchRoles();
    refetchPerms();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {roles.length} roles · {allPermissions.length} permissions
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
            <p className="text-sm">Loading roles and permissions…</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div>
              <p className="font-medium text-slate-800">Failed to load roles and permissions</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Check that the server is running and you have the required permissions
                (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">roles:read</code>,{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">permissions:read</code>).
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Shield className="h-12 w-12 text-slate-300" />
            <div>
              <p className="font-medium text-slate-600">No roles found</p>
              <p className="mt-0.5 text-sm text-slate-400">
                Run the database seed script to populate default roles and permissions.
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">
                cd backend &amp;&amp; python scripts/seed.py
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-5 overflow-hidden">
          {/* ── Left: roles list ──────────────────────────────────────── */}
          <aside className="flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Roles</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {roles.map((role) => {
                const active = (displayRole?.id ?? -1) === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      active ? 'border-l-2 border-primary-600 bg-primary-50' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${active ? 'text-primary-700' : 'text-slate-800'}`}>
                        {role.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${active ? 'text-primary-500' : 'text-slate-300 group-hover:text-slate-400'}`}
                    />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Right: permission matrix ──────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            {!displayRole ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <Shield className="h-12 w-12" />
                <p>Select a role to view its permissions</p>
              </div>
            ) : (
              <>
                {/* Sticky header */}
                <div className="border-b border-slate-200 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{displayRole.name}</h2>
                      {displayRole.description && (
                        <p className="mt-0.5 text-sm text-slate-500">{displayRole.description}</p>
                      )}
                    </div>
                    {/* Grant summary */}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-green-700">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {grantedNames.size} granted
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-500">
                        <X className="h-3.5 w-3.5" />
                        {allPermissions.length - grantedNames.size} not granted
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${(grantedNames.size / Math.max(allPermissions.length, 1)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {Math.round((grantedNames.size / Math.max(allPermissions.length, 1)) * 100)}% coverage
                    </p>
                  </div>

                  {/* Permission search */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search permissions…"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Permission groups */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {Object.keys(filteredByModule).length === 0 ? (
                    <p className="text-center text-sm text-slate-400 pt-8">No permissions match your search.</p>
                  ) : (
                    Object.entries(filteredByModule).map(([mod, perms]) => {
                      const grantedInModule = perms.filter((p) => grantedNames.has(p.name)).length;
                      return (
                        <div key={mod}>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {moduleLabel(mod)}
                            </h3>
                            <span className="text-xs text-slate-400">
                              {grantedInModule}/{perms.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Sort: granted first */}
                            {[...perms]
                              .sort((a, b) => {
                                const ag = grantedNames.has(a.name) ? 0 : 1;
                                const bg = grantedNames.has(b.name) ? 0 : 1;
                                return ag - bg;
                              })
                              .map((p) => (
                                <PermissionCard key={p.id} p={p} granted={grantedNames.has(p.name)} />
                              ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
