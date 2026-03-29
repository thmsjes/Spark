const baseHeaders = {
  'Content-Type': 'application/json',
};

const apiBaseUrl = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
  const tokenParts = normalizedToken.split('.');
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload = new TextDecoder().decode(bytes);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function decodeOpaqueTokenClaims(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
  if (normalizedToken.includes('.')) {
    return null;
  }

  try {
    const decoded = atob(normalizedToken);
    const parts = decoded.split(':');

    // Expected format observed from backend: userId:role:nonce
    if (parts.length >= 2) {
      const userId = parts[0] || null;
      const role = parts[1] || null;

      return {
        sub: userId,
        userId,
        role,
        tokenType: 'opaque',
      };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeRoles(claims) {
  if (!claims) {
    return [];
  }

  const roleClaim =
    claims.role
    ?? claims.roles
    ?? claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

  if (Array.isArray(roleClaim)) {
    return roleClaim.filter(Boolean);
  }

  if (typeof roleClaim === 'string' && roleClaim.trim()) {
    return [roleClaim.trim()];
  }

  return [];
}

function extractToken(response) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  return response.token
    ?? response.accessToken
    ?? response.access_token
    ?? response.id_token
    ?? response.jwt
    ?? response.data?.token
    ?? response.data?.accessToken
    ?? response.data?.access_token
    ?? response.data?.id_token
    ?? response.user?.token
    ?? response.user?.accessToken
    ?? response.user?.access_token
    ?? null;
}

function extractClaims(response, token) {
  const tokenClaims = decodeTokenClaims(token);
  if (tokenClaims) {
    return tokenClaims;
  }

  const opaqueClaims = decodeOpaqueTokenClaims(token);
  if (opaqueClaims) {
    return opaqueClaims;
  }

  return response?.claims
    ?? response?.user?.claims
    ?? response?.data?.claims
    ?? null;
}

function extractDisplayName(response, claims, fallbackEmail) {
  const candidate =
    response?.name
    ?? response?.fullName
    ?? response?.userName
    ?? claims?.name
    ?? claims?.unique_name
    ?? claims?.given_name
    ?? claims?.email
    ?? fallbackEmail
    ?? 'Fleet Manager';

  if (typeof candidate === 'string' && candidate.includes('@')) {
    return candidate.split('@')[0];
  }

  return candidate;
}

function buildUrl(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || 'An error occurred while talking to the API.';
    throw new Error(message);
  }

  return data;
}

async function apiRequest({ url, method = 'POST', body }) {
  const response = await fetch(buildUrl(url), {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse(response);
}

export async function sendVisitAnalytics(payload) {
  return apiRequest({ url: '/analytics/visit', body: payload });
}

export async function loginUser(credentials) {
  return apiRequest({ url: '/users/login', body: credentials });
}

export function decodeTokenClaims(token) {
  return decodeJwtPayload(token);
}

export function parseLoginAuth(response, fallbackEmail) {
  const token = extractToken(response);
  const claims = extractClaims(response, token);
  const roles = normalizeRoles(claims);
  const name = extractDisplayName(response, claims, fallbackEmail);

  return {
    token,
    claims,
    roles,
    name,
    email: response?.email ?? claims?.email ?? fallbackEmail ?? null,
  };
}

export async function submitContactForm(payload) {
  return apiRequest({ url: '/api/contact', body: payload });
}

export async function fetchDashboardOverview() {
  return apiRequest({ url: '/api/dashboard/overview', method: 'GET' });
}
