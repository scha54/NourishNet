import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/auth/useCurrentUser';

/**
 * Generic, non-revealing failure message shown for any sign-in error.
 *
 * To avoid leaking whether the email or the password was wrong (Requirements
 * 4.2, 4.3), every Cognito/auth failure surfaces this single fixed message
 * rather than the underlying error text.
 */
const SIGN_IN_ERROR_MESSAGE = 'Incorrect email or password.';

/**
 * Public sign-in page.
 *
 * Renders a controlled sign-in form (email, password) and authenticates via the
 * auth context's {@link useCurrentUser} `signIn` method. On success the provider
 * holds the resulting tokens in memory only (never localStorage/sessionStorage,
 * per security steering) and the user is redirected to the page they originally
 * requested, falling back to `/dashboard`.
 *
 * On failure a deliberately generic message is shown so the form never reveals
 * which field was incorrect (Requirements 4.2, 4.3).
 */
export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useCurrentUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);

      // Return the user to the URL that triggered the redirect to sign-in,
      // defaulting to the dashboard when there was no originating location.
      const from =
        (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch {
      // Never surface raw Cognito errors here: a single generic message keeps
      // the response identical for unknown-user and wrong-password cases.
      setErrorMessage(SIGN_IN_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-brand-900">Sign in to NourishNet</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-brand-900">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-brand-300 px-3 py-2 text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-brand-900">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-brand-300 px-3 py-2 text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        {errorMessage !== null && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
