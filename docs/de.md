# Wakapi

Deine Programmierzeit in Gladys, aus [Wakapi](https://wakapi.dev) (dem
selbst gehosteten, WakaTime-kompatiblen Server für Programmierstatistiken)
oder direkt aus [WakaTime](https://wakatime.com): heute, diese Woche, dein
Tagesdurchschnitt, Hauptprojekt und Hauptsprache des Tages, ein Tagesziel
für deine Szenen und ein Dashboard-Widget.

## Was du bekommst

Ein Gerät pro Konto, benannt nach Dienst und Konto (`Wakapi alice`), mit
fünf Funktionen:

- **Programmierzeit heute** (Minuten);
- **Programmierzeit diese Woche** (Minuten, seit Montag);
- **Tagesdurchschnitt (7 Tage)** (Minuten, über die Tage mit
  Programmierzeit der letzten 7);
- **Hauptprojekt heute**;
- **Hauptsprache heute**.

„Heute“ ist der Tag in der Zeitzone von Gladys. Die Werte stammen von den
Editor-Plugins, die deine Aktivität an Wakapi oder WakaTime senden: Die
Integration liest sie nur.

## Bevor du anfängst

- Ein Wakapi-Server (dein eigener, zum Beispiel in Docker, oder das
  öffentliche wakapi.dev) oder ein WakaTime-Konto, das deine Aktivität
  bereits empfängt.
- Der **API-Schlüssel** deines Kontos: in Wakapi unter **Settings → API
  key**, bei WakaTime unter **Settings → API Key**
  (`https://wakatime.com/settings/api-key`).

## Konfiguration

1. Öffne den Reiter **Konfiguration** der Integration.
2. **Serveradresse**: die Adresse deines Wakapi, wie du sie im Browser
   öffnest (`http://192.168.1.20:3000`, `https://wakapi.example.org`, mit
   Pfad, falls es unter einem Pfad läuft), `wakapi.dev` oder `wakatime.com`.
3. **API-Schlüssel**: Füge den Schlüssel deines Kontos ein.
4. Optionen: das **Tagesziel** in Minuten (standardmäßig 2 Stunden), das
   **Aktualisierungsintervall** (standardmäßig 5 Minuten, höchstens 30), die
   **Sprache der Texte** (Funktionsnamen, beim Hinzufügen des Geräts
   festgelegt, und Meldungen). **Selbstsigniertes Zertifikat akzeptieren**
   ist nur für ein Wakapi, das per HTTPS mit eigenem Zertifikat läuft.
5. Speichere und füge das Gerät im Reiter **Entdecken** hinzu.

Die Aktion **Verbindung testen** liest den Server sofort und zeigt das
gefundene Konto und die heutige Programmierzeit. Der Schalter „Lokale
Verbindung bevorzugen“, den Gladys hinzufügt, hat hier keine Wirkung: Es
gibt nur eine Adresse.

## Szenen

Auslöser, in der Kategorie **Integrationen** des Szeneneditors (Gladys 5.1
oder neuer):

- **Erste Programmierzeit des Tages**: Die erste Programmierzeit des Tages
  erscheint im Konto. Variablen: Projekt, Sprache, Minuten heute.
- **Tägliches Programmierziel erreicht**: Die heutige Programmierzeit hat
  das in der Konfiguration eingestellte Ziel erreicht, einmal pro Tag.
  Variablen: Minuten heute, Ziel, Hauptprojekt, Hauptsprache.

Aktion:

- **Heutige Programmierzeit lesen**: die heutige Programmierzeit und die
  Woche als Satz, für eine Nachricht oder eine Sprachansage („Heute 1 h 40
  min Programmierzeit (Ziel 2 h), vor allem an mein-projekt in JavaScript.
  Diese Woche: 5 h 53 min.“), mit den Werten als Variablen für die
  folgenden Aktionen.

Eine andere Schwelle als das Ziel („mehr als 6 Stunden heute“) ist eine
Szenenbedingung auf der Funktion **Programmierzeit heute**.

## Dashboard

Das Widget **Programmierzeit** zeigt die heutige Zeit, die Woche, eine
Anzeige des Tagesziels, ein Balkendiagramm der letzten 7 Tage und die
heutigen Projekte. Jeder Block außer „heute“ lässt sich in den
Widget-Einstellungen ausblenden. Es funktioniert schon, bevor das Gerät
hinzugefügt ist.

## Grenzen

- Nur lesend: Die Integration sendet nie etwas an Wakapi oder WakaTime.
- Die Tage werden in der Zeitzone von Gladys abgefragt. Wakapi zählt sie in
  der Zeitzone deines Kontos (seine Einstellungen): Halte beide gleich.
- Die Werte folgen dem Server und erscheinen, sobald dein Editor-Plugin
  seine Heartbeats gesendet hat (einige Minuten) und die nächste Abfrage
  erfolgt ist.
- WakaTime: Der kostenlose Tarif behält zwei Wochen Verlauf, genug für die
  hier gelesenen letzten 7 Tage. Jede Abfrage sind höchstens zwei Anfragen
  (das Konto einmal, dann die Zusammenfassungen), höchstens alle 5 Minuten,
  weit unter den von WakaTime dokumentierten Grenzen. Die Integration wurde
  mit einem echten Wakapi (offizielles Docker-Image) und echten Heartbeats
  getestet, nicht mit einem WakaTime-Konto: Rückmeldungen sind willkommen.

## Fehlerbehebung

- **API-Schlüssel abgelehnt**: Kopiere den Schlüssel erneut aus deinen
  Kontoeinstellungen.
- **Diese Adresse antwortet nicht wie Wakapi oder WakaTime**: Prüfe die
  Adresse; ein Wakapi hinter einem Reverse-Proxy unter einem Pfad braucht
  diesen Pfad.
- **Der Server leitet um**: Gib seine endgültige Adresse ein (oft
  `https://`).
- **Zertifikat abgelehnt**: Aktiviere **Selbstsigniertes Zertifikat
  akzeptieren**.
- Die Logs der Integration (Integrationen → Wakapi → Logs) sagen mehr;
  `LOG_LEVEL=debug` zeigt jede Abfrage.

## Rückmeldungen

Rückmeldungen sind willkommen, vor allem von WakaTime-Nutzern: Eröffne ein
Issue auf <https://github.com/guim31/gladys-wakapi/issues> oder schreib im
Gladys-Forum.
