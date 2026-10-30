// -----------------------------------------------------------------------------
// An in-memory Wakapi (and WakaTime: same API, other path) on a fake network,
// answering with the real answers recorded from the official Docker image
// (test/fixtures/wakapi/, captured on 30/10/2026 at 06:52 UTC after sending
// real heartbeats). The days of the fixture are 24/10 to 30/10/2026; the tests
// add coding time to a day with `code()`.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/wakapi/${name}`, import.meta.url), 'utf8'));

export const USER = fixture('user.json');
export const SUMMARIES = fixture('summaries.json');
export const API_KEY = '3f6b2c1e-8d4a-4b7e-9c2f-0a1b2c3d4e5f';
export const FIRST_DAY = '2026-10-24';

const PREFIXES = ['/api/compat/wakatime/v1', '/api/v1'];

const addDays = (date, days) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const emptyDay = () => ({
  categories: [],
  dependencies: [],
  editors: [],
  languages: [],
  machines: [],
  operating_systems: [],
  projects: [],
  grand_total: { digital: '0:0', hours: 0, minutes: 0, text: '0 hrs 0 mins', total_seconds: 0 },
});

export class FakeWakapi {
  constructor({ apiKey = API_KEY } = {}) {
    this.apiKey = apiKey;
    this.online = true;
    /** Forced answer: `{ status, body, headers }`. */
    this.answer = null;
    this.requests = [];
    this.user = structuredClone(USER);
    this.days = new Map(
      SUMMARIES.data.map((entry, index) => [addDays(FIRST_DAY, index), structuredClone(entry)]),
    );
  }

  /** Add coding time to a day: `seconds` on `project` in `language`. */
  code(date, seconds, project = 'gladys-wakapi', language = 'Javascript') {
    const day = this.days.get(date) ?? emptyDay();
    day.grand_total.total_seconds += seconds;
    for (const [list, name] of [
      [day.projects, project],
      [day.languages, language],
    ]) {
      const item = list.find((entry) => entry.name === name);
      if (item) {
        item.total_seconds += seconds;
      } else {
        list.push({ name, total_seconds: seconds });
      }
    }
    this.days.set(date, day);
  }

  handle(url, options = {}) {
    const target = new URL(url);
    this.requests.push({ path: target.pathname, query: target.search, options });
    if (this.answer) {
      return { headers: {}, body: '', ...this.answer };
    }
    const prefix = PREFIXES.find((candidate) => target.pathname.startsWith(`${candidate}/`));
    const path = prefix ? target.pathname.slice(prefix.length) : target.pathname;
    const expected = `Basic ${Buffer.from(this.apiKey).toString('base64')}`;
    if (!prefix) {
      return { status: 404, headers: {}, body: '404 page not found' };
    }
    if (options.headers?.authorization !== expected) {
      return { status: 401, headers: {}, body: '401 unauthorized' };
    }
    if (path === '/users/current') {
      return { status: 200, headers: {}, body: JSON.stringify(this.user) };
    }
    if (path === '/users/current/summaries') {
      const start = target.searchParams.get('start');
      const end = target.searchParams.get('end');
      const data = [];
      for (let date = start; date <= end; date = addDays(date, 1)) {
        data.push(this.days.get(date) ?? emptyDay());
      }
      return { status: 200, headers: {}, body: JSON.stringify({ ...SUMMARIES, data }) };
    }
    return { status: 404, headers: {}, body: '404 page not found' };
  }
}

/** A fake network: each base URL is served by one fake server. */
export function createNetwork(servers) {
  return {
    async request(url, options) {
      for (const [base, server] of Object.entries(servers)) {
        if (url.startsWith(`${base}/`)) {
          if (!server.online) {
            const error = new Error('connect ECONNREFUSED');
            error.code = 'ECONNREFUSED';
            throw error;
          }
          return server.handle(url, options);
        }
      }
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      throw error;
    },
  };
}
