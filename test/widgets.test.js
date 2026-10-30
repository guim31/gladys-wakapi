// -----------------------------------------------------------------------------
// The `coding_time` widget: valid content within the core budget (SDK
// validateWidgetContent), in the four languages, every optional block hidden
// by its setting, a message before the configuration or the first answer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { FakeWakapi, createWorld } from './helpers/world.js';

async function content(w, options = {}) {
  const ack = await w.fake.widgetGet('coding_time', { settings: {}, language: 'en', ...options });
  assert.equal(ack.success, true, ack.error);
  return ack.data.content;
}

function checkBudget(value) {
  assert.deepEqual(validateWidgetContent(value), []);
  const count = (types) => value.components.filter((c) => types.includes(c.type)).length;
  assert.ok(value.components.length <= 8);
  assert.ok(count(['text']) <= 2);
  assert.ok(count(['value', 'gauge']) <= 6);
}

test('today, the week, the goal, 7 days and the projects, in every language', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  for (const language of ['en', 'fr', 'de', 'es']) {
    const value = await content(w, { language });
    checkBudget(value);
    assert.deepEqual(
      value.components.map((c) => c.type),
      ['value', 'value', 'gauge', 'chart', 'status'],
    );
  }
  const value = await content(w);
  assert.equal(value.components[0].value, '1 h 40');
  assert.equal(value.components[1].value, '5 h 53');
  assert.equal(value.components[2].value, 83);
  assert.equal(value.components[3].series[0].points.length, 7);
  assert.deepEqual(value.components[3].series[0].points.at(-1), {
    t: '2026-10-30T12:00:00.000Z',
    v: 100,
  });
  assert.deepEqual(
    value.components[4].items.map((item) => [item.label, item.value]),
    [
      ['gladys-wakapi', '1 h 15 min'],
      ['blog', '25 min'],
    ],
  );
});

test('each optional block has a setting to hide it', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  const value = await content(w, {
    settings: { show_week: false, show_goal: false, show_chart: false, show_projects: false },
  });
  checkBudget(value);
  assert.deepEqual(
    value.components.map((c) => c.type),
    ['value'],
  );
});

test('nothing coded yet, the server lost, not configured', async (t) => {
  const server = new FakeWakapi();
  server.days.delete('2026-10-30');
  const w = await createWorld({ server });
  t.after(() => w.app.stop());
  let value = await content(w);
  checkBudget(value);
  assert.equal(value.components.at(-1).text, 'No coding yet today.');
  server.online = false;
  await w.hub.poll();
  value = await content(w);
  checkBudget(value);
  assert.equal(value.components[0].variant, 'caption');

  const empty = await createWorld({ config: {} });
  t.after(() => empty.app.stop());
  value = await content(empty, { language: 'fr' });
  checkBudget(value);
  assert.match(value.components[0].text, /Saisissez l'adresse/);
});

test('the server lost since yesterday: today shows zero, not yesterday', async (t) => {
  const w = await createWorld();
  t.after(() => w.app.stop());
  w.server.online = false;
  w.clock.time = Date.UTC(2026, 9, 30, 23, 30);
  await w.hub.poll();
  const value = await content(w);
  checkBudget(value);
  assert.equal(value.components[0].variant, 'caption');
  assert.equal(value.components[1].value, '0 min');
});
