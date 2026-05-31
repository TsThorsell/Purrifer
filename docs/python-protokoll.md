# Python-protokoll

Det här dokumentet beskriver hur appen ska kommunicera med den lokala Python-motorn i v1.

Målet är att Python ska vara en `lokal dokumentmotor`, inte en separat serverprodukt.

## Grundbeslut för v1

I v1 gäller:

- `Electron main` äger Python-processens livscykel
- Python startas som `child process`
- kommunikation sker via `stdin/stdout`
- meddelandeformatet är `newline-delimited JSON`, även kallat `JSON Lines`
- `renderer` eller `React` får aldrig prata direkt med Python
- all Python-kommunikation går via typade services i `Electron main`

## Varför denna modell

Den här modellen är vald eftersom den:

- undviker lokal port och lokal HTTP-server
- håller säkerhetsytan mindre
- gör `Electron main` till enda bron mot lokala capabilities
- gör Python lättare att testa separat
- stödjer hårda och versionssatta kontrakt
- håller React borta från dokumentmotor och filsystem

## Meddelandeformat

Varje meddelande ska vara exakt ett JSON-objekt per rad.

Exempel på request:

```json
{"id":"req_001","method":"document.renderDraft","params":{"projectKey":"blikk:203650","templateKey":"iu_utlatande"}}
```

Exempel på success response:

```json
{"id":"req_001","ok":true,"result":{"outputPath":"C:\\...\\UTKAST.docx","warnings":[]}}
```

Exempel på fel:

```json
{"id":"req_001","ok":false,"error":{"code":"template_not_found","message":"Mallen saknas.","details":{}}}
```

## Tvingande regler

I v1 ska följande regler gälla:

- `stdout` används endast för protokollmeddelanden
- loggar från Python går till `stderr`, aldrig till `stdout`
- alla requests har:
  - `id`
  - `method`
  - `params`
- alla responses har samma `id` som requesten
- alla fel ska ha stabil `error.code`
- `Electron main` ska ha timeout per request
- Python-processen ska kunna startas om vid krasch
- v1 använder `request/response`, inte streaming
- stora binärer skickas inte över JSON
- filer refereras med `file path`, `document id` eller metadata

## Kontrakt och typning

Kontrakten mellan TypeScript och Python ska vara:

- typade
- schema-validerade
- små och tydliga
- versionsbara

Det innebär:

- TypeScript skickar bara godkända request-objekt
- Python returnerar bara godkända response-objekt
- båda sidor ska kunna validera formatet

## Ansvarsfördelning

### React renderer

Ansvar:

- visa UI
- samla användarens input
- anropa typade preload-queries och commands

Får inte:

- starta Python
- skicka rå JSON till Python
- läsa eller skriva dokument direkt

### Preload API

Ansvar:

- exponera säkra, typade kontrakt till renderer

### Electron main

Ansvar:

- starta och stoppa Python-processen
- skicka request till Python
- korrelera responses via `id`
- hantera timeout, fel och restart
- översätta tekniska fel till appnära fel när det behövs

### Python document engine

Ansvar:

- utföra dokumentrelaterade uppgifter
- svara på typade metoder
- skriva loggar till `stderr`
- hålla `stdout` rent för protokollet

## Exempel på metodnivå

Metoder bör vara affärs- eller dokumentnära.

Bra exempel:

- `document.extractFields`
- `document.extractTables`
- `document.renderDraft`
- `document.detectLayout`
- `document.previewRegions`

Mindre bra exempel:

- `runPythonTask`
- `openFile`
- `parseAnything`

## När modellen kan behöva ändras senare

Den här modellen passar v1 mycket bra.

Vi bör först överväga något mer avancerat om vi senare behöver:

- flera samtidiga externa klienter
- högvolymstreaming eller progressflöden
- fjärrkörning
- separat Python-daemon som överlever Electron
- språkoberoende tjänstekörning utanför desktopappen

Det är inte ett behov i v1.

## Sammanfattning

V1 använder:

- `child process`
- `stdin/stdout`
- `JSON Lines`
- typade kontrakt
- strikt request/response

Det är enkelt, lokalt, säkert nog och väl anpassat till appens arkitekturprinciper.

