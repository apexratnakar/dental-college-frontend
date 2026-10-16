import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { getErrorMessage } from '../../types';

/** Loading / error / empty wrapper shared by the My Portal pages. */
export function MyPageState({
  isLoading, error, isEmpty, emptyText, children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card flex items-start gap-3 p-5 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Couldn't load this page</p>
          <p className="mt-1 text-red-600">{getErrorMessage(error)}</p>
        </div>
      </div>
    );
  }
  if (isEmpty) {
    return <div className="card p-10 text-center text-sm text-slate-500">{emptyText}</div>;
  }
  return <>{children}</>;
}
