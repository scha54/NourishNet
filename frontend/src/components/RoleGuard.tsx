import type { JSX, ReactNode } from 'react';

import type { UserRole } from '@/auth/AuthContext';
import { useCurrentUser } from '@/auth/useCurrentUser';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: ReactNode;
}

/**
 * Restricts its children to users holding a specific role.
 *
 * Assumes the caller has already established authentication (e.g. nested inside
 * a {@link ProtectedRoute}). If the current user's role does not match
 * `requiredRole`, a 403 Forbidden page is rendered instead of the children.
 */
export function RoleGuard({ requiredRole, children }: RoleGuardProps): JSX.Element {
  const { role } = useCurrentUser();

  if (role !== requiredRole) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
