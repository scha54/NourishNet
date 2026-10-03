import type { JSX } from 'react';

/**
 * Placeholder 403 Forbidden page.
 *
 * Rendered by route guards when an authenticated user lacks the role required
 * for a protected route. Task 8.6 may refine this page; keep it minimal here so
 * the route guards compile and have something to render.
 */
export function ForbiddenPage(): JSX.Element {
  return (
    <main>
      <h1>Forbidden</h1>
      <p>You do not have permission to view this page (403).</p>
    </main>
  );
}
