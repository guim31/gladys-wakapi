// -----------------------------------------------------------------------------
// Gladys device: one "Wakapi <name>" (or "WakaTime <name>") device for the
// account.
//
// Identity: `account` / `<server host>-<account id>`, the id the server gives
// the account (the username on Wakapi, a UUID on WakaTime, never the display
// name): renaming the account keeps its device, the same name on two servers
// makes two devices.
//
// Features (category/type couples of the core table, test/gladys-rules.test.js):
//   - coding time today, this week (since Monday), daily average over the
//     last 7 days (days with coding only): duration/integer, in minutes;
//   - main project and main language of the day: text/text.
//
// The device is published with should_poll: false: the integration reads the
// server on its own timer (src/hub.js), every 5 to 30 minutes.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { NONE, pick } from './texts.js';
import { minutes } from './wakapi/model.js';

export const ACCOUNT_TYPE = 'account';

// Suffixes of the feature external ids: permanent once published.
export const FEATURE_KEYS = Object.freeze({
  TODAY: 'today',
  WEEK: 'week',
  DAILY_AVERAGE: 'daily_average',
  TOP_PROJECT: 'top_project',
  TOP_LANGUAGE: 'top_language',
});

// Feature names, in the language chosen in the configuration (Gladys does not
// tell a device integration the user's language). Frozen at creation in Gladys.
export const NAMES = {
  en: {
    [FEATURE_KEYS.TODAY]: 'Coding time today',
    [FEATURE_KEYS.WEEK]: 'Coding time this week',
    [FEATURE_KEYS.DAILY_AVERAGE]: 'Daily average (7 days)',
    [FEATURE_KEYS.TOP_PROJECT]: 'Main project today',
    [FEATURE_KEYS.TOP_LANGUAGE]: 'Main language today',
  },
  fr: {
    [FEATURE_KEYS.TODAY]: "Temps de code aujourd'hui",
    [FEATURE_KEYS.WEEK]: 'Temps de code cette semaine',
    [FEATURE_KEYS.DAILY_AVERAGE]: 'Moyenne par jour (7 jours)',
    [FEATURE_KEYS.TOP_PROJECT]: 'Projet principal du jour',
    [FEATURE_KEYS.TOP_LANGUAGE]: 'Langage principal du jour',
  },
  de: {
    [FEATURE_KEYS.TODAY]: 'Programmierzeit heute',
    [FEATURE_KEYS.WEEK]: 'Programmierzeit diese Woche',
    [FEATURE_KEYS.DAILY_AVERAGE]: 'Tagesdurchschnitt (7 Tage)',
    [FEATURE_KEYS.TOP_PROJECT]: 'Hauptprojekt heute',
    [FEATURE_KEYS.TOP_LANGUAGE]: 'Hauptsprache heute',
  },
  es: {
    [FEATURE_KEYS.TODAY]: 'Tiempo de código hoy',
    [FEATURE_KEYS.WEEK]: 'Tiempo de código esta semana',
    [FEATURE_KEYS.DAILY_AVERAGE]: 'Media diaria (7 días)',
    [FEATURE_KEYS.TOP_PROJECT]: 'Proyecto principal de hoy',
    [FEATURE_KEYS.TOP_LANGUAGE]: 'Lenguaje principal de hoy',
  },
};

const duration = (key, max, value) => ({
  key,
  definition: {
    category: DEVICE_FEATURE_CATEGORIES.DURATION,
    type: DEVICE_FEATURE_TYPES.DURATION.INTEGER,
    unit: DEVICE_FEATURE_UNITS.MINUTES,
    read_only: true,
    has_feedback: false,
    keep_history: true,
    // Display bounds (the core never applies them on write).
    min: 0,
    max,
  },
  value: (reading) => Math.min(max, minutes(value(reading))),
});

const label = (key, value) => ({
  key,
  definition: {
    category: DEVICE_FEATURE_CATEGORIES.TEXT,
    type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
    read_only: true,
    has_feedback: false,
    keep_history: true,
    // NOT NULL in the core, even for a text (422 on "Add to Gladys" without them).
    min: 0,
    max: 0,
  },
  isText: true,
  // Never an empty text: Gladys ignores it.
  value: (reading, language) => (value(reading) || pick(NONE, language)).slice(0, 100),
});

// Order = display order in Gladys.
const FEATURES = [
  duration(FEATURE_KEYS.TODAY, 1440, ({ summary }) => summary.today.seconds),
  duration(FEATURE_KEYS.WEEK, 7 * 1440, ({ summary }) => summary.weekSeconds),
  duration(FEATURE_KEYS.DAILY_AVERAGE, 1440, ({ summary }) => summary.averageSeconds),
  label(FEATURE_KEYS.TOP_PROJECT, ({ summary }) => summary.today.projects[0]?.name),
  label(FEATURE_KEYS.TOP_LANGUAGE, ({ summary }) => summary.today.languages[0]?.name),
];

/** The platform id: the server host and the account id, in the characters ids allow. */
export const platformId = (server, userId) =>
  `${new URL(server.url).host}-${userId}`.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');

export const accountIds = (gladys, server, userId) =>
  gladys.externalIds(ACCOUNT_TYPE, platformId(server, userId));

const SERVICE_NAMES = { wakapi: 'Wakapi', wakatime: 'WakaTime' };

export const accountName = (server, user) =>
  `${SERVICE_NAMES[server.service]} ${user.name}`.slice(0, 60);

export function buildAccount(gladys, { server, user }, language = 'fr') {
  const ids = accountIds(gladys, server, user.id);
  const names = NAMES[language] ?? NAMES.en;
  return {
    name: accountName(server, user),
    external_id: ids.device,
    should_poll: false,
    features: FEATURES.map(({ key, definition }) => ({
      ...definition,
      name: names[key],
      external_id: ids.feature(key),
    })),
  };
}

/**
 * The states of every feature, in the `publishStates` format.
 * @param {{ server: object, user: object, summary: object }} reading
 */
export function featureStates(gladys, reading, language = 'fr') {
  const ids = accountIds(gladys, reading.server, reading.user.id);
  // A text feature receives `{ text }`, the others `{ state }`.
  return FEATURES.map(({ key, value, isText }) => ({
    device_feature_external_id: ids.feature(key),
    [isText ? 'text' : 'state']: value(reading, language),
  }));
}
