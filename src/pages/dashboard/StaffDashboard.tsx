import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavGroups } from '../../app/navigation';
import { AttendanceTodayCard } from '../my/AttendanceTodayCard';

/** Dashboard for staff roles: quick links to exactly the modules their role can open. */
export function StaffDashboard() {
  const { user } = useAuth();
  const groups = visibleNavGroups(user).filter((g) => g.heading !== 'General');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.first_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.roles.map((r) => r.name).join(', ') || 'no role'}. These are the modules your role can use.
        </p>
      </div>

      {user?.employee_id && <AttendanceTodayCard />}

      {groups.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Your role doesn't include any modules yet. Ask an administrator to assign the right role.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.heading}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.heading}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
