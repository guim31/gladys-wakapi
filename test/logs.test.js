// -----------------------------------------------------------------------------
// Quiet logs (Guilhem, 13/10/2026): nothing at info for a normal reading
// cycle, one line when the server is lost and one when it is back, never the
// API key, even at debug.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_KEY, BASE_CONFIG, TODAY, createClock, createWorld } from './helpers/world.js';

function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  const lines = [];
  const record =
    (stream) =>
    (...args) =>
      lines.push({
        stream,
        text: args.map((arg) => (arg instanceof Error ? arg.stack : String(arg))).join(' '),
      });
  t.mock.method(console, 'log', record('out'));
  t.mock.method(console, 'error', record('err'));
  t.mock.method(console, 'warn', record('err'));
  return {
    lines,
    clear: () => lines.splice(0),
    texts: () => lines.map((line) => line.text),
  };
}

async function world(t, options = {}) {
  const w = await createWorld({ clock: createClock(), ...options });
  t.after(() => w.app.stop());
  return w;
}

test('a normal reading cycle writes nothing at info', async (t) => {
  const logs = captureLogs(t);
  const w = await world(t);
  assert.ok(
    logs.texts().some((text) => text.includes('Connected to 192.0.2.20:3000 as alice')),
    'the start is logged',
  );
  logs.clear();
  for (let i = 0; i < 5; i += 1) {
    w.clock.advance(5 * 60_000);
    w.server.code(TODAY, 120);
    await w.hub.poll();
  }
  assert.deepEqual(logs.texts(), []);
});

test('an outage is logged once, and once when the server is back', async (t) => {
  const logs = captureLogs(t);
  const w = await world(t);
  logs.clear();
  w.server.online = false;
  for (let i = 0; i < 6; i += 1) {
    w.clock.advance(60_000);
    await w.hub.poll();
  }
  assert.equal(logs.lines.length, 1, logs.texts().join('\n'));
  logs.clear();
  w.server.online = true;
  await w.hub.poll();
  await w.hub.poll();
  assert.equal(logs.lines.length, 1, logs.texts().join('\n'));
  assert.match(logs.lines[0].text, /answers again after 5 min/);
});

test('never the API key, even at debug', async (t) => {
  const logs = captureLogs(t, 'debug');
  const w = await world(t);
  await w.fake.sceneAction('read_today', {});
  w.server.online = false;
  await w.hub.poll();
  const refused = await world(t, { config: { ...BASE_CONFIG, api_key: 'secret-wrong-key' } });
  await refused.hub.poll();
  const text = logs.texts().join('\n');
  assert.ok(!text.includes(API_KEY), 'never the key');
  assert.ok(!text.includes('secret-wrong-key'), 'never a refused key');
  assert.ok(!text.includes(Buffer.from(API_KEY).toString('base64')), 'nor its base64');
});
