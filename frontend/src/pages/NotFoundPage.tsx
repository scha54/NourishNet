import type { JSX } from 'react';

/**
 * Catch-all 404 Not Found page.
 *
 * Rendered by the `*` route when no other route matches. Placeholder created by
 * task 8.6.
 */
export function NotFoundPage(): JSX.Element {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist (404).</p>
    </main>
  );
}
