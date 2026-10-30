// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
//
// One account, on a Wakapi server (self-hosted, or wakapi.dev) or on
// WakaTime: both serve the same WakaTime API, read with the account's API key.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

export const WAKATIME_API = 'https://api.wakatime.com/api/v1';
// Where Wakapi serves its WakaTime-compatible API, under the server address.
export const WAKAPI_COMPAT_PATH = '/api/compat/wakatime/v1';

// Refresh intervals offered in the configuration, in seconds.
export const POLL_INTERVALS = ['300', '600', '900', '1800'];

export const DEFAULT_CONFIG = {
  url: '',
  api_key: '',
  allow_self_signed: false,
  daily_goal: 120,
  poll_interval: '300',
  language: 'fr',
};

const WAKATIME_HOST = /^((www|api)\.)?wakatime\.com$/i;
// Screens of the Wakapi web app, dropped from an address copied from the browser.
const WAKAPI_SCREENS =
  /\/(summary|settings|login|signup|leaderboard|projects|imprint|subscription|reset-password|set-password)(\/.*)?$/;

/**
 * Parse the address typed by the user: a bare host or IP (`192.0.2.10:3000`),
 * or the URL copied from the browser (`https://wakapi.example.org/summary`).
 * HTTP by default for a bare address, HTTPS for wakapi.dev and WakaTime. A
 * path prefix is kept (reverse proxy under `/wakapi`), the API path and the
 * screens of the web app are dropped.
 * @param {unknown} raw
 * @returns {{ service: 'wakapi'|'wakatime', url: string, api: string }|null}
 */
export function parseServerUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }
  const text = raw.trim();
  const hostPart = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/:?#]/)[0];
  const secureByDefault = WAKATIME_HOST.test(hostPart) || /^wakapi\.dev$/i.test(hostPart);
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
    ? text
    : `${secureByDefault ? 'https' : 'http'}://${text}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    return null;
  }
  // Credentials in the address would end up in the logs.
  if (url.username || url.password) {
    return null;
  }
  if (WAKATIME_HOST.test(url.hostname)) {
    return { service: 'wakatime', url: 'https://wakatime.com', api: WAKATIME_API };
  }
  const path = url.pathname
    .replace(/\/api(\/.*)?$/, '')
    .replace(WAKAPI_SCREENS, '')
    .replace(/\/+$/, '');
  const base = `${url.origin}${path}`;
  return { service: 'wakapi', url: base, api: `${base}${WAKAPI_COMPAT_PATH}` };
}

/** Host part shown to the user (no scheme). */
export const hostOf = (url) => url.replace(/^https?:\/\//, '');

/**
 * WakaTime, wakapi.dev or any public name is a cloud service; an IP address
 * (typed for a server at home), a `.local`, `.lan`… or a bare name is local.
 */
export function isCloud(url) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) {
    return false;
  }
  return !/\.(local|lan|home|internal|home\.arpa|localdomain)$/.test(host);
}

const bool = (value) => value === true || value === 'true';

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const typed = typeof source.url === 'string' ? source.url.trim() : '';
  const server = parseServerUrl(typed);
  const poll = String(source.poll_interval ?? '');
  const goal = Number.parseInt(String(source.daily_goal ?? ''), 10);
  return {
    server,
    urlTyped: typed !== '',
    // Keys are kept as typed, minus the blanks a copy and paste adds around them.
    apiKey: typeof source.api_key === 'string' ? source.api_key.trim() : '',
    allowSelfSigned: bool(source.allow_self_signed),
    goalMinutes:
      Number.isFinite(goal) && goal >= 1 && goal <= 1440 ? goal : DEFAULT_CONFIG.daily_goal,
    pollIntervalMs:
      Number(POLL_INTERVALS.includes(poll) ? poll : DEFAULT_CONFIG.poll_interval) * 1000,
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
