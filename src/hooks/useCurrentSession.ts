import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '../services/api';
import type { AcademicSession } from '../types';

/**
 * The academic session marked current. Works for every role (the endpoint
 * only needs a login). Session pickers and create forms default to it.
 */
export function useCurrentSession(): AcademicSession | null {
  const { data } = useQuery<AcademicSession | null>({
    queryKey: ['sessions', 'current'],
    queryFn: () => sessionsApi.getCurrent().then((r) => r.data ?? null),
    staleTime: 5 * 60_000,
  });
  return data ?? null;
}

/**
 * For react-hook-form create forms: fill an empty session field with the
 * current session once it has loaded. Never overwrites a value already set
 * (e.g. when editing an existing record).
 */
export function usePrefillCurrentSession(
  isEmpty: () => boolean,
  apply: (sessionId: number) => void,
  enabled = true,
): void {
  const current = useCurrentSession();
  useEffect(() => {
    if (enabled && current && isEmpty()) apply(current.id);
    // isEmpty/apply are inline closures; re-run only when the session or mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, enabled]);
}
