'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AuthSession, clearSession, loadSession, saveSession } from '@/lib/auth';

interface AuthContextValue {
  session: AuthSession | null;
  /** True during the initial localStorage hydration on mount. */
  loading: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage once on mount (client-side only)
  useEffect(() => {
    setSession(loadSession());
    setLoading(false);
  }, []);

  const login = useCallback((newSession: AuthSession) => {
    saveSession(newSession);
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access the current auth session and auth actions. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

