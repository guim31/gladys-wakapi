// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake Wakapi on a fake
// network, a temporary /data, a manual clock and the Paris time zone, with
// the integration wired on top through registerHandlers. No timer runs unless
// `timers: true` (with node:test mock timers): the tests read the server with
// `world.hub.poll()`.
// -----------------------------------------------------------------------------

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';
import { API_KEY, FakeWakapi, createNetwork } from './fakeWakapi.js';

// The integration logs its lifecycle; keep the test output readable.
process.env.LOG_LEVEL ??= 'silent';

export const URL_1 = 'http://192.0.2.20:3000';
export const TIME_ZONE = 'Europe/Paris';
// The fixtures were captured on 30/10/2026 at 06:52 UTC; the tests start at
// 07:00 UTC (08:00 in Paris), a Friday: the week started on Monday 26/10.
export const START = Date.UTC(2026, 9, 30, 7, 0, 0);
export const TODAY = '2026-10-30';

export function createClock(start = START) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

export const BASE_CONFIG = { url: URL_1, api_key: API_KEY, language: 'en' };

export async function createWorld({
  clock = createClock(),
  server,
  config = BASE_CONFIG,
  devices = [],
  connect = true,
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-wakapi-')),
  timings = {},
  timers = false,
} = {}) {
  const wakapi = server ?? new FakeWakapi();
  const network = createNetwork({ [URL_1]: wakapi, 'https://api.wakatime.com': wakapi });
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, {
    store: new Store(dataDir),
    request: network.request,
    timers,
    timings,
    now: clock.now,
    timeZone: TIME_ZONE,
  });
  if (connect) {
    await gladys.connect();
    await app.ready;
  }
  return { gladys, fake: gladys.fake, server: wakapi, app, hub: app.hub, clock, dataDir };
}

export const accountId = (gladys, host = '192.0.2.20-3000', id = 'alice') =>
  gladys.externalIds('account', `${host}-${id}`);

/** Add every discovered device in Gladys, as the user would. */
export async function createAll(world) {
  for (const device of world.fake.discoveredDevices) {
    await world.fake.deviceCreated(device);
  }
}

export { API_KEY, FakeWakapi };
