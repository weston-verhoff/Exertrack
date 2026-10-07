import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessThemeSandbox } from '../utils/themeSandboxAccess';

export function ThemeSandboxRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return canAccessThemeSandbox(user) ? <>{children}</> : <Navigate to="/" replace />;
}
