import type { JSX, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from '@/auth/AuthContext';
import { useCurrentUser } from '@/auth/useCurrentUser';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  /** If omitted, any authenticated user may access the route. */
  requiredRole?: UserRole;
  children: ReactNode;
}

/**
 * Guards a route so only authenticated (and optionally correctly-roled) users
 * can reach it.
 *
 * - While authentication state is loading, a {@link LoadingSpinner} is shown and
 *   no redirect occurs (Requirement 6.4).
 * - If the user is unauthenticated, they are redirected to `/sign-in` with the
 *   originally requested location preserved in router state so the sign-in flow
 *   can return them there afterwards (Requirements 6.1, 6.2).
 * - If `requiredRole` is set and the user's role does not match, a 403 Forbidden
 *   page is rendered (Requirements 7.1, 7.2).
 */
export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps): JSX.Element {
  const { accessToken, role, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (accessToken === null) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (requiredRole !== undefined && role !== requiredRole) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
