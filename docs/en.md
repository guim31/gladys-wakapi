# Wakapi

Your coding time in Gladys, from [Wakapi](https://wakapi.dev) (the
self-hosted, WakaTime-compatible coding statistics server) or from
[WakaTime](https://wakatime.com) itself: today, this week, your daily
average, the main project and language of the day, a daily goal for your
scenes and a dashboard widget.

## What you get

One device per account, named after the service and the account
(`Wakapi alice`), with five features:

- **Coding time today** (minutes);
- **Coding time this week** (minutes, since Monday);
- **Daily average (7 days)** (minutes, over the days you coded in the last 7);
- **Main project today**;
- **Main language today**.

"Today" is the day in the time zone of Gladys. The figures come from the
editor plugins that send your activity to Wakapi or WakaTime: the integration
only reads them.

## Before you start

- A Wakapi server (your own, in Docker for instance, or the public
  wakapi.dev), or a WakaTime account, already receiving your activity.
- The **API key** of your account: in Wakapi, **Settings → API key**; on
  WakaTime, **Settings → API Key** (`https://wakatime.com/settings/api-key`).

## Configuration

1. Open the **Configuration** tab of the integration.
2. **Server address**: the address of your Wakapi, as you open it in your
   browser (`http://192.168.1.20:3000`, `https://wakapi.example.org`, with
   its path if it is served under one), `wakapi.dev`, or `wakatime.com`.
3. **API key**: paste the key of your account.
4. Options: the **daily goal** in minutes (2 hours by default), the
   **refresh interval** (5 minutes by default, 30 at most), the **language of
   the texts** (feature names, set when the device is added, and messages).
   **Accept a self-signed certificate** is only for a Wakapi served in HTTPS
   with its own certificate.
5. Save, then add the device from the **Discovery** tab.

The **Test the connection** action reads the server at once and tells you
which account it found and today's coding time. The "Prefer the local
connection" switch Gladys adds has no effect here: there is one address.

## Scenes

Triggers, in the **Integrations** category of the scene editor (Gladys 5.1
or later):

- **First coding of the day**: the first coding time of the day appears on
  the account. Variables: project, language, minutes today.
- **Daily coding goal reached**: today's coding time reached the goal set in
  the configuration, once a day. Variables: minutes today, goal, main
  project, main language.

Action:

- **Read today's coding time**: today's coding time and the week as a
  sentence, for a message or a voice announcement ("1 h 40 min of coding
  today (goal 2 h), mostly on my-project in JavaScript. This week: 5 h 53
  min."), with the figures as variables for the next actions.

A threshold other than the goal ("more than 6 hours today") is a scene
condition on the **Coding time today** feature.

## Dashboard

The **Coding time** widget shows today's time, the week, a gauge of the
daily goal, a bar chart of the last 7 days and today's projects. Each block
but "today" can be hidden in the widget settings. It works before the device
is added.

## Limits

- Read-only: the integration never sends anything to Wakapi or WakaTime.
- The days are asked in the time zone of Gladys. Wakapi counts them in the
  time zone of your account (its settings): keep both the same.
- The figures follow the server, so they appear once your editor plugin sent
  its heartbeats (a few minutes) and the next reading happened.
- WakaTime: the free plan keeps two weeks of history, enough for the last 7
  days read here. Each reading is two requests at most (the account once,
  then the summaries), every 5 minutes at the most, far below the limits
  WakaTime documents. The integration was tested against a real Wakapi
  (official Docker image) with real heartbeats, not against a WakaTime
  account: **feedback welcome**.

## Troubleshooting

- **API key refused**: copy the key again from the settings of your account.
- **This address does not answer like Wakapi or WakaTime**: check the
  address; a Wakapi behind a reverse proxy under a path needs that path.
- **The server redirects**: enter its final address (often `https://`).
- **Certificate refused**: tick **Accept a self-signed certificate**.
- The logs of the integration (Integrations → Wakapi → Logs) say more;
  `LOG_LEVEL=debug` shows every reading.

## Feedback

Feedback welcome, especially from WakaTime users: open an issue on
<https://github.com/guim31/gladys-wakapi/issues> or write on the Gladys forum.
