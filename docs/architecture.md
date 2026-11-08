# Architektur von web-watch

## Zweck und Systemgrenze

`web-watch` ist ein TypeScript-basierter ioBroker-Adapter. Er führt in einem konfigurierbaren Zeitplan eine Websuche über SerpAPI aus und kann deren Ergebnis anschließend mit der Google Gemini API verarbeiten. Beide externen Dienste lassen sich unabhängig voneinander aktivieren. Der Adapter läuft als ioBroker-Daemon und veröffentlicht Resultate als lesbare ioBroker-States.

Die wesentlichen Laufzeitabhängigkeiten sind `@iobroker/adapter-core`, `cron`, `serpapi` und `@google/genai`. Der Adapter selbst enthält keine Webserver- oder Frontend-Laufzeit.

## Bausteine

```mermaid
flowchart TD
	Config[ioBroker-Instanzkonfiguration] --> Main[src/main.ts: WebWatch]
	Main --> Cron[cron: geplanter Aufruf]
	Cron --> Run[WebWatch.Do()]
	Run --> Search[src/lib/serpapi.ts: serpapiIfc]
	Search --> SerpAPI[SerpAPI / Google-Suche]
	Search --> SearchState[ioBroker-State serpapi.result]
	Search -->|Suchantwort als JSON| Gemini[src/lib/genai.ts: genaiIfc]
	Run -->|Suchantwort oder null| Gemini
	Gemini --> Google[Google Gemini API]
	Gemini --> GeminiState[ioBroker-State genai.result]
	Search --> Base[src/lib/base.ts: gemeinsame Adapter-/State-Helfer]
	Gemini --> Base
```

### Adapter und Ablaufsteuerung — `src/main.ts`

`WebWatch` erbt von `@iobroker/adapter-core`'s `Adapter`. Im Konstruktor registriert sie Handler für `ready`, `stateChange` und `unload`.

Bei `ready` liest der Adapter seine Instanzkonfiguration ein, übersetzt die Konfigurationsfelder in die internen `WebWatchSerpApiConfig`- und `WebWatchGenAiConfig`-Strukturen und erzeugt je eine Schnittstelleninstanz für SerpAPI und Gemini. Danach legt er einen Cronjob an. Standardmäßig ist dies `0 0 18 * * *` in der Zeitzone `Europe/Berlin` (täglich um 18:00 Uhr). Eine sofortige Ausführung beim Start ist im Ablauf nicht vorgesehen.

Der Cronjob ruft `Do()` auf. Diese Methode wartet zuerst auf `serpapi.Start(null)` und übergibt anschließend den zurückgegebenen Suchtext an `genai.Start(...)`. Dadurch ist die Suche vor der Gemini-Verarbeitung abgeschlossen. Ist SerpAPI deaktiviert oder liefert keine nutzbare Antwort, erhält Gemini `null`. Gemini kann unabhängig aktiviert sein; in diesem Fall wird sein konfigurierter Prompt auch ohne Suchergebnis verwendet.

Beim Entladen stoppt `onUnload` die gespeicherten Cronjobs und ruft anschließend den ioBroker-Callback auf.

### Gemeinsame Basisklasse — `src/lib/base.ts`

`Base` hält die Adapterreferenz sowie Identifikator und Log-Präfix. Die Klasse bündelt Logging, Erzeugen bzw. Aktualisieren von ioBroker-Objekten, Setzen von States und Initialisieren eines Defaultwerts. `safeSetState` fängt Fehler beim Schreiben eines States ab und protokolliert sie. `Start`, `Stop`, `Do` und `ReadData` sind Basismethoden bzw. Erweiterungspunkte; die beiden API-Implementierungen überschreiben `Start` und ihre Variableninitialisierung.

### Websuche — `src/lib/serpapi.ts`

Wenn `SerpApi_enabled` aktiv ist, initialisiert die Schnittstelle `serpapi` und `serpapi.result`, ruft `getJson` aus dem Paket `serpapi` auf und verwendet den konfigurierten Suchtext. Die Suchparameter setzen unter anderem Sprache und Region auf Deutsch (`hl: de`, `gl: de`).

Als Kriterium für ein nutzbares Ergebnis prüft die Implementierung den Snippet des ersten organischen Suchtreffers. Ist dieser vorhanden, schreibt sie die komplette Antwort als formatiertes JSON in `serpapi.result` und gibt dasselbe JSON an den Aufrufer zurück. Andernfalls protokolliert sie eine Warnung und schreibt einen leeren String. Bei deaktivierter Suche wird kein API-Aufruf ausgeführt und der Rückgabewert bleibt leer.

### KI-Verarbeitung — `src/lib/genai.ts`

Wenn `GeminiApi_enabled` aktiv ist, initialisiert die Schnittstelle `genai` und `genai.result`, ergänzt den konfigurierten Prompt gegebenenfalls um den von SerpAPI zurückgegebenen Text und sendet ihn mit `GoogleGenAI` an das Modell `gemini-3.5-flash`. Der Text der Antwort wird protokolliert und in `genai.result` gespeichert. Ist die KI deaktiviert, wird kein API-Aufruf ausgeführt.

### Typen — `src/lib/types.ts`

Die Datei enthält die Konfigurationsverträge für die beiden API-Schnittstellen sowie die Struktur für ioBroker-Objekte. Die von `main.ts` verwendeten Felder bilden die UI-Einstellungen auf die Schnittstellenkonfiguration ab.

## Konfiguration und Zugangsdaten

Die Admin-Oberfläche ist als JSON-Konfiguration in `admin/jsonConfig.json5` beschrieben:

| Einstellung | Zweck | Standard / Verhalten |
| --- | --- | --- |
| `readCronString` | Cron-Ausdruck für den regelmäßigen Lauf | `0 0 18 * * *` |
| `timezone` | Zeitzone des Zeitplans | `Europe/Berlin` |
| `SerpApi_enabled` | SerpAPI-Suche aktivieren | `false` |
| `SerpApi_key` | SerpAPI-Schlüssel | leer |
| `SerpApi_SearchString` | Suchanweisung für SerpAPI | leer |
| `GeminiApi_enabled` | Gemini-Verarbeitung aktivieren | `false` |
| `GeminiApi_key` | Gemini-API-Schlüssel | leer |
| `GeminiApi_SearchString` | Prompt für Gemini | leer |

Die Standards sind zusätzlich in `io-package.json` im Abschnitt `native` hinterlegt. Die beiden API-Schlüssel sind dort als `protectedNative` und `encryptedNative` deklariert und werden in der Admin-Oberfläche als Passwortfelder dargestellt. Die Zugangsdaten müssen vom Betreiber bereitgestellt werden.

## ioBroker-Objekte und Daten

Die API-Schnittstellen legen ihre Kanal- und State-Objekte bei Bedarf über `checkVariables()` an, wenn die jeweilige Funktion aktiviert ist:

| State | Typ | Inhalt |
| --- | --- | --- |
| `serpapi.result` | String, read-only | Vollständige SerpAPI-Antwort als JSON; leer, wenn kein organischer Snippet gefunden wurde |
| `genai.result` | String, read-only | Text der Gemini-Antwort |

Die States werden mit `ack: true` geschrieben. Die Kanäle `serpapi` und `genai` enthalten jeweils den zugehörigen Ergebnis-State.

## Fehlerbehandlung und Betriebsverhalten

- SerpAPI- und Gemini-Aufrufe protokollieren Exceptions in ihren jeweiligen Schnittstellen und beenden den betreffenden Aufruf, ohne sie nach außen weiterzuwerfen.
- Das Setzen von Ergebnis-States läuft über `safeSetState`; Schreibfehler werden protokolliert.
- `CronCreate` fängt Fehler beim Anlegen eines Cronjobs ab und protokolliert sie. `CronStatus` protokolliert den Status und den nächsten Ausführungszeitpunkt.
- Der Adapter läuft nur bei den aktivierten Diensten; beide Schalter sind standardmäßig aus.
- Die Anfragen an externe Anbieter verursachen deren eigene Kontingent-, Nutzungs- und gegebenenfalls Kostenfolgen.

## Quellcodebasierte Abgrenzungen

- `stateChange` ist registriert und protokolliert Änderungen bzw. nicht bestätigte Kommandos. Im betrachteten Quellcode werden jedoch keine States abonniert und es ist keine fachliche Verarbeitung solcher Kommandos implementiert.
- Die Ergebnis-States entstehen erst beim Lauf der jeweils aktivierten Funktion; bei deaktivierter Funktion wird ihr State nicht durch diese Schnittstelle aktualisiert.
- Wenn ein API-Aufruf fehlschlägt, wird der Fehler protokolliert. Der Quellcode schreibt in diesem Fehlerpfad keinen expliziten Fehlerstatus in den Ergebnis-State.
- `Base` enthält allgemeine Helfer und Erweiterungspunkte. Er führt keine eigenständige Hintergrundverarbeitung aus.

## Build und Tests

`npm run build-backend` kompiliert TypeScript aus `src/` mit `tsconfig.build.json` nach `build/`; der Package-Build startet diesen Build und erstellt anschließend ein npm-Paket. Die Paket-, Unit- und Integrationstests sind als Mocha-Skripte unter `test/` konfiguriert. `src/main.test.ts` ist eine generische Testvorlage und enthält derzeit keine fachlichen Tests für den Adapterablauf.
