// -----------------------------------------------------------------------------
// Pure functions on the WakaTime API answers: the days of the reading (in the
// time zone of Gladys), the account and the summaries, reduced to what the
// device, the widget and the scene events need. No clock read here: `now` is
// always passed in.
// -----------------------------------------------------------------------------

// The summaries cover today and the six days before: the week since Monday
// and the daily average over the last 7 days, in one request.
export const DAYS = 7;

/** A valid IANA time zone, or UTC. */
export function resolveTimeZone(timeZone) {
  if (typeof timeZone === 'string' && timeZone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
      return timeZone;
    } catch {
      // Unknown zone: fall through.
    }
  }
  return 'UTC';
}

function parts(now, timeZone) {
  const values = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(now))) {
    values[type] = value;
  }
  return values;
}

/** The calendar date of `now` in `timeZone`, as YYYY-MM-DD. */
export function localDate(now, timeZone) {
  const { year, month, day } = parts(now, timeZone);
  return `${year}-${month}-${day}`;
}

/** Milliseconds until the next local midnight (to within a DST hour). */
export function msUntilNextDay(now, timeZone) {
  const { hour, minute, second } = parts(now, timeZone);
  const elapsed = (Number(hour) * 3600 + Number(minute) * 60 + Number(second)) * 1000;
  return Math.max(1000, 24 * 3600 * 1000 - elapsed - (now % 1000));
}

/** YYYY-MM-DD plus `days` (calendar arithmetic, no time zone involved). */
export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 for Monday … 6 for Sunday. */
export function weekdayOf(date) {
  const [year, month, day] = date.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** The days of a reading: `DAYS` dates ending today. */
export function readingDays(now, timeZone) {
  const today = localDate(now, timeZone);
  return { today, start: addDays(today, -(DAYS - 1)), monday: addDays(today, -weekdayOf(today)) };
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const seconds = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/** The account: `{ id, name }`; the id is stable (username on Wakapi, UUID on WakaTime). */
export function parseUser(json) {
  const data = json?.data ?? {};
  const id = text(data.id) || text(data.username);
  const name = text(data.display_name) || text(data.username) || text(data.full_name) || id;
  return { id, name };
}

function items(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => ({ name: text(item?.name), seconds: seconds(item?.total_seconds) }))
    .filter((item) => item.name && item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * The summaries, one per day, aligned on the dates asked: the answer holds one
 * entry per day in order (the `range` of each entry differs between WakaTime,
 * in UTC, and Wakapi, in the account's zone, so the order is what counts).
 * @param {object} json the `summaries` answer
 * @param {string} start first date asked
 * @param {number} [days]
 * @returns {{ date: string, seconds: number, projects: object[], languages: object[] }[]}
 */
export function parseSummaries(json, start, days = DAYS) {
  const list = Array.isArray(json?.data) ? json.data.slice(-days) : [];
  const offset = days - list.length;
  return Array.from({ length: days }, (_, index) => {
    const entry = index >= offset ? list[index - offset] : null;
    return {
      date: addDays(start, index),
      seconds: seconds(entry?.grand_total?.total_seconds),
      projects: items(entry?.projects),
      languages: items(entry?.languages),
    };
  });
}

/**
 * What the device, the widget and the scene events show.
 * @param {ReturnType<typeof parseSummaries>} days
 * @param {{ today: string, monday: string }} reading
 */
export function summarize(days, { today, monday }) {
  const current = days.find((day) => day.date === today) ?? {
    date: today,
    seconds: 0,
    projects: [],
    languages: [],
  };
  const week = days.filter((day) => day.date >= monday && day.date <= today);
  const active = days.filter((day) => day.seconds > 0);
  const total = active.reduce((sum, day) => sum + day.seconds, 0);
  return {
    today: current,
    weekSeconds: week.reduce((sum, day) => sum + day.seconds, 0),
    // Over the days with coding, as WakaTime counts its daily average.
    averageSeconds: active.length === 0 ? 0 : total / active.length,
    days,
  };
}

/** Whole minutes, rounded as WakaTime and Wakapi round their texts. */
export const minutes = (value) => Math.round(value / 60);
