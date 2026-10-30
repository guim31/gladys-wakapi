# Wakapi for Gladys Assistant

Your coding time in [Gladys Assistant](https://gladysassistant.com), from
[Wakapi](https://github.com/muety/wakapi) (self-hosted, WakaTime-compatible
coding statistics) or from [WakaTime](https://wakatime.com) itself: today,
this week, the daily average, the main project and language of the day, a
daily goal for scenes and a dashboard widget.

## Features

- One device per account (`Wakapi <name>` or `WakaTime <name>`): coding time
  today, this week (since Monday) and the daily average over the last 7 days
  (minutes), main project and main language of the day (texts).
- Scene triggers: **First coding of the day**, **Daily coding goal reached**
  (the goal is set in the configuration).
- Scene action: **Read today's coding time**, a sentence for a message or a
  voice announcement, with the figures as variables.
- Dashboard widget **Coding time**: today, the week, a gauge of the daily
  goal, a bar chart of the last 7 days and today's projects; every block but
  "today" can be hidden.
- Texts in English, French, German and Spanish.

## Requirements

- Gladys Assistant 5.1.0 or later.
- A Wakapi server (self-hosted or wakapi.dev) or a WakaTime account, and the
  API key of the account.

## Installation

1. In Gladys, open **Integrations** → **Install from GitHub** and enter the
   address of this repository: `https://github.com/guim31/gladys-wakapi`
   (or install **Wakapi** from the catalog once it is listed).
2. In **Configuration**, enter the address of your Wakapi (or `wakatime.com`)
   and the API key. Save, then click **Test the connection**.
3. Open the **Discover** tab and add the device.

The user guide is in [`docs/en.md`](docs/en.md) (also in
[French](docs/fr.md), [German](docs/de.md) and [Spanish](docs/es.md)); Gladys
links it from the Configuration screen.

## How it works

The integration reads the WakaTime API, which Wakapi serves under
`/api/compat/wakatime/v1` and WakaTime under `api.wakatime.com/api/v1`, with
the API key in HTTP Basic: the account once (`users/current`), then the
summaries of the last 7 days (`users/current/summaries?start&end`) every 5 to
30 minutes, and just after midnight. It publishes only the values that
changed, fires the scene events once a day (remembered under `/data`, so a
restart neither repeats nor misses them) and never writes anything to the
server.

## Checked on a real Wakapi, and what was not

- Checked: the client, the error cases (wrong key, wrong path) and the whole
  integration, in the locked-down container of the Gladys sandbox, against the
  official `ghcr.io/muety/wakapi` image fed with real heartbeats. The test
  fixtures are those answers.
- Not checked: a WakaTime account (same API, documented by WakaTime), and a
  real Gladys instance. Feedback welcome.

## Limitations

- Read-only; one account per installation.
- The days are asked in the time zone of Gladys; Wakapi counts them in the
  time zone of the account: keep both the same.
- WakaTime's free plan keeps two weeks of history, enough for the 7 days read.

## Development

```bash
npm ci
npm run format:check
npm run lint
npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests use the fake Gladys of the SDK (`@gladysassistant/integration-sdk/testing`)
and an in-memory Wakapi (`test/helpers/fakeWakapi.js`) built from real
answers. See [`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- [Wakapi](https://github.com/muety/wakapi) by Ferdinand Mütsch and its
  contributors (MIT): the integration only talks to its API; no code was
  copied. The cover uses the Wakapi logo from its repository
  (`static/assets/images/logo.svg`), to name the service.
- [WakaTime](https://wakatime.com), whose API Wakapi implements.
- The architecture and the conformity tests follow
  [gladys-habitica](https://github.com/guim31/gladys-habitica) and
  [gladys-wled](https://github.com/guim31/gladys-wled).

## Disclaimer

This project is not affiliated with, endorsed or sponsored by Wakapi or
WakaTime. The names and logos belong to their owners.

## License

Apache-2.0
