import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * Bridge between the plain Axios module and the React {@link AuthProvider}.
 *
 * The API client is a plain module and cannot call React hooks, so it has no
 * direct access to the in-memory token store or `refreshSession`. The provider
 * wires those in at init time via {@link registerAuthBridge}, and the
 * interceptors read through the registered callbacks.
 *
 * - `getAccessToken` returns the live, module-scoped access token (never stale
 *   React state) or `null` when there is no active session.
 * - `refreshSession` attempts a silent token refresh and resolves `true` on
 *   success, `false` otherwise.
 */
export interface AuthBridge {
  getAccessToken(): string | null;
  refreshSession(): Promise<boolean>;
}

let authBridge: AuthBridge | null = null;

/**
 * Register the auth bridge so the request/response interceptors can read the
 * current access token and trigger a refresh. Called once by the
 * {@link AuthProvider} at provider init.
 *
 * If no bridge is registered, requests go out without an `Authorization`
 * header and the 401 refresh flow is skipped.
 */
export function registerAuthBridge(bridge: AuthBridge): void {
  authBridge = bridge;
}

/**
 * Base URL for all API calls, sourced from the Vite build-time environment.
 *
 * SECURITY (security.md steering): the frontend API client MUST NOT permit
 * HTTP endpoints — all traffic goes over HTTPS. We guard at module init so a
 * misconfigured `VITE_API_URL` fails fast rather than silently leaking tokens
 * over plaintext.
 */
const baseURL: string = import.meta.env.VITE_API_URL;

if (typeof baseURL !== 'string' || !baseURL.startsWith('https://')) {
  throw new Error(
    'VITE_API_URL must be configured as an HTTPS endpoint; HTTP is not permitted.',
  );
}

/**
 * Axios request config extended with a one-shot retry marker.
 *
 * `_retry` prevents an infinite refresh loop: once a request has been retried
 * after a 401 + refresh, a second 401 propagates instead of refreshing again.
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * The shared Axios instance used for all authenticated API calls.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor — attach the current access token as a Bearer token.
 *
 * Reads the live token through the registered bridge so it always reflects the
 * in-memory store rather than any captured React state. When no bridge is
 * registered or there is no token, the request goes out unauthenticated.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const accessToken = authBridge?.getAccessToken() ?? null;
    if (accessToken !== null) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  },
);

/**
 * Response interceptor — handle a single silent refresh on HTTP 401.
 *
 * On the first 401 for a request, attempt `refreshSession()` exactly once. If
 * the refresh succeeds, retry the original request (marked `_retry` so a second
 * 401 does not trigger another refresh). If the refresh fails, the retry also
 * 401s, or no bridge is registered, the error propagates — no loop.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      originalRequest === undefined ||
      originalRequest._retry === true ||
      authBridge === null
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshed = await authBridge.refreshSession();
    if (!refreshed) {
      return Promise.reject(error);
    }

    return apiClient(originalRequest);
  },
);
