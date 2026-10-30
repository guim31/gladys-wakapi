// -----------------------------------------------------------------------------
// Texts produced by the container, in the four languages of Gladys (en, fr,
// de with "du", es with "usted"). A device integration does not receive the
// user's language: the configuration has a `language` field.
// -----------------------------------------------------------------------------

import { ERROR_KINDS } from './wakapi/client.js';

/** The text in `language`, or the English one. */
export const pick = (text, language) => text?.[language] ?? text?.en ?? '';

/** A multi-language object built from one function. */
export const allLanguages = (build) =>
  Object.fromEntries(['en', 'fr', 'de', 'es'].map((language) => [language, build(language)]));

export const INIT_FAILED = {
  en: 'The integration could not start: see its logs.',
  fr: "L'intégration n'a pas pu démarrer : voir ses journaux.",
  de: 'Die Integration konnte nicht starten: Sieh dir ihre Logs an.',
  es: 'La integración no ha podido arrancar: consulte sus registros.',
};

export const CONNECTION_TEXT = {
  noUrl: {
    en: 'Enter the address of your Wakapi server, or wakatime.com, in the configuration.',
    fr: "Saisissez l'adresse de votre serveur Wakapi, ou wakatime.com, dans la configuration.",
    de: 'Gib die Adresse deines Wakapi-Servers oder wakatime.com in der Konfiguration ein.',
    es: 'Introduzca la dirección de su servidor Wakapi, o wakatime.com, en la configuración.',
  },
  invalidUrl: {
    en: 'The server address is not valid (example: http://192.168.1.20:3000).',
    fr: "L'adresse du serveur n'est pas valide (exemple : http://192.168.1.20:3000).",
    de: 'Die Serveradresse ist ungültig (Beispiel: http://192.168.1.20:3000).',
    es: 'La dirección del servidor no es válida (ejemplo: http://192.168.1.20:3000).',
  },
  noKey: {
    en: 'Enter the API key of your account in the configuration.',
    fr: "Saisissez la clé d'API de votre compte dans la configuration.",
    de: 'Gib den API-Schlüssel deines Kontos in der Konfiguration ein.',
    es: 'Introduzca la clave de API de su cuenta en la configuración.',
  },
};

export const ERROR_TEXT = {
  [ERROR_KINDS.AUTH]: {
    en: 'API key refused: copy it again from the settings of your account.',
    fr: "Clé d'API refusée : recopiez-la depuis les paramètres de votre compte.",
    de: 'API-Schlüssel abgelehnt: Kopiere ihn erneut aus deinen Kontoeinstellungen.',
    es: 'Clave de API rechazada: cópiela de nuevo desde los ajustes de su cuenta.',
  },
  [ERROR_KINDS.NOT_WAKAPI]: {
    en: 'This address does not answer like Wakapi or WakaTime: check it.',
    fr: 'Cette adresse ne répond pas comme Wakapi ou WakaTime : vérifiez-la.',
    de: 'Diese Adresse antwortet nicht wie Wakapi oder WakaTime: Prüfe sie.',
    es: 'Esta dirección no responde como Wakapi o WakaTime: compruébela.',
  },
  [ERROR_KINDS.REDIRECT]: {
    en: 'The server redirects: enter its final address (https?).',
    fr: 'Le serveur redirige : saisissez son adresse finale (https ?).',
    de: 'Der Server leitet um: Gib seine endgültige Adresse ein (https?).',
    es: 'El servidor redirige: introduzca su dirección final (¿https?).',
  },
  [ERROR_KINDS.RATE_LIMIT]: {
    en: 'Too many requests: the server asks to wait.',
    fr: 'Trop de requêtes : le serveur demande de patienter.',
    de: 'Zu viele Anfragen: Der Server bittet zu warten.',
    es: 'Demasiadas solicitudes: el servidor pide esperar.',
  },
  [ERROR_KINDS.SERVER]: {
    en: 'The server answers with an error: try again later.',
    fr: 'Le serveur répond par une erreur : réessayez plus tard.',
    de: 'Der Server antwortet mit einem Fehler: Versuch es später erneut.',
    es: 'El servidor responde con un error: inténtelo más tarde.',
  },
  [ERROR_KINDS.NETWORK]: {
    en: 'The server does not answer: check the address and the network.',
    fr: "Le serveur ne répond pas : vérifiez l'adresse et le réseau.",
    de: 'Der Server antwortet nicht: Prüfe Adresse und Netzwerk.',
    es: 'El servidor no responde: compruebe la dirección y la red.',
  },
  [ERROR_KINDS.CERTIFICATE]: {
    en: 'Certificate refused: tick "Accept a self-signed certificate".',
    fr: 'Certificat refusé : cochez « Accepter un certificat auto-signé ».',
    de: 'Zertifikat abgelehnt: Aktiviere „Selbstsigniertes Zertifikat akzeptieren“.',
    es: 'Certificado rechazado: marque «Aceptar un certificado autofirmado».',
  },
};

export const ACTION_TEXT = {
  notConfigured: CONNECTION_TEXT.noKey,
  noAnswer: {
    en: 'The server has not answered yet: try again in a moment.',
    fr: "Le serveur n'a pas encore répondu : réessayez dans un instant.",
    de: 'Der Server hat noch nicht geantwortet: Versuch es gleich noch einmal.',
    es: 'El servidor aún no ha respondido: inténtelo de nuevo en un momento.',
  },
};

// Shown in a text feature when nothing was coded today (never an empty text).
export const NONE = { en: 'None', fr: 'Aucun', de: 'Keins', es: 'Ninguno' };

/**
 * A duration, for a sentence: "1 h 40 min", "25 min", "0 min".
 * The same in the four languages (h and min are understood everywhere).
 */
export function formatDuration(totalSeconds) {
  const total = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}

/** A duration for a widget tile (12 characters at most): "1 h 40", "25 min". */
export function formatShort(totalSeconds) {
  const total = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

export const REPORT_TEXT = {
  en: {
    ok: (name, today) => `Connected as ${name}: ${today} of coding today.`,
    failed: (reason) => `Connection failed: ${reason}`,
  },
  fr: {
    ok: (name, today) => `Connecté en tant que ${name} : ${today} de code aujourd'hui.`,
    failed: (reason) => `Échec de la connexion : ${reason}`,
  },
  de: {
    ok: (name, today) => `Verbunden als ${name}: heute ${today} Programmierzeit.`,
    failed: (reason) => `Verbindung fehlgeschlagen: ${reason}`,
  },
  es: {
    ok: (name, today) => `Conectado como ${name}: ${today} de código hoy.`,
    failed: (reason) => `Error de conexión: ${reason}`,
  },
};

// The "Read today's coding time" scene action, for a message or a voice.
export const TODAY_TEXT = {
  en: {
    nothing: (goal) => `No coding yet today (goal ${goal}).`,
    today: (time, goal, project, language) =>
      `${time} of coding today (goal ${goal}), mostly on ${project} in ${language}.`,
    week: (time) => ` This week: ${time}.`,
  },
  fr: {
    nothing: (goal) => `Pas encore de code aujourd'hui (objectif ${goal}).`,
    today: (time, goal, project, language) =>
      `${time} de code aujourd'hui (objectif ${goal}), surtout sur ${project} en ${language}.`,
    week: (time) => ` Cette semaine : ${time}.`,
  },
  de: {
    nothing: (goal) => `Heute noch keine Programmierzeit (Ziel ${goal}).`,
    today: (time, goal, project, language) =>
      `Heute ${time} Programmierzeit (Ziel ${goal}), vor allem an ${project} in ${language}.`,
    week: (time) => ` Diese Woche: ${time}.`,
  },
  es: {
    nothing: (goal) => `Todavía no hay código hoy (objetivo ${goal}).`,
    today: (time, goal, project, language) =>
      `${time} de código hoy (objetivo ${goal}), sobre todo en ${project} con ${language}.`,
    week: (time) => ` Esta semana: ${time}.`,
  },
};
