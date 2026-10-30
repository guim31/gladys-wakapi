// -----------------------------------------------------------------------------
// The container reads the server on its own timer (should_poll: false, the
// core never polls the device: GladysAssistant/Gladys#3198), wakes up just
// after midnight, and stops with the integration.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_CONFIG, createAll, createClock, createWorld } from './helpers/world.js';

const settle = async () => {
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const reads = (server) => server.requests.filter((r) => r.path.endsWith('/summaries')).length;

test('the internal timer reads the server without any onPoll from Gladys', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = createClock();
  const w = await createWorld({
    clock,
    config: { ...BASE_CONFIG, poll_interval: '600' },
    timers: true,
  });
  t.after(() => w.app.stop());
  const polled = t.mock.method(w.hub, 'poll');
  await createAll(w);
  assert.equal(w.fake.discoveredDevices[0].should_poll, false, 'Gladys is not asked to poll');
  const before = reads(w.server);
  for (let i = 0; i < 3; i += 1) {
    clock.advance(600_000);
    t.mock.timers.tick(600_000);
    await settle();
  }
  assert.equal(reads(w.server) - before, 3, 'one reading per interval');
  assert.ok(polled.mock.callCount() >= 3);
  assert.equal(
    w.server.requests.filter((r) => r.path.endsWith('/users/current')).length,
    1,
    'the account is read once',
  );
});

test('the timer wakes up just after midnight, sooner than the interval', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  // 23:50 in Paris.
  const clock = createClock(Date.UTC(2026, 9, 30, 22, 50));
  const w = await createWorld({
    clock,
    config: { ...BASE_CONFIG, poll_interval: '1800' },
    timers: true,
  });
  t.after(() => w.app.stop());
  const delay = w.hub.nextDelay();
  assert.equal(delay, 10 * 60_000 + 30_000);
  w.server.code('2026-10-31', 300, 'blog', 'Markdown');
  clock.advance(delay);
  t.mock.timers.tick(delay);
  await settle();
  assert.deepEqual(
    w.fake.sceneEvents.map((event) => event.key),
    ['first_activity'],
  );
});

test('the timer stops with the integration', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = await createWorld({ timers: true });
  await w.app.stop();
  const before = w.server.requests.length;
  t.mock.timers.tick(60 * 60_000);
  await settle();
  assert.equal(w.server.requests.length, before);
});
