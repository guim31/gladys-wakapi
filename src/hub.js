// -----------------------------------------------------------------------------
// The Wakapi hub: reads the account on a timer of the container, publishes
// the coding times when they change, fires the scene events (first coding of
// the day, daily goal reached) and serves the widget and the scene action.
//
// Gladys never polls the device (should_poll: false): the interval, 5 to 30
// minutes, is beyond the fixed list of the core scheduler, and the scene
// events must fire even when no device was added. The timer also wakes up
// just after midnight, so "today" starts again at zero on time.
// -----------------------------------------------------------------------------

import { DEVICE_TRANSPORTS, createLogger } from '@gladysassistant/integration-sdk';
import { hostOf, isCloud } from './config.js';
import { accountIds, buildAccount, featureStates } from './devices.js';
import { ERROR_KINDS, WakapiClient, WakapiError } from './wakapi/client.js';
import {
  minutes,
  msUntilNextDay,
  parseSummaries,
  parseUser,
  readingDays,
  resolveTimeZone,
  summarize,
} from './wakapi/model.js';
import {
  ACTION_TEXT,
  CONNECTION_TEXT,
  ERROR_TEXT,
  REPORT_TEXT,
  TODAY_TEXT,
  allLanguages,
  formatDuration,
  pick,
} from './texts.js';

const logger = createLogger({ name: 'wakapi-hub' });

export const WIDGET_KEY = 'coding_time';

// Scene trigger keys (manifest `scene_triggers`): permanent once published.
export const TRIGGERS = Object.freeze({
  FIRST_ACTIVITY: 'first_activity',
  DAILY_GOAL_REACHED: 'daily_goal_reached',
});

const HOUR_MS = 60 * 60_000;

export const HUB_TIMINGS = {
  // A failed read is tried again this soon (or when a 429 says).
  retryMs: 60_000,
  // Read this long after midnight.
  wakeSlackMs: 30_000,
  // Never read more often than this on the timer.
  minDelayMs: 60_000,
  // Re-send unchanged values this often: Gladys shows "no recent value" after 48 h.
  heartbeatMs: 12 * HOUR_MS,
};

// Refused credentials or a wrong address do not fix themselves.
const SLOW_RETRY = new Set([
  ERROR_KINDS.AUTH,
  ERROR_KINDS.NOT_WAKAPI,
  ERROR_KINDS.REDIRECT,
  ERROR_KINDS.CERTIFICATE,
]);

export class WakapiHub {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {object} options.store persistence (src/store.js)
   * @param {Function} [options.request] HTTP seam (src/wakapi/http.js)
   * @param {boolean} [options.timers] periodic timer (off in tests)
   * @param {object} [options.timings] HUB_TIMINGS overrides
   * @param {() => number} [options.now]
   * @param {string} [options.timeZone] defaults to TZ, set by the Gladys supervisor
   */
  constructor({ gladys, store, request, timers = true, timings, now, timeZone }) {
    this.gladys = gladys;
    this.store = store;
    this.request = request;
    this.timersEnabled = timers;
    this.timings = { ...HUB_TIMINGS, ...timings };
    this.now = now ?? (() => Date.now());
    this.timeZone = resolveTimeZone(timeZone ?? process.env.TZ);
    this.config = null;
    this.client = null;
    this.reset();
    this.saved = {};
    this.connection = null;
    this.devicesSignature = null;
    this.widgetSignature = null;
    this.transport = null;
    this.timer = null;
    this.polling = null;
    this.stopped = false;
    /** Problems already logged, by key: repeats go to debug. */
    this.warned = new Set();
  }

  reset() {
    this.user = null;
    this.summary = null;
    this.reading = null;
    this.error = null;
    this.downSince = null;
    this.readAt = 0;
    this.connectedLogged = false;
  }

  // --- Logs ------------------------------------------------------------------
  // Info keeps the lifecycle only (connected, lost, back). A problem that
  // repeats is logged once, then at debug until it clears.

  problem(key, message, level = 'warn') {
    if (this.warned.has(key)) {
      logger.debug(message);
      return;
    }
    this.warned.add(key);
    logger[level](message);
  }

  resolved(key, message) {
    if (this.warned.delete(key) && message) {
      logger.info(message);
    }
  }

  get language() {
    return this.config?.language ?? 'en';
  }

  get host() {
    return this.config?.server ? hostOf(this.config.server.url) : '';
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(config) {
    const saved = await this.store.load();
    this.saved = saved && typeof saved === 'object' ? saved : {};
    await this.reconfigure(config);
  }

  /** Gladys reconnected (it restarted): send everything again. */
  async resync(config) {
    this.gladys.forgetPublishedStates?.();
    this.connection = null;
    this.devicesSignature = null;
    this.transport = null;
    await this.reconfigure(config);
  }

  async reconfigure(config) {
    const previous = this.config;
    this.config = config;
    const same =
      previous &&
      previous.server?.api === config.server?.api &&
      previous.apiKey === config.apiKey &&
      previous.allowSelfSigned === config.allowSelfSigned;
    if (!same) {
      this.reset();
      this.transport = null;
      this.client =
        config.server && config.apiKey
          ? new WakapiClient({
              api: config.server.api,
              apiKey: config.apiKey,
              insecure: config.allowSelfSigned,
              request: this.request,
            })
          : null;
    }
    // A new language: the device and its texts are published again.
    this.devicesSignature = null;
    this.gladys.forgetPublishedStates?.();
    await this.poll();
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.polling?.catch(() => {});
    await this.store.flush();
  }

  schedule(delay) {
    clearTimeout(this.timer);
    if (!this.timersEnabled || this.stopped || !this.client) {
      return;
    }
    this.timer = setTimeout(() => {
      this.poll().catch((err) => this.problem('poll', `Reading failed: ${err.message}`, 'error'));
    }, delay);
  }

  /** The interval, shortened to just after midnight; sooner after a passing failure. */
  nextDelay() {
    const interval = this.config.pollIntervalMs;
    if (this.error) {
      if (SLOW_RETRY.has(this.error.kind)) {
        return interval;
      }
      const wait = this.error.retryAfterMs ?? 0;
      return Math.max(Math.min(interval, this.timings.retryMs), wait);
    }
    const midnight = msUntilNextDay(this.now(), this.timeZone) + this.timings.wakeSlackMs;
    return Math.max(this.timings.minDelayMs, Math.min(interval, midnight));
  }

  // --- Reading ---------------------------------------------------------------

  /** One reading at a time: a call during a reading waits for it, then reads. */
  poll() {
    const run = async () => {
      try {
        await this.read();
      } finally {
        this.schedule(this.nextDelay());
      }
    };
    this.polling = (this.polling ?? Promise.resolve()).catch(() => {}).then(run);
    return this.polling;
  }

  async read() {
    if (!this.client) {
      await this.publishConnectionStatus();
      return;
    }
    const now = this.now();
    const { client } = this;
    const days = readingDays(now, this.timeZone);
    try {
      // The account is read once: its id names the device.
      const user = this.user ?? parseUser(await client.user());
      if (!user.id) {
        throw new WakapiError(ERROR_KINDS.NOT_WAKAPI, 'The account has no id');
      }
      const raw = await client.summaries(days.start, days.today, this.timeZone);
      if (client !== this.client) {
        // The configuration changed during the reading: another account is being read.
        return;
      }
      this.user = user;
      this.summary = summarize(parseSummaries(raw, days.start), days);
      this.reading = days;
      this.readAt = now;
      this.recovered(now);
    } catch (err) {
      if (client !== this.client) {
        return;
      }
      this.failed(err, now);
    }
    if (this.readAt !== 0) {
      await this.publishDevices();
      if (!this.error) {
        await this.publishStates();
        await this.fireEvents(now);
      }
    }
    await this.publishTransports();
    await this.publishConnectionStatus();
    this.refreshWidget();
  }

  recovered(now) {
    if (this.downSince !== null) {
      const lasted = Math.round((now - this.downSince) / 60_000);
      this.resolved('read', `${this.host} answers again after ${lasted} min`);
    }
    if (!this.connectedLogged) {
      this.connectedLogged = true;
      logger.info(`Connected to ${this.host} as ${this.user.name}`);
    }
    this.error = null;
    this.downSince = null;
  }

  failed(err, now) {
    const kind = err instanceof WakapiError ? err.kind : ERROR_KINDS.NETWORK;
    this.error = { kind, message: err.message, retryAfterMs: err.retryAfterMs };
    this.downSince ??= now;
    this.problem('read', `${this.host}: ${err.message}`, 'error');
  }

  // --- Publishing to Gladys --------------------------------------------------

  devices() {
    return this.user
      ? [buildAccount(this.gladys, { server: this.config.server, user: this.user }, this.language)]
      : [];
  }

  async publishDevices() {
    const devices = this.devices();
    const signature = JSON.stringify(devices);
    if (signature === this.devicesSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.devicesSignature = signature;
      this.resolved('devices');
    } catch (err) {
      this.problem('devices', `Discovered devices refused: ${err.message}`);
    }
  }

  /** "Search" in the Discovery tab. */
  async rediscover() {
    this.devicesSignature = null;
    await this.poll();
  }

  /** The user added the device: the states sent before were dropped by Gladys. */
  async onDeviceCreated(device) {
    this.gladys.forgetPublishedStates?.(device?.external_id);
    if (!this.error && this.readAt !== 0) {
      await this.publishStates();
    }
    this.gladys.requestWidgetRefresh(WIDGET_KEY);
  }

  async publishStates() {
    try {
      // Only the changes, and every value again after `heartbeatMs`.
      await this.gladys.publishChangedStates(
        featureStates(
          this.gladys,
          { server: this.config.server, user: this.user, summary: this.summary },
          this.language,
        ),
        { heartbeat: this.timings.heartbeatMs },
      );
      this.resolved('states');
    } catch (err) {
      this.problem('states', `States refused: ${err.message}`);
    }
  }

  async publishTransports() {
    if (!this.user) {
      return;
    }
    const transport = this.error
      ? DEVICE_TRANSPORTS.UNREACHABLE
      : isCloud(this.config.server.url)
        ? DEVICE_TRANSPORTS.CLOUD
        : DEVICE_TRANSPORTS.LOCAL;
    const externalId = accountIds(this.gladys, this.config.server, this.user.id).device;
    const key = `${externalId}|${transport}`;
    if (key === this.transport) {
      return;
    }
    try {
      await this.gladys.publishTransports([{ external_id: externalId, transport }]);
      this.transport = key;
      this.resolved('transports');
    } catch (err) {
      this.problem('transports', `Transports refused: ${err.message}`);
    }
  }

  connectionStatus() {
    if (!this.config.server) {
      return {
        connected: false,
        message: this.config.urlTyped ? CONNECTION_TEXT.invalidUrl : CONNECTION_TEXT.noUrl,
      };
    }
    if (!this.config.apiKey) {
      return { connected: false, message: CONNECTION_TEXT.noKey };
    }
    if (this.error) {
      return { connected: false, message: ERROR_TEXT[this.error.kind] };
    }
    return { connected: true };
  }

  async publishConnectionStatus() {
    const status = this.connectionStatus();
    const key = JSON.stringify(status);
    if (key === this.connection) {
      return;
    }
    try {
      // The message is the { en, fr, de, es } object: the core translates it.
      await this.gladys.setConnectionStatus(status.connected, status.message);
      this.connection = key;
      this.resolved('connection-status');
    } catch (err) {
      this.problem('connection-status', `Connection status refused: ${err.message}`);
    }
  }

  refreshWidget() {
    const signature = JSON.stringify([
      this.error?.kind ?? null,
      this.user,
      this.summary,
      this.config.goalMinutes,
    ]);
    if (signature !== this.widgetSignature) {
      this.widgetSignature = signature;
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    }
  }

  // --- Scene events ----------------------------------------------------------

  /**
   * Compare this reading with the previous one (persisted under /data, so a
   * restart neither repeats nor loses an event): the first coding of the day,
   * the daily goal reached. An event Gladys refuses is tried again at the next
   * reading.
   */
  async fireEvents(now) {
    const scope = `${this.config.server.api}|${this.user.id}`;
    const { today } = this.summary;
    const goal = this.config.goalMinutes;
    const active = today.seconds > 0;
    const reached = today.seconds >= goal * 60;
    const current = { scope, readAt: now, day: this.reading.today, goal, active, reached };
    const saved = this.saved;
    if (saved.scope !== scope || !Number.isFinite(saved.readAt)) {
      // First reading of this account: what is already there is not news.
      this.save(current);
      return;
    }
    const sameDay = saved.day === current.day;
    const next = { ...current };
    const project = today.projects[0]?.name ?? '';
    const language = today.languages[0]?.name ?? '';

    if (active && !(sameDay && saved.active)) {
      const data = { project, language, minutes: minutes(today.seconds) };
      if (!(await this.fire(TRIGGERS.FIRST_ACTIVITY, data))) {
        next.active = false;
      }
    }

    // Announced once a day per goal: a goal changed in the configuration
    // announces the new one when it is reached.
    if (reached && !(sameDay && saved.goal === goal && saved.reached)) {
      const data = { minutes: minutes(today.seconds), goal, project, language };
      if (!(await this.fire(TRIGGERS.DAILY_GOAL_REACHED, data))) {
        next.reached = false;
      }
    }
    this.save(next);
  }

  save(state) {
    this.saved = state;
    this.store.save(state);
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      this.resolved('scene-event');
      return true;
    } catch (err) {
      this.problem('scene-event', `Scene event ${key} refused: ${err.message}`);
      return false;
    }
  }

  // --- Commands --------------------------------------------------------------

  /** Read now, and fail with the reason in the user's words. */
  async readNow() {
    if (!this.client) {
      throw new Error(pick(this.connectionStatus().message, this.language));
    }
    await this.poll();
    if (this.error) {
      throw new Error(pick(ERROR_TEXT[this.error.kind], this.language));
    }
    if (!this.summary) {
      // The configuration changed during the reading.
      throw new Error(pick(ACTION_TEXT.noAnswer, this.language));
    }
  }

  /** Today's coding time as a sentence, with the figures as scene variables. */
  async today() {
    await this.readNow();
    const { today, weekSeconds } = this.summary;
    const texts = TODAY_TEXT[this.language] ?? TODAY_TEXT.en;
    const goal = formatDuration(this.config.goalMinutes * 60);
    const project = today.projects[0]?.name ?? '';
    const language = today.languages[0]?.name ?? '';
    const text =
      (today.seconds === 0
        ? texts.nothing(goal)
        : texts.today(formatDuration(today.seconds), goal, project || '?', language || '?')) +
      texts.week(formatDuration(weekSeconds));
    return {
      text: text.slice(0, 1000),
      minutes_today: minutes(today.seconds),
      minutes_week: minutes(weekSeconds),
      goal_reached: today.seconds >= this.config.goalMinutes * 60,
      project,
      language,
    };
  }

  /** The "Test the connection" action: read now, report. */
  async testConnection() {
    if (this.client) {
      await this.poll();
    }
    const status = this.connectionStatus();
    if (!status.connected) {
      throw new Error(REPORT_TEXT[this.language].failed(pick(status.message, this.language)));
    }
    if (!this.summary) {
      throw new Error(pick(ACTION_TEXT.noAnswer, this.language));
    }
    const time = formatDuration(this.summary.today.seconds);
    return allLanguages((language) => REPORT_TEXT[language].ok(this.user.name, time));
  }
}
