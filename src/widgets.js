// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `coding_time`.
//
// The use case: the office tablet shows how long you coded today, against
// your daily goal, the week so far and the projects of the day.
//
// Budget (8 components, 2 texts): today and this week as tiles, a gauge of
// the daily goal, a bar chart of the last 7 days, a status list of today's
// projects; a caption when the server stopped answering. Each block but
// "today" has a setting to hide it. The figures are values, not bound to
// device features, so the widget works before the device is added.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY } from './hub.js';
import { CONNECTION_TEXT, formatDuration, formatShort, pick } from './texts.js';
import { minutes } from './wakapi/model.js';

const MAX_PROJECTS = 5;

export const TEXT = {
  noAnswer: {
    en: 'The server does not answer: see the Configuration screen of the integration.',
    fr: "Le serveur ne répond pas : voir l'écran Configuration de l'intégration.",
    de: 'Der Server antwortet nicht: Sieh dir die Konfiguration der Integration an.',
    es: 'El servidor no responde: consulte la pantalla de configuración de la integración.',
  },
  nothing: {
    en: 'No coding yet today.',
    fr: "Pas encore de code aujourd'hui.",
    de: 'Heute noch keine Programmierzeit.',
    es: 'Todavía no hay código hoy.',
  },
  stale: {
    en: 'The server does not answer: last known figures.',
    fr: 'Le serveur ne répond pas : derniers chiffres connus.',
    de: 'Der Server antwortet nicht: zuletzt bekannte Werte.',
    es: 'El servidor no responde: últimas cifras conocidas.',
  },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  week: { en: 'This week', fr: 'Cette semaine', de: 'Diese Woche', es: 'Esta semana' },
  goal: { en: 'Daily goal', fr: 'Objectif du jour', de: 'Tagesziel', es: 'Objetivo diario' },
  series: {
    en: 'Coding time',
    fr: 'Temps de code',
    de: 'Programmierzeit',
    es: 'Tiempo de código',
  },
  chart: {
    en: 'Last 7 days',
    fr: '7 derniers jours',
    de: 'Letzte 7 Tage',
    es: 'Últimos 7 días',
  },
};

const t = (text, language) => pick(text, language);
const fit = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
// A setting left untouched (or a widget added before it existed) shows the block.
const shown = (value) => value !== false && value !== 'false';

function message(text, language) {
  return {
    ttl_seconds: 300,
    components: [{ type: 'text', variant: 'body', text: t(text, language) }],
  };
}

async function get(hub, { settings = {}, language = 'en' }) {
  if (!hub.client) {
    return message(hub.connectionStatus().message ?? CONNECTION_TEXT.noKey, language);
  }
  if (!hub.summary) {
    return message(TEXT.noAnswer, language);
  }
  const { today, weekSeconds, days } = hub.summary;
  const goalSeconds = hub.config.goalMinutes * 60;
  const reached = today.seconds >= goalSeconds;
  const components = [];
  if (hub.error) {
    components.push({ type: 'text', variant: 'caption', text: t(TEXT.stale, language) });
  }
  components.push({
    type: 'value',
    value: formatShort(today.seconds),
    label: t(TEXT.today, language),
    icon: 'clock',
    color: reached ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.NEUTRAL,
  });
  if (shown(settings.show_week)) {
    components.push({
      type: 'value',
      value: formatShort(weekSeconds),
      label: t(TEXT.week, language),
      icon: 'calendar',
      color: WIDGET_COLORS.NEUTRAL,
    });
  }
  if (shown(settings.show_goal)) {
    components.push({
      type: 'gauge',
      value: Math.min(100, Math.round((today.seconds / goalSeconds) * 100)),
      min: 0,
      max: 100,
      unit: '%',
      label: fit(`${t(TEXT.goal, language)} ${formatDuration(goalSeconds)}`, 24),
      color: reached ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.PRIMARY,
    });
  }
  if (shown(settings.show_chart)) {
    components.push({
      type: 'chart',
      chart_type: 'bar',
      title: t(TEXT.chart, language),
      unit: 'min',
      series: [
        {
          name: t(TEXT.series, language),
          // Noon UTC: the bar stays on its day whatever the browser's zone.
          points: days.map((day) => ({ t: `${day.date}T12:00:00.000Z`, v: minutes(day.seconds) })),
        },
      ],
    });
  }
  if (shown(settings.show_projects)) {
    if (today.projects.length === 0) {
      components.push({ type: 'text', variant: 'body', text: t(TEXT.nothing, language) });
    } else {
      components.push({
        type: 'status',
        items: today.projects.slice(0, MAX_PROJECTS).map((project, index) => ({
          label: fit(project.name, 40),
          icon: 'folder',
          value: formatDuration(project.seconds),
          color: index === 0 ? WIDGET_COLORS.PRIMARY : WIDGET_COLORS.NEUTRAL,
        })),
      });
    }
  }
  return { ttl_seconds: 300, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get },
};
