import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import type { UserRole } from '@/auth/AuthContext';
import { useCurrentUser } from '@/auth/useCurrentUser';

/**
 * Roles a user may self-select at registration time.
 *
 * `Admin` is intentionally excluded: Admin accounts are provisioned only by
 * existing Admins (Requirement 3.6), so the role must never be selectable from
 * the public sign-up form.
 */
const SELECTABLE_ROLES: readonly UserRole[] = ['Donor', 'Organization', 'Volunteer'];

/**
 * Public sign-up page.
 *
 * Renders a controlled registration form (email, password, password
 * confirmation, role) and submits to Cognito via the auth context's
 * {@link useCurrentUser} `signUp` method.
 *
 * Validation of `password === confirmPassword` happens client-side before any
 * network call (Requirement 20.2). On success the user is routed to
 * `/verify-email` to enter their emailed confirmation code.
 */
export function SignUpPage(): JSX.Element {
  const navigate = useNavigate();
  const { signUp } = useCurrentUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Donor');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    // Client-side password-match check runs before any network call.
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, role);
      // Carry the email forward so the verification page can prefill it; the
      // confirmSignUp call requires the username (email) alongside the code.
      navigate('/verify-email', { state: { email } });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create your account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setRole(event.target.value as UserRole);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-brand-900">Create your NourishNet account</h1>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-brand-300 px-3 py-2 text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-900">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded border border-brand-300 px-3 py-2 text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-sm font-medium text-brand-900">
            I am signing up as a
          </label>
          <select
            id="role"
            name="role"
            required
            value={role}
            onChange={handleRoleChange}
            className="rounded border border-brand-300 px-3 py-2 text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {SELECTABLE_ROLES.map((selectableRole) => (
              <option key={selectableRole} value={selectableRole}>
                {selectableRole}
              </option>
            ))}
          </select>
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}
