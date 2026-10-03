import { useContext } from 'react';

import { AuthContext } from '@/auth/AuthContext';
import type { AuthContextValue } from '@/auth/AuthContext';

/**
 * Access the current authentication context.
 *
 * @throws Error if called outside of an {@link AuthProvider}.
 */
export function useCurrentUser(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useCurrentUser must be used within an AuthProvider');
  }
  return context;
}
