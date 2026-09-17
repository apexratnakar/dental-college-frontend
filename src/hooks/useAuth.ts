import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { setUser, logout as logoutAction } from '../app/store';
import type { RootState, AppDispatch } from '../app/store';
import { authApi, usersApi, tokenStorage } from '../services/api';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useSelector((s: RootState) => s.auth);

  // Fetch current user profile on mount if we have a token
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await usersApi.getMe();
      dispatch(setUser(data));
      return data;
    },
    enabled: isAuthenticated && !user,
    retry: false,
  });

  const login = async (identifier: string, password: string): Promise<void> => {
    const { data } = await authApi.login(identifier, password);
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    const meRes = await usersApi.getMe();
    dispatch(setUser(meRes.data));
    navigate('/dashboard');
  };

  const logoutUser = async () => {
    try {
      const refresh = tokenStorage.getRefresh();
      if (refresh) {
        await authApi.logout(refresh);
      }
    } catch {
      // ignore
    } finally {
      dispatch(logoutAction());
      navigate('/login');
    }
  };

  const hasRole = (roleName: string): boolean => {
    return user?.roles.some((r) => r.name === roleName) ?? false;
  };

  const hasAnyRole = (...roleNames: string[]): boolean => {
    return roleNames.some((r) => hasRole(r));
  };

  return { user, isAuthenticated, isLoading, login, logout: logoutUser, hasRole, hasAnyRole };
}
