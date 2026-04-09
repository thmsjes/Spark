const SESSION_ID_KEY = 'spark-analytics-session-id';
const CONSENT_KEY = 'spark-analytics-consent';

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  window.sessionStorage.setItem(SESSION_ID_KEY, generated);
  return generated;
}

function getNavigationType() {
  const navEntry = performance.getEntriesByType('navigation')?.[0];
  return navEntry?.type || 'navigate';
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

function readConsentSetting() {
  const raw = window.localStorage.getItem(CONSENT_KEY);
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return null;
}

function toNullable(value) {
  return value && value.trim() ? value.trim() : null;
}

function getCampaignParams(search) {
  const params = new URLSearchParams(search || '');
  return {
    utmSource: toNullable(params.get('utm_source')),
    utmMedium: toNullable(params.get('utm_medium')),
    utmCampaign: toNullable(params.get('utm_campaign')),
    utmTerm: toNullable(params.get('utm_term')),
    utmContent: toNullable(params.get('utm_content')),
  };
}

export function buildVisitAnalyticsPayload({ location, isAuthenticated = false }) {
  const visitId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    // Required fields for visit lifecycle tracking
    visitId,
    sessionId: getSessionId(),
    path: location.pathname,
    timestamp: new Date().toISOString(),

    // Recommended optional fields for attribution and diagnostics
    fullUrl: `${window.location.origin}${location.pathname}${location.search || ''}${location.hash || ''}`,
    pageTitle: document.title || null,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    deviceType: getDeviceType(),
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    navigationType: getNavigationType(),
    isAuthenticated,
    appVersion: import.meta.env.VITE_APP_VERSION || null,
    doNotTrack: navigator.doNotTrack === '1',
    consentGiven: readConsentSetting(),
    ...getCampaignParams(location.search),
  };
}
