import { useCallback } from 'react';

import { useCurrentUser } from '@/auth/useCurrentUser';

/**
 * Returns a stable callback that signs the current user out.
 *
 * The underlying context `signOut()` clears all in-memory tokens, so no
 * additional cleanup is required here.
 *
 * @throws Error if called outside of an AuthProvider.
 */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useCurrentUser();
  return useCallback(async (): Promise<void> => {
    await signOut();
  }, [signOut]);
}
