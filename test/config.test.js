// -----------------------------------------------------------------------------
// Configuration: the addresses users type (bare host, copied browser URL,
// reverse-proxy prefix, WakaTime), local or cloud, and the defaults.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, isCloud, normalizeConfig, parseServerUrl } from '../src/config.js';
import { msUntilNextDay, readingDays } from '../src/wakapi/model.js';

test('the addresses users type', () => {
  const api = (raw) => parseServerUrl(raw)?.api ?? null;
  assert.equal(api('192.0.2.10:3000'), 'http://192.0.2.10:3000/api/compat/wakatime/v1');
  assert.equal(
    api('https://wakapi.example.org/summary?interval=today'),
    'https://wakapi.example.org/api/compat/wakatime/v1',
  );
  assert.equal(
    api('https://example.org/wakapi/api/compat/wakatime/v1/'),
    'https://example.org/wakapi/api/compat/wakatime/v1',
  );
  assert.equal(
    api('https://example.org/projects/wakapi'),
    'https://example.org/projects/wakapi/api/compat/wakatime/v1',
  );
  assert.equal(api('wakapi.dev'), 'https://wakapi.dev/api/compat/wakatime/v1');
  for (const raw of ['wakatime.com', 'https://wakatime.com/dashboard', 'api.wakatime.com']) {
    assert.deepEqual(parseServerUrl(raw), {
      service: 'wakatime',
      url: 'https://wakatime.com',
      api: 'https://api.wakatime.com/api/v1',
    });
  }
  for (const raw of ['', '   ', 'ftp://x', 'http://user:pass@192.0.2.10', 42]) {
    assert.equal(parseServerUrl(raw), null, String(raw));
  }
});

test('local or cloud', () => {
  assert.equal(isCloud('http://192.168.1.20:3000'), false);
  assert.equal(isCloud('http://wakapi.local:3000'), false);
  assert.equal(isCloud('http://nas:3000'), false);
  assert.equal(isCloud('http://[fd00::1]:3000'), false);
  assert.equal(isCloud('https://wakapi.dev'), true);
  assert.equal(isCloud('https://wakatime.com'), true);
  assert.equal(isCloud('https://code.example.org'), true);
});

test('the defaults, and values out of range', () => {
  const config = normalizeConfig({ url: '192.0.2.10:3000', api_key: '  key  ' });
  assert.equal(config.apiKey, 'key');
  assert.equal(config.goalMinutes, DEFAULT_CONFIG.daily_goal);
  assert.equal(config.pollIntervalMs, 300_000);
  assert.equal(config.language, 'fr');
  const odd = normalizeConfig({ daily_goal: '0', poll_interval: '5', language: 'it' });
  assert.equal(odd.goalMinutes, 120);
  assert.equal(odd.pollIntervalMs, 300_000);
  assert.equal(odd.language, 'fr');
  assert.equal(odd.server, null);
  assert.equal(normalizeConfig({ daily_goal: '45' }).goalMinutes, 45);
});

test('the days of a reading, in the time zone of Gladys', () => {
  // Sunday 01/11/2026 at 00:30 in Paris (23:30 UTC on Saturday).
  const now = Date.UTC(2026, 9, 31, 23, 30);
  assert.deepEqual(readingDays(now, 'Europe/Paris'), {
    today: '2026-11-01',
    start: '2026-10-26',
    monday: '2026-10-26',
  });
  assert.equal(readingDays(now, 'UTC').today, '2026-10-31');
  assert.equal(msUntilNextDay(now, 'Europe/Paris'), 23.5 * 3600_000);
});
