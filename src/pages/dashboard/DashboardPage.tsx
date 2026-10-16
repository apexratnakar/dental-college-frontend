import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';
import { AdminDashboard } from './AdminDashboard';
import { StaffDashboard } from './StaffDashboard';
import { StudentDashboard } from './StudentDashboard';

/** Picks the dashboard for the logged-in user's role. */
export function DashboardPage() {
  const { user, isStudent, can } = useAuth();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (isStudent) return <StudentDashboard />;
  // The admin dashboard shows user, role and audit-log stats — only useful with all three.
  if (can('users:read') && can('roles:read') && can('audit_logs:read')) return <AdminDashboard />;
  return <StaffDashboard />;
}
