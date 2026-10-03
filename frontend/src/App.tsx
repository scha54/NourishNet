import type { JSX } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardPage } from '@/pages/DashboardPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

/**
 * Application route tree.
 *
 * Public routes (`/`, `/sign-in`, `/sign-up`, `/verify-email`) are reachable by
 * anyone. `/dashboard` is wrapped in {@link ProtectedRoute} with no required
 * role, so any authenticated user may reach it. Unmatched paths fall through to
 * the 404 page.
 */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
