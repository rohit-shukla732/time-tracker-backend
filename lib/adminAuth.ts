// Admin authentication utility with automatic token refresh

export async function refreshAdminToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      const newAccessToken = data.token;
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No access token available');
  }

  // First attempt with existing token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  // If unauthorized, try refreshing the token
  if (response.status === 401) {
    const newToken = await refreshAdminToken();
    
    if (newToken) {
      // Retry the request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    }
  }

  return response;
}

// Setup automatic token refresh before expiry (every 10 minutes)
export function setupAutoRefresh(): () => void {
  const refreshInterval = setInterval(async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      await refreshAdminToken();
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Return cleanup function
  return () => clearInterval(refreshInterval);
}
