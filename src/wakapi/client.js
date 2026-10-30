// -----------------------------------------------------------------------------
// Client of the WakaTime API, as served by Wakapi under
// /api/compat/wakatime/v1 and by WakaTime itself under api.wakatime.com/api/v1.
// Two read-only calls:
//   - GET users/current: the account (its id and name, for the device);
//   - GET users/current/summaries?start&end: one entry per day, with the
//     total and the time per project and per language.
// Authentication: HTTP Basic with the API key alone, base64-encoded (the
// scheme both servers document). The key never appears in an error message.
// -----------------------------------------------------------------------------

import { httpRequest } from './http.js';

export const ERROR_KINDS = Object.freeze({
  AUTH: 'auth',
  NOT_WAKAPI: 'not_wakapi',
  REDIRECT: 'redirect',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  NETWORK: 'network',
  CERTIFICATE: 'certificate',
});

export class WakapiError extends Error {
  /**
   * @param {string} kind one of ERROR_KINDS
   * @param {string} message for the logs (never the key)
   * @param {object} [details] status, retryAfterMs
   */
  constructor(kind, message, { status, retryAfterMs } = {}) {
    super(message);
    this.name = 'WakapiError';
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const CERTIFICATE_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

function retryAfter(headers = {}) {
  const value = headers['retry-after'];
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds, 3600) * 1000;
  }
  return undefined;
}

export class WakapiClient {
  /**
   * @param {object} options
   * @param {string} options.api base URL of the WakaTime API (config.server.api)
   * @param {string} options.apiKey
   * @param {boolean} [options.insecure] accept a self-signed certificate
   * @param {Function} [options.request] HTTP seam (src/wakapi/http.js)
   */
  constructor({ api, apiKey, insecure = false, request = httpRequest }) {
    this.api = api;
    this.authorization = `Basic ${Buffer.from(apiKey, 'utf8').toString('base64')}`;
    this.insecure = insecure;
    this.request = request;
  }

  async get(path) {
    let response;
    try {
      response = await this.request(`${this.api}${path}`, {
        headers: { authorization: this.authorization },
        insecure: this.insecure,
      });
    } catch (err) {
      const kind = CERTIFICATE_CODES.has(err.code) ? ERROR_KINDS.CERTIFICATE : ERROR_KINDS.NETWORK;
      throw new WakapiError(kind, err.code ? `${err.code}` : err.message);
    }
    const { status, headers, body } = response;
    if (status === 401 || status === 403) {
      throw new WakapiError(ERROR_KINDS.AUTH, `API key refused (HTTP ${status})`, { status });
    }
    if (status === 429) {
      throw new WakapiError(ERROR_KINDS.RATE_LIMIT, 'Too many requests (HTTP 429)', {
        status,
        retryAfterMs: retryAfter(headers),
      });
    }
    if (status >= 300 && status < 400) {
      throw new WakapiError(ERROR_KINDS.REDIRECT, `Redirected (HTTP ${status})`, { status });
    }
    if (status >= 500) {
      throw new WakapiError(ERROR_KINDS.SERVER, `Server error (HTTP ${status})`, { status });
    }
    if (status === 404 || status < 200 || status >= 300) {
      throw new WakapiError(ERROR_KINDS.NOT_WAKAPI, `Unexpected answer (HTTP ${status})`, {
        status,
      });
    }
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      throw new WakapiError(ERROR_KINDS.NOT_WAKAPI, 'The answer is not JSON', { status });
    }
    if (!json || typeof json !== 'object' || json.data === undefined) {
      throw new WakapiError(ERROR_KINDS.NOT_WAKAPI, 'The answer has no data', { status });
    }
    return json;
  }

  /** The account: `{ data: { id, username, display_name, timezone, ... } }`. */
  user() {
    return this.get('/users/current');
  }

  /**
   * One entry per day from `start` to `end` (YYYY-MM-DD, both included).
   * WakaTime reads the days in `timeZone`; Wakapi in the time zone of the
   * account (its settings), and ignores the parameter.
   */
  summaries(start, end, timeZone) {
    const query = new URLSearchParams({ start, end });
    if (timeZone) {
      query.set('timezone', timeZone);
    }
    return this.get(`/users/current/summaries?${query}`);
  }
}
