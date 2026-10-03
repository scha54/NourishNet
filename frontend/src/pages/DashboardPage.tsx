import type { JSX } from 'react';

/**
 * Authenticated dashboard landing page.
 *
 * Reachable only through a {@link ProtectedRoute} with no required role, so any
 * authenticated user lands here. Placeholder created by task 8.6; later tasks
 * will add role-specific dashboard content.
 */
export function DashboardPage(): JSX.Element {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome to your NourishNet dashboard.</p>
    </main>
  );
}
