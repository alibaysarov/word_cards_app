import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiGetMe, apiLogin, apiLogout, apiRegister } from '../api/auth.api';
import { tokenStorage } from '../api/httpClient';
import type { User } from '../types/auth';

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiGetMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      tokenStorage.clear();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    const tokens = await apiLogin(loginStr, password);
    tokenStorage.save(tokens.accessToken, tokens.refreshToken);
    const me = await apiGetMe();
    setUser(me);
  }, []);

  const register = useCallback(async (loginStr: string, password: string) => {
    const tokens = await apiRegister(loginStr, password);
    tokenStorage.save(tokens.accessToken, tokens.refreshToken);
    const me = await apiGetMe();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore server error */
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
