// -----------------------------------------------------------------------------
// The hub against the fake Wakapi (real recorded answers): the device and its
// states, the scene events and their persistence, the errors in the user's
// words, WakaTime, the transports and the scene action.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_CONFIG,
  FakeWakapi,
  TODAY,
  accountId,
  createAll,
  createClock,
  createWorld,
} from './helpers/world.js';
import { Store } from '../src/store.js';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

const DAY_MS = 24 * 60 * 60_000;

test('one device for the account, with the figures of the recorded answers', async (t) => {
  const w = await world(t);
  const [device] = w.fake.discoveredDevices;
  const ids = accountId(w.gladys);
  assert.equal(device.name, 'Wakapi alice');
  assert.equal(device.external_id, ids.device);
  assert.equal(device.should_poll, false);
  await createAll(w);
  // 5970 s today; the week since Monday 26/10: 7170 + 8040 + 5970 s; the
  // average over the 4 days with coding of the last 7: 24150 / 4 s.
  assert.equal(w.fake.lastState(ids.feature('today')), 100);
  assert.equal(w.fake.lastState(ids.feature('week')), 353);
  assert.equal(w.fake.lastState(ids.feature('daily_average')), 101);
  assert.equal(w.fake.lastState(ids.feature('top_project')), 'gladys-wakapi');
  assert.equal(w.fake.lastState(ids.feature('top_language')), 'Javascript');
  assert.deepEqual(w.fake.connectionStatus, { connected: true });
  assert.equal(w.fake.transports.at(-1).transport, 'local');
});

test('the days asked are the last 7 in the time zone of Gladys', async (t) => {
  const w = await world(t, { clock: createClock(Date.UTC(2026, 9, 29, 23, 30)) });
  const asked = w.server.requests.find((r) => r.path.endsWith('/summaries'));
  // 23:30 UTC on 29/10 is already 30/10 in Paris.
  assert.match(asked.query, /start=2026-10-24&end=2026-10-30&timezone=Europe%2FParis/);
});

test('only the changes are published, the texts when nothing was coded today', async (t) => {
  const w = await world(t, { clock: createClock(Date.UTC(2026, 9, 31, 7, 0)) });
  await createAll(w);
  const ids = accountId(w.gladys);
  assert.equal(w.fake.lastState(ids.feature('today')), 0);
  assert.equal(w.fake.lastState(ids.feature('top_project')), 'None');
  const count = w.fake.states.length;
  await w.hub.poll();
  assert.equal(w.fake.states.length, count, 'nothing changed, nothing sent');
  w.server.code('2026-10-31', 600, 'blog', 'Markdown');
  await w.hub.poll();
  assert.equal(w.fake.lastState(ids.feature('today')), 10);
  assert.equal(w.fake.lastState(ids.feature('top_project')), 'blog');
});

test('first reading fires nothing; the goal fires once; the next day, first coding', async (t) => {
  const clock = createClock();
  const w = await world(t, { clock, config: { ...BASE_CONFIG, daily_goal: 120 } });
  assert.deepEqual(w.fake.sceneEvents, [], 'what is already there is not news');
  w.server.code(TODAY, 1200);
  await w.hub.poll();
  assert.deepEqual(w.fake.sceneEvents, [], '100 + 20 min: the goal is not passed yet');
  w.server.code(TODAY, 60);
  await w.hub.poll();
  await w.hub.poll();
  assert.deepEqual(w.fake.sceneEvents, [
    {
      key: 'daily_goal_reached',
      data: { minutes: 121, goal: 120, project: 'gladys-wakapi', language: 'Javascript' },
    },
  ]);
  // Midnight: a new day, nothing coded yet, then a first heartbeat.
  clock.time = Date.UTC(2026, 9, 30, 23, 10);
  await w.hub.poll();
  assert.equal(w.fake.sceneEvents.length, 1);
  w.server.code('2026-10-31', 120, 'blog', 'Markdown');
  await w.hub.poll();
  await w.hub.poll();
  assert.deepEqual(w.fake.sceneEvents.slice(1), [
    { key: 'first_activity', data: { project: 'blog', language: 'Markdown', minutes: 2 } },
  ]);
});

test('a restart neither repeats an event nor misses one of the same day', async (t) => {
  const clock = createClock();
  const server = new FakeWakapi();
  const first = await world(t, { clock, server });
  await first.app.stop();
  server.code(TODAY, 2 * 3600);
  const second = await world(t, { clock, server, dataDir: first.dataDir });
  assert.deepEqual(
    second.fake.sceneEvents.map((event) => event.key),
    ['daily_goal_reached'],
    'reached while the integration was stopped',
  );
  await second.app.stop();
  const third = await world(t, { clock, server, dataDir: first.dataDir });
  assert.deepEqual(third.fake.sceneEvents, [], 'already announced');
  const saved = await new Store(first.dataDir).load();
  assert.equal(saved.day, TODAY);
});

test('an event Gladys refuses is tried again at the next reading', async (t) => {
  const w = await world(t);
  w.server.code(TODAY, 2 * 3600);
  const original = w.gladys.publishSceneEvent.bind(w.gladys);
  let refuse = true;
  t.mock.method(w.gladys, 'publishSceneEvent', async (...args) => {
    if (refuse) {
      throw new Error('HTTP 429');
    }
    return original(...args);
  });
  await w.hub.poll();
  assert.deepEqual(w.fake.sceneEvents, []);
  refuse = false;
  await w.hub.poll();
  assert.deepEqual(
    w.fake.sceneEvents.map((event) => event.key),
    ['daily_goal_reached'],
  );
});

test('a goal changed in the configuration is announced when reached', async (t) => {
  const w = await world(t, { config: { ...BASE_CONFIG, daily_goal: 60 } });
  assert.deepEqual(w.fake.sceneEvents, []);
  await w.fake.configUpdated({ ...BASE_CONFIG, daily_goal: 90 });
  assert.deepEqual(
    w.fake.sceneEvents.map((event) => event.data.goal),
    [90],
  );
  await w.fake.configUpdated({ ...BASE_CONFIG, daily_goal: 180 });
  assert.equal(w.fake.sceneEvents.length, 1, '180 min is not reached');
});

test('a refused key: the status in four languages, never the key, unreachable', async (t) => {
  const w = await world(t);
  w.server.apiKey = 'another-key';
  await w.hub.poll();
  const status = w.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.deepEqual(Object.keys(status.message), ['en', 'fr', 'de', 'es']);
  assert.match(status.message.en, /API key refused/);
  assert.equal(w.fake.transports.at(-1).transport, 'unreachable');
  const ack = await w.fake.sceneAction('read_today', {});
  assert.equal(ack.success, false);
  assert.match(ack.error, /API key refused/);
});

test('the errors of the server, in words', async (t) => {
  const cases = [
    [{ status: 404, body: '404 page not found' }, /does not answer like Wakapi/],
    [{ status: 200, body: '<html>' }, /does not answer like Wakapi/],
    [{ status: 302, headers: { location: 'https://x' } }, /redirects/],
    [{ status: 502, body: 'Bad gateway' }, /answers with an error/],
    [{ status: 429, headers: { 'retry-after': '120' } }, /Too many requests/],
  ];
  for (const [answer, expected] of cases) {
    const server = new FakeWakapi();
    server.answer = answer;
    const w = await world(t, { server });
    assert.match(w.fake.connectionStatus.message.en, expected, JSON.stringify(answer));
    assert.deepEqual(w.fake.discoveredDevices, []);
  }
  const server = new FakeWakapi();
  server.online = false;
  const down = await world(t, { server });
  assert.match(down.fake.connectionStatus.message.en, /does not answer/);
});

test('a 429 waits as long as the server asks', async (t) => {
  const server = new FakeWakapi();
  server.answer = { status: 429, headers: { 'retry-after': '600' } };
  const w = await world(t, { server });
  assert.equal(w.hub.nextDelay(), 600_000);
});

test('WakaTime: same API under api.wakatime.com, a cloud device', async (t) => {
  const w = await world(t, { config: { ...BASE_CONFIG, url: 'wakatime.com' } });
  assert.ok(w.server.requests.every((r) => r.path.startsWith('/api/v1/')));
  const [device] = w.fake.discoveredDevices;
  assert.equal(device.name, 'WakaTime alice');
  assert.equal(device.external_id, accountId(w.gladys, 'wakatime.com').device);
  assert.equal(w.fake.transports.at(-1).transport, 'cloud');
});

test('without an address or a key: a status that says what to fill in', async (t) => {
  const empty = await world(t, { config: {} });
  assert.match(empty.fake.connectionStatus.message.en, /Enter the address/);
  const invalid = await world(t, { config: { url: 'ftp://x', api_key: 'k' } });
  assert.match(invalid.fake.connectionStatus.message.en, /not valid/);
  const noKey = await world(t, { config: { url: 'http://192.0.2.20:3000' } });
  assert.match(noKey.fake.connectionStatus.message.fr, /clé d'API/);
  assert.equal(empty.server.requests.length + noKey.server.requests.length, 0);
});

test('adding the device in Gladys sends every value again and refreshes the widget', async (t) => {
  const w = await world(t);
  const before = w.fake.states.length;
  const refreshes = w.fake.widgetRefreshes.length;
  await createAll(w);
  assert.equal(w.fake.states.length - before, 5);
  assert.ok(w.fake.widgetRefreshes.length > refreshes);
});

test('the scene action reads today as a sentence, with the figures', async (t) => {
  const w = await world(t, { config: { ...BASE_CONFIG, language: 'fr' } });
  const ack = await w.fake.sceneAction('read_today', {});
  assert.equal(ack.success, true, ack.error);
  assert.deepEqual(ack.data.outputs, {
    text: "1 h 40 min de code aujourd'hui (objectif 2 h), surtout sur gladys-wakapi en Javascript. Cette semaine : 5 h 53 min.",
    minutes_today: 100,
    minutes_week: 353,
    goal_reached: false,
    project: 'gladys-wakapi',
    language: 'Javascript',
  });
});

test('the "Test the connection" action reports the account', async (t) => {
  const w = await world(t);
  const ack = await w.fake.action('test_connection', {});
  assert.equal(ack.success, true, ack.error);
  assert.match(JSON.stringify(ack.data ?? ack), /alice/);
  w.server.apiKey = 'other';
  const failed = await w.fake.action('test_connection', {});
  assert.equal(failed.success, false);
  assert.match(failed.error, /Connection failed: API key refused/);
});

test('a reconnection of Gladys sends everything again', async (t) => {
  const w = await world(t);
  const before = w.fake.states.length;
  await w.hub.resync(w.hub.config);
  assert.ok(w.fake.states.length > before);
  assert.ok(DAY_MS > 0);
});

test('failed readings back off from 1 minute to the interval', async (t) => {
  const server = new FakeWakapi();
  server.online = false;
  const w = await world(t, { server, config: { ...BASE_CONFIG, poll_interval: '600' } });
  const delays = [w.hub.nextDelay()];
  for (let i = 0; i < 4; i += 1) {
    await w.hub.poll();
    delays.push(w.hub.nextDelay());
  }
  assert.deepEqual(delays, [60_000, 120_000, 240_000, 480_000, 600_000]);
  server.online = true;
  await w.hub.poll();
  assert.equal(w.hub.failures, 0);
});

test('a scene action in a loop reuses a reading of the last 30 seconds', async (t) => {
  const w = await world(t);
  const reads = () => w.server.requests.filter((r) => r.path.endsWith('/summaries')).length;
  const before = reads();
  await w.fake.sceneAction('read_today', {});
  await w.fake.sceneAction('read_today', {});
  assert.equal(reads(), before);
  w.clock.advance(31_000);
  await w.fake.sceneAction('read_today', {});
  assert.equal(reads(), before + 1);
});

test('the sentence without a project or a language', async (t) => {
  const server = new FakeWakapi();
  server.days.get(TODAY).projects = [];
  const w = await world(t, { server });
  const ack = await w.fake.sceneAction('read_today', {});
  assert.equal(
    ack.data.outputs.text,
    '1 h 40 min of coding today (goal 2 h). This week: 5 h 53 min.',
  );
});

test('another server or key: its first failure is logged again', async (t) => {
  const server = new FakeWakapi();
  server.online = false;
  const w = await world(t, { server });
  assert.ok(w.hub.warned.has('read'));
  await w.fake.configUpdated({ ...BASE_CONFIG, api_key: 'other' });
  assert.equal(w.hub.error.kind, 'network');
  assert.ok(w.hub.warned.has('read'), 'flagged again by the new failure, after a reset');
  server.online = true;
  await w.fake.configUpdated(BASE_CONFIG);
  assert.ok(!w.hub.warned.has('read'));
});
