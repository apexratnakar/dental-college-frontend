import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { canAccess, type Access } from '../../app/access';
import { Spinner } from './Spinner';

/** Renders the page only if the logged-in user may open it (same rules as the sidebar). */
export function RequireAccess({ access, children }: { access?: Access; children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canAccess(user, access)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <ShieldOff className="h-7 w-7 text-slate-400" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">You don't have access to this page</h1>
        <p className="max-w-sm text-sm text-slate-500">
          Your role doesn't include this module. If you need it, ask an administrator to update your role.
        </p>
        <Link to="/dashboard" className="btn-primary mt-2">Go to dashboard</Link>
      </div>
    );
  }

  return <>{children}</>;
}
