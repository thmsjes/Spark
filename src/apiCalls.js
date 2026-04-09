const baseHeaders = {
  'Content-Type': 'application/json',
};

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';
const apiBaseUrl = configuredApiBaseUrl;

function getAuthHeaders({ requireToken = false } = {}) {
  const token = window.localStorage.getItem('spark-token');
  if (!token) {
    if (requireToken) {
      throw new Error('Authentication token is missing. Please log in again.');
    }
    return baseHeaders;
  }

  return {
    ...baseHeaders,
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  };
}

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
    const validationErrors = data?.errors && typeof data.errors === 'object'
      ? Object.entries(data.errors)
        .flatMap(([field, issues]) => {
          if (!Array.isArray(issues)) {
            return [];
          }
          return issues.map((issue) => `${field}: ${issue}`);
        })
      : [];

    const message = validationErrors.length > 0
      ? validationErrors.join(' | ')
      : data?.detail
        ?? data?.title
        ?? data?.message
        ?? response.statusText
        ?? 'An error occurred while talking to the API.';
    throw new Error(message);
  }

  return data;
}

async function apiRequest({ url, method = 'GET', body, requireToken = false }) {
  const requestOptions = {
    method,
    headers: getAuthHeaders({ requireToken }),
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(buildUrl(url), requestOptions);
  return handleResponse(response);
}

export async function sendVisitAnalytics(payload) {
  return apiRequest({ url: '/visits', method: 'POST', body: payload });
}

export async function loginUser(credentials) {
  return apiRequest({ url: '/users/login', method: 'POST', body: credentials });
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

function extractUserIdFromClaims(claims) {
  if (!claims || typeof claims !== 'object') {
    return null;
  }

  return claims.sub
    ?? claims.userId
    ?? claims.id
    ?? claims.nameid
    ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    ?? null;
}

export function getCurrentUserId() {
  const storedUserId = window.localStorage.getItem('spark-user-id');
  if (storedUserId) {
    return storedUserId;
  }

  const token = window.localStorage.getItem('spark-token');
  if (!token) {
    return null;
  }

  const claims = decodeTokenClaims(token) ?? decodeOpaqueTokenClaims(token);
  const userId = extractUserIdFromClaims(claims);
  if (userId !== null && userId !== undefined && String(userId).trim()) {
    const normalized = String(userId).trim();
    window.localStorage.setItem('spark-user-id', normalized);
    return normalized;
  }

  return null;
}

export async function submitContactForm(payload) {
  return apiRequest({ url: '/api/contact', method: 'POST', body: payload });
}

export async function fetchDashboardOverview() {
  return apiRequest({ url: '/api/dashboard/overview', method: 'GET' });
}

export async function fetchChargers() {
  return apiRequest({ url: '/Chargers', method: 'GET', requireToken: true });
}

export async function createCharger(payload) {
  return apiRequest({ url: '/Chargers', method: 'POST', body: payload, requireToken: true });
}

export async function updateCharger(chargerId, payload) {
  return apiRequest({
    url: `/Chargers/${encodeURIComponent(chargerId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteCharger(chargerId) {
  return apiRequest({ url: `/Chargers/${encodeURIComponent(chargerId)}`, method: 'DELETE', requireToken: true });
}

export async function fetchBuses() {
  return apiRequest({ url: '/Buses', method: 'GET', requireToken: true });
}

export async function fetchDistrictBuses() {
  return apiRequest({ url: '/DistrictBuses', method: 'GET', requireToken: true });
}

export async function fetchDistrictChargersByDistrictId(districtId) {
  return apiRequest({
    url: `/DistrictChargers/district/${encodeURIComponent(districtId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function createDistrictCharger(payload) {
  return apiRequest({ url: '/DistrictChargers', method: 'POST', body: payload, requireToken: true });
}

export async function updateDistrictCharger(identifiers, payload) {
  const districtChargerId = identifiers?.districtChargerId ?? identifiers?.id ?? null;
  const chargerId = identifiers?.chargerId ?? null;
  const districtId = identifiers?.districtId ?? null;

  const candidateUrls = [];
  if (chargerId !== null && chargerId !== undefined && districtId !== null && districtId !== undefined) {
    candidateUrls.push(`/DistrictChargers/${encodeURIComponent(chargerId)}/${encodeURIComponent(districtId)}`);
  }
  if (districtChargerId !== null && districtChargerId !== undefined) {
    candidateUrls.push(`/DistrictChargers/${encodeURIComponent(districtChargerId)}`);
  }

  if (candidateUrls.length === 0) {
    throw new Error('Unable to determine district charger id for update.');
  }

  let lastError = null;
  for (const url of candidateUrls) {
    try {
      return await apiRequest({ url, method: 'PUT', body: payload, requireToken: true });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to update district charger right now.');
}

export async function deleteDistrictCharger(identifiers) {
  const districtChargerId = identifiers?.districtChargerId ?? identifiers?.id ?? null;
  const chargerId = identifiers?.chargerId ?? null;
  const districtId = identifiers?.districtId ?? null;

  const candidateUrls = [];
  if (chargerId !== null && chargerId !== undefined && districtId !== null && districtId !== undefined) {
    candidateUrls.push(`/DistrictChargers/${encodeURIComponent(chargerId)}/${encodeURIComponent(districtId)}`);
  }
  if (districtChargerId !== null && districtChargerId !== undefined) {
    candidateUrls.push(`/DistrictChargers/${encodeURIComponent(districtChargerId)}`);
  }

  if (candidateUrls.length === 0) {
    throw new Error('Unable to determine district charger id for delete.');
  }

  let lastError = null;
  for (const url of candidateUrls) {
    try {
      return await apiRequest({ url, method: 'DELETE', requireToken: true });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to delete district charger right now.');
}

export async function fetchDistrictBusByBusNumberAndRouteId(busNumber, routeId) {
  return apiRequest({
    url: `/DistrictBuses/${encodeURIComponent(busNumber)}/${encodeURIComponent(routeId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function createDistrictBus(payload) {
  return apiRequest({ url: '/DistrictBuses', method: 'POST', body: payload, requireToken: true });
}

export async function updateDistrictBus(busNumber, routeId, payload) {
  return apiRequest({
    url: `/DistrictBuses/${encodeURIComponent(busNumber)}/${encodeURIComponent(routeId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteDistrictBus(busNumber, routeId) {
  return apiRequest({
    url: `/DistrictBuses/${encodeURIComponent(busNumber)}/${encodeURIComponent(routeId)}`,
    method: 'DELETE',
    requireToken: true,
  });
}

export async function fetchBusById(busId) {
  return apiRequest({ url: `/Buses/${encodeURIComponent(busId)}`, method: 'GET', requireToken: true });
}

export async function createBus(payload) {
  return apiRequest({ url: '/Buses', method: 'POST', body: payload, requireToken: true });
}

export async function updateBus(busId, payload) {
  return apiRequest({
    url: `/Buses/${encodeURIComponent(busId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteBus(busId) {
  return apiRequest({ url: `/Buses/${encodeURIComponent(busId)}`, method: 'DELETE', requireToken: true });
}

export async function fetchDistricts() {
  return apiRequest({ url: '/Districts', method: 'GET', requireToken: true });
}

export async function fetchDistrictById(districtId) {
  return apiRequest({ url: `/Districts/${encodeURIComponent(districtId)}`, method: 'GET', requireToken: true });
}

export async function fetchRoutesByDistrictId(districtId) {
  return apiRequest({
    url: `/Routes/district/${encodeURIComponent(districtId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function createRoute(payload) {
  return apiRequest({
    url: '/Routes',
    method: 'POST',
    body: payload,
    requireToken: true,
  });
}

export async function fetchRouteById(routeId) {
  return apiRequest({
    url: `/Routes/${encodeURIComponent(routeId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function updateRoute(routeId, payload) {
  return apiRequest({
    url: `/Routes/${encodeURIComponent(routeId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteRoute(routeId) {
  return apiRequest({
    url: `/Routes/${encodeURIComponent(routeId)}`,
    method: 'DELETE',
    requireToken: true,
  });
}

export async function createRouteDetail(payload) {
  return apiRequest({
    url: '/RouteDetails',
    method: 'POST',
    body: payload,
    requireToken: true,
  });
}

export async function fetchRouteDetailsByRouteId(routeId) {
  return apiRequest({
    url: `/RouteDetails/route/${encodeURIComponent(routeId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function fetchRouteDetailById(routeDetailId) {
  return apiRequest({
    url: `/RouteDetails/${encodeURIComponent(routeDetailId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function updateRouteDetail(routeDetailId, payload) {
  return apiRequest({
    url: `/RouteDetails/${encodeURIComponent(routeDetailId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteRouteDetail(routeDetailId) {
  return apiRequest({
    url: `/RouteDetails/${encodeURIComponent(routeDetailId)}`,
    method: 'DELETE',
    requireToken: true,
  });
}

export async function createDistrict(payload) {
  return apiRequest({ url: '/Districts', method: 'POST', body: payload, requireToken: true });
}

export async function updateDistrict(districtId, payload) {
  return apiRequest({
    url: `/Districts/${encodeURIComponent(districtId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteDistrict(districtId) {
  return apiRequest({ url: `/Districts/${encodeURIComponent(districtId)}`, method: 'DELETE', requireToken: true });
}

export async function fetchUsers() {
  return apiRequest({ url: '/Users', method: 'GET', requireToken: true });
}

export async function fetchUserById(userId) {
  return apiRequest({
    url: `/users/${encodeURIComponent(userId)}`,
    method: 'GET',
    requireToken: true,
  });
}

export async function createUser(payload) {
  return apiRequest({ url: '/users/register', method: 'POST', body: payload, requireToken: true });
}

export async function updateUser(userId, payload) {
  return apiRequest({
    url: `/Users/${encodeURIComponent(userId)}`,
    method: 'PUT',
    body: payload,
    requireToken: true,
  });
}

export async function deleteUser(userId) {
  return apiRequest({ url: `/Users/${encodeURIComponent(userId)}`, method: 'DELETE', requireToken: true });
}
