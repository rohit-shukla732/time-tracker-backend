import { toast } from 'sonner';

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

export class AuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

let _isRefreshing = false;
let _refreshWaiters: Array<(token: string | null) => void> = [];

/**
 * Attempt to use the stored refresh token to get a new access token.
 * Returns the new access token on success, null on failure.
 */
async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (_isRefreshing) {
    return new Promise((resolve) => {
      _refreshWaiters.push(resolve);
    });
  }

  _isRefreshing = true;
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      _refreshWaiters.forEach((cb) => cb(null));
      return null;
    }

    const data = await res.json();
    const newToken: string = data.token || data.accessToken;
    localStorage.setItem('accessToken', newToken);
    _refreshWaiters.forEach((cb) => cb(newToken));
    return newToken;
  } catch {
    _refreshWaiters.forEach((cb) => cb(null));
    return null;
  } finally {
    _isRefreshing = false;
    _refreshWaiters = [];
  }
}

/**
 * Makes an authenticated fetch request with automatic token refresh on 401.
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param redirectPath - Path to redirect to if refresh also fails
 * @returns Promise with the response data
 */
export async function authFetch<T = any>(
  url: string,
  options: FetchOptions = {},
  redirectPath: string = '/manager/login'
): Promise<T> {
  let token = localStorage.getItem('accessToken');

  if (!token) {
    // No token at all — try to refresh first before giving up
    token = await refreshAccessToken();
    if (!token) {
      handleAuthError('Session expired. Please log in again.', redirectPath);
      throw new AuthError('No access token found', 401);
    }
  }

  const doFetch = async (accessToken: string) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  };

  try {
    let response = await doFetch(token);

    // On first 401 — try to refresh and retry once
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await doFetch(newToken);
      }
    }

    if (response.status === 401) {
      handleAuthError('Your session has expired. Please log in again.', redirectPath);
      throw new AuthError('Unauthorized', 401);
    }

    if (response.status === 403) {
      handleAuthError('You do not have permission to access this resource.', redirectPath);
      throw new AuthError('Forbidden', 403);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthError(data.error || `Request failed with status ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error('Network error:', error);
    toast.error('Network error. Please check your connection.');
    throw new Error('Network error');
  }
}

/**
 * Clears all auth data and redirects to the login page.
 */
function handleAuthError(message: string, redirectPath: string) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = redirectPath;
}

/**
 * Validates user authentication and role without redirecting on expired tokens —
 * the refresh flow in authFetch handles re-auth transparently.
 */
export function validateAuth(
  requiredRole?: string,
  redirectPath: string = '/time-tracker/manager/login'
): any | null {
  const token = localStorage.getItem('accessToken');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) {
    handleAuthError('Please log in to continue.', redirectPath);
    return null;
  }

  try {
    const user = JSON.parse(storedUser);

    if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
      handleAuthError(`${requiredRole} privileges required.`, redirectPath);
      return null;
    }

    return user;
  } catch (e) {
    console.error('Failed to parse user:', e);
    handleAuthError('Session invalid. Please log in again.', redirectPath);
    return null;
  }
}
