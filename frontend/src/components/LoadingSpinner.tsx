import type { JSX } from 'react';

/**
 * Accessible loading indicator.
 *
 * Exposes `role="status"` so assistive technology announces the loading state,
 * and includes a visually-hidden label (Tailwind `sr-only`) for screen readers
 * while the spinner itself is purely decorative.
 */
export function LoadingSpinner(): JSX.Element {
  return (
    <div role="status" className="flex items-center justify-center p-4">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
