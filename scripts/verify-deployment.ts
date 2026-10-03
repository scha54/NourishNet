/**
 * Deployment verification script.
 *
 * Performs lightweight post-deployment smoke checks against a running
 * NourishNet environment:
 *
 *   Check 1 — the deployed frontend (FRONTEND_URL) responds with HTTP 200.
 *   Check 2 — the API health endpoint (API_URL + /v1/health) responds with
 *             HTTP 200 and reports status "ok".
 *
 * Configuration comes from environment variables:
 *   FRONTEND_URL — the Amplify Hosting URL of the deployed SPA.
 *   API_URL      — the API Gateway base URL (without a trailing /v1).
 *
 * Security notes:
 *   - Only HTTPS endpoints are permitted. HTTP endpoints are rejected.
 *   - Uses the global fetch API available in Node.js 20+.
 *
 * Exit codes: 0 when every check passes, 1 when any check fails.
 */

type CheckResult = {
  readonly description: string;
  readonly passed: boolean;
  readonly detail: string;
};

/**
 * Narrows an unknown parsed JSON body to the health-response envelope and
 * reports whether it indicates an "ok" status. Accepts both the raw shape
 * (`{ status: 'ok' }`) and the API response envelope (`{ data: { status: 'ok' } }`).
 */
function isHealthOk(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const record = body as Record<string, unknown>;

  if (record['status'] === 'ok') {
    return true;
  }

  const data = record['data'];
  if (typeof data === 'object' && data !== null) {
    return (data as Record<string, unknown>)['status'] === 'ok';
  }

  return false;
}

/**
 * Validates that a URL is present and uses the HTTPS scheme.
 * Returns a failing CheckResult when invalid, otherwise null.
 */
function validateHttpsUrl(value: string | undefined, label: string): CheckResult | null {
  if (!value || value.trim().length === 0) {
    return {
      description: label,
      passed: false,
      detail: `Environment variable is not set.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      description: label,
      passed: false,
      detail: `"${value}" is not a valid URL.`,
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      description: label,
      passed: false,
      detail: `Only HTTPS endpoints are permitted (got "${parsed.protocol}").`,
    };
  }

  return null;
}

/**
 * Check 1 — the frontend URL returns HTTP 200.
 */
async function checkFrontend(frontendUrl: string | undefined): Promise<CheckResult> {
  const description = 'Frontend reachable (HTTP 200)';

  const invalid = validateHttpsUrl(frontendUrl, description);
  if (invalid) {
    return invalid;
  }

  // frontendUrl is defined and HTTPS here (validateHttpsUrl guaranteed it).
  const url = frontendUrl as string;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.status === 200) {
      return { description, passed: true, detail: `GET ${url} returned 200.` };
    }
    return {
      description,
      passed: false,
      detail: `GET ${url} returned ${response.status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return { description, passed: false, detail: `GET ${url} failed: ${message}.` };
  }
}

/**
 * Check 2 — the API health endpoint returns HTTP 200 with status "ok".
 */
async function checkApiHealth(apiUrl: string | undefined): Promise<CheckResult> {
  const description = 'API health endpoint OK (HTTP 200, status "ok")';

  const invalid = validateHttpsUrl(apiUrl, description);
  if (invalid) {
    return invalid;
  }

  const base = (apiUrl as string).replace(/\/+$/, '');
  const healthUrl = `${base}/v1/health`;

  try {
    const response = await fetch(healthUrl, { method: 'GET' });
    if (response.status !== 200) {
      return {
        description,
        passed: false,
        detail: `GET ${healthUrl} returned ${response.status}.`,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        description,
        passed: false,
        detail: `GET ${healthUrl} returned 200 but the body was not valid JSON.`,
      };
    }

    if (isHealthOk(body)) {
      return { description, passed: true, detail: `GET ${healthUrl} returned 200 with status "ok".` };
    }

    return {
      description,
      passed: false,
      detail: `GET ${healthUrl} returned 200 but status was not "ok".`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return { description, passed: false, detail: `GET ${healthUrl} failed: ${message}.` };
  }
}

async function main(): Promise<void> {
  const frontendUrl = process.env['FRONTEND_URL'];
  const apiUrl = process.env['API_URL'];

  const results: readonly CheckResult[] = await Promise.all([
    checkFrontend(frontendUrl),
    checkApiHealth(apiUrl),
  ]);

  for (const result of results) {
    const tag = result.passed ? '[PASS]' : '[FAIL]';
    console.log(`${tag} ${result.description} — ${result.detail}`);
  }

  const allPassed = results.every((result) => result.passed);
  if (!allPassed) {
    console.error('Deployment verification failed.');
    process.exit(1);
  }

  console.log('Deployment verification succeeded.');
  process.exit(0);
}

void main();
