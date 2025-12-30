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

/**
 * Makes an authenticated fetch request with automatic token handling and error notifications
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param redirectPath - Path to redirect to on auth failure (default: '/manager/login')
 * @returns Promise with the response data
 */
export async function authFetch<T = any>(
  url: string,
  options: FetchOptions = {},
  redirectPath: string = '/manager/login'
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    handleAuthError('Session expired. Please log in again.', redirectPath);
    throw new AuthError('No access token found', 401);
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      handleAuthError('Your session has expired. Please log in again.', redirectPath);
      throw new AuthError('Unauthorized', 401);
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      handleAuthError('You do not have permission to access this resource.', redirectPath);
      throw new AuthError('Forbidden', 403);
    }

    // Handle other error responses
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthError(data.error || `Request failed with status ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    // If it's already an AuthError, rethrow it
    if (error instanceof AuthError) {
      throw error;
    }

    // Handle network errors
    console.error('Network error:', error);
    toast.error('Network error. Please check your connection.');
    throw new Error('Network error');
  }
}

/**
 * Handles authentication errors by showing a toast and redirecting after a delay
 */
function handleAuthError(message: string, redirectPath: string) {
  // Clear auth data
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  // Redirect immediately
  window.location.href = redirectPath;
}

/**
 * Validates user authentication and role
 * @param requiredRole - Optional required role (e.g., 'MANAGER', 'ADMIN')
 * @param redirectPath - Path to redirect to on failure
 * @returns User object or null
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
