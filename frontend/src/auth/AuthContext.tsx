import { createContext } from 'react';
import type { CognitoUser } from 'amazon-cognito-identity-js';

/**
 * The four NourishNet user roles. Defined locally in the frontend auth module
 * so the frontend never imports from the backend workspace (layer separation).
 */
export type UserRole = 'Donor' | 'Organization' | 'Volunteer' | 'Admin';

/**
 * Shape of the authentication context exposed to the React tree.
 *
 * Tokens are never surfaced beyond `accessToken` here, and even that is held in
 * memory only — the provider stores all tokens in module-scoped variables and
 * never persists them to localStorage/sessionStorage (see security steering).
 */
export interface AuthContextValue {
  user: CognitoUser | null;
  accessToken: string | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  signUp(email: string, password: string, role: UserRole): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  refreshSession(): Promise<boolean>;
}

/**
 * Authentication context. Defaults to `null` so consumers can detect usage
 * outside of an {@link AuthProvider} and fail loudly.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
