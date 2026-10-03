import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/auth/useCurrentUser';

/**
 * Number of digits in the Cognito email-verification code.
 */
const VERIFICATION_CODE_LENGTH = 6;

/**
 * Public email-verification page.
 *
 * Renders a controlled form with the account email and the 6-digit
 * confirmation code Cognito mailed to the user (Requirements 3.4, 20.4). On
 * submit it calls the auth context's {@link useCurrentUser} `confirmSignUp`
 * method and, on success, routes the now-verified user to `/sign-in`.
 *
 * The email is prefilled from the router state set by the sign-up page when
 * available, but remains editable so the page is usable on its own (for example
 * when a user returns later to finish verifying). Any Cognito failure is
 * surfaced as a human-readable message (Requirement 20.5).
 */
export function VerifyEmailPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignUp } = useCurrentUser();

  // Prefill the email from the sign-up navigation state when present.
  const prefilledEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await confirmSignUp(email, code);
      navigate('/sign-in');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not verify that code. Please check it and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-brand-900">Verify your email</h1>
      <p className="mb-6 text-sm text-brand-700">
        Enter the {VERIFICATION_CODE_LENGTH}-digit code we emailed you to activate your account.
      </p>

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
          <label htmlFor="code" className="text-sm font-medium text-brand-900">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={VERIFICATION_CODE_LENGTH}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded border border-brand-300 px-3 py-2 tracking-widest text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
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
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
    </main>
  );
}
