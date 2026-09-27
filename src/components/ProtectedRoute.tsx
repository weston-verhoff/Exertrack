import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: ReactNode;
  allowIncompleteOnboarding?: boolean;
};

export function ProtectedRoute({ children, allowIncompleteOnboarding = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: { pathname: location.pathname, search: location.search } }}
        replace
      />
    );
  }

  if (!allowIncompleteOnboarding && user.user_metadata?.onboarding_completed !== true) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
