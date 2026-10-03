import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import {
  AuthenticationDetails,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';
import type {
  CognitoUserSession,
  ICognitoStorage,
  ISignUpResult,
} from 'amazon-cognito-identity-js';

import { registerAuthBridge } from '@/api/client';
import { AuthContext } from '@/auth/AuthContext';
import type { AuthContextValue, UserRole } from '@/auth/AuthContext';

/**
 * In-memory token store.
 *
 * SECURITY (security.md steering): tokens MUST live in memory only and never in
 * localStorage/sessionStorage. These module-scoped variables are the single
 * source of truth for the current session's tokens.
 */
let accessTokenStore: string | null = null;
let idTokenStore: string | null = null;
let refreshTokenStore: string | null = null;

/**
 * A `Map`-backed, module-scoped implementation of the Cognito storage contract.
 *
 * We pass this to `CognitoUserPool` as its `Storage` so the amazon-cognito
 * library itself never touches `window.localStorage`. All session metadata the
 * library persists stays in process memory and is lost on page reload — exactly
 * the behaviour we want for a public SPA client.
 */
const memoryStore = new Map<string, string>();

const inMemoryStorage: ICognitoStorage = {
  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
  },
  getItem(key: string): string | null {
    return memoryStore.get(key) ?? null;
  },
  removeItem(key: string): void {
    memoryStore.delete(key);
  },
  clear(): void {
    memoryStore.clear();
  },
};

/**
 * Clear every in-memory token and the library-managed storage.
 */
function clearTokenStore(): void {
  accessTokenStore = null;
  idTokenStore = null;
  refreshTokenStore = null;
  memoryStore.clear();
}

const USER_POOL_ID: string = import.meta.env.VITE_USER_POOL_ID;
const USER_POOL_CLIENT_ID: string = import.meta.env.VITE_USER_POOL_CLIENT_ID;

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: USER_POOL_CLIENT_ID,
  Storage: inMemoryStorage,
});

/**
 * Map a Cognito group name to a NourishNet {@link UserRole}.
 */
const GROUP_TO_ROLE: Readonly<Record<string, UserRole>> = {
  Donors: 'Donor',
  Organizations: 'Organization',
  Volunteers: 'Volunteer',
  Admins: 'Admin',
};

/**
 * Extract the caller's role from a decoded `id_token` payload.
 *
 * The `cognito:groups` claim (Requirements 7.2, 7.3) is the authoritative role
 * source. We read the first group and map it to a {@link UserRole}; anything
 * unrecognised yields `null`.
 */
function extractRole(session: CognitoUserSession): UserRole | null {
  const payload: unknown = session.getIdToken().decodePayload();
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const groupsClaim: unknown = (payload as Record<string, unknown>)['cognito:groups'];
  if (!Array.isArray(groupsClaim) || groupsClaim.length === 0) {
    return null;
  }

  const firstGroup: unknown = groupsClaim[0];
  if (typeof firstGroup !== 'string') {
    return null;
  }

  return GROUP_TO_ROLE[firstGroup] ?? null;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides authentication state and actions to the React tree.
 *
 * All Cognito tokens are held in module-scoped memory only. Because there is no
 * persisted session, a page reload clears auth state — on mount we simply
 * resolve `isLoading` to `false` with no user.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Holds the latest `refreshSession` so the auth bridge never calls a stale
  // closure. Updated on every render below.
  const refreshSessionRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  useEffect(() => {
    // Tokens are in-memory only, so there is nothing to restore on mount.
    // Resolve the loading state immediately.
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Wire the plain API client module to the live, module-scoped token store
    // and the current `refreshSession`. `getAccessToken` reads the module
    // variable directly (not React state) so interceptors always see the
    // freshest token.
    registerAuthBridge({
      getAccessToken: (): string | null => accessTokenStore,
      refreshSession: (): Promise<boolean> => refreshSessionRef.current(),
    });
  }, []);

  function applySession(cognitoUser: CognitoUser, session: CognitoUserSession): void {
    const nextAccessToken = session.getAccessToken().getJwtToken();
    const nextIdToken = session.getIdToken().getJwtToken();
    const nextRefreshToken = session.getRefreshToken().getToken();

    accessTokenStore = nextAccessToken;
    idTokenStore = nextIdToken;
    refreshTokenStore = nextRefreshToken;

    setUser(cognitoUser);
    setAccessToken(nextAccessToken);
    setRole(extractRole(session));
  }

  function clearSession(): void {
    clearTokenStore();
    setUser(null);
    setAccessToken(null);
    setRole(null);
  }

  async function signIn(email: string, password: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
      Storage: inMemoryStorage,
    });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    await new Promise<void>((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession): void => {
          applySession(cognitoUser, session);
          resolve();
        },
        onFailure: (err: unknown): void => {
          reject(err instanceof Error ? err : new Error('Sign-in failed'));
        },
      });
    });
  }

  async function signUp(email: string, password: string, nextRole: UserRole): Promise<void> {
    const attributes = [
      new CognitoUserAttribute({ Name: 'custom:role', Value: nextRole }),
    ];

    await new Promise<ISignUpResult>((resolve, reject) => {
      userPool.signUp(email, password, attributes, [], (err, result) => {
        if (err !== null && err !== undefined) {
          reject(err instanceof Error ? err : new Error('Sign-up failed'));
          return;
        }
        if (result === undefined) {
          reject(new Error('Sign-up returned no result'));
          return;
        }
        resolve(result);
      });
    });
  }

  async function confirmSignUp(email: string, code: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
      Storage: inMemoryStorage,
    });

    await new Promise<void>((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err: unknown) => {
        if (err !== null && err !== undefined) {
          reject(err instanceof Error ? err : new Error('Confirmation failed'));
          return;
        }
        resolve();
      });
    });
  }

  async function signOut(): Promise<void> {
    const currentUser = user ?? userPool.getCurrentUser();
    if (currentUser !== null) {
      await new Promise<void>((resolve) => {
        currentUser.signOut(() => {
          resolve();
        });
      });
    }
    clearSession();
  }

  async function refreshSession(): Promise<boolean> {
    const currentUser = user ?? userPool.getCurrentUser();
    if (currentUser === null || refreshTokenStore === null) {
      return false;
    }

    const refreshToken = new CognitoRefreshToken({ RefreshToken: refreshTokenStore });

    return new Promise<boolean>((resolve) => {
      currentUser.refreshSession(
        refreshToken,
        (err: unknown, session: CognitoUserSession | null): void => {
          if (err !== null && err !== undefined) {
            resolve(false);
            return;
          }
          if (session === null) {
            resolve(false);
            return;
          }
          applySession(currentUser, session);
          resolve(true);
        },
      );
    });
  }

  // Keep the bridge's refresh callback pointing at the current closure.
  refreshSessionRef.current = refreshSession;

  const value: AuthContextValue = {
    user,
    accessToken,
    role,
    isLoading,
    signIn,
    signOut,
    signUp,
    confirmSignUp,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
