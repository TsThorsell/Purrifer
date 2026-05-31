# Teknikstack

Det här dokumentet låser den rekommenderade teknikstacken för v1.

Målet är att välja en stack som passar appens krav på:

- lokal först
- Windowsnära desktopkänsla
- hård UI-standardisering
- modulär slice-arkitektur
- tydliga kontrakt
- enkel utbyggnad med små tillägg
- stark dokument- och filhantering

## Vald riktning

V1 byggs med:

- `Electron`
- `TypeScript`
- `React`
- `SQLite`
- `Python` som lokal dokument- och tolkningsmotor
- `Markdown` för människoläsbar backupmetadata

## Kort motivering

### Electron

Electron är valt som desktopskal.

Det passar eftersom appen behöver:

- riktig lokal desktopkänsla
- stabil fil- och dokumenthantering
- drag-and-drop och copy-paste
- tydliga processgränser
- möjlighet att bygga hårda kontrakt mellan UI och lokala capabilities

Electron ska dock användas disciplinerat.

Säkerhetsprinciper som `context isolation`, strikta IPC-gränser och begränsad exponering från preload ska vara standard från början.

### TypeScript

TypeScript är valt för att göra dockningspunkter och slice-kontrakt tydliga.

Det ska användas för:

- commands
- queries
- DTO:er
- event payloads
- slice-manifest
- UI props
- kontrakt mellan preload, main och service-lager

### React

React är valt för rendering och interaktion.

React ska inte vara sanningslager.

Det betyder:

- ingen direkt databasåtkomst från React
- inga direkta filsystemsanrop från React
- inga direkta Python-anrop från React
- ingen affärslogik i komponenter

React ska använda färdigformade view models och typade kontrakt.

## Viktigaste regeln

`React är inte appen. React är bara ytan.`

Den verkliga appen är:

- typade kontrakt
- lokala services
- SQLite
- kontrollerade adapters

## SQLite

SQLite är vald som lokal operativ databas.

Den passar eftersom appen är:

- lokal först
- avsedd för ett litet antal användare
- dokument- och metadataintensiv
- beroende av snabb lokal sökning och rapportering

SQLite är sanningslager för operativa data.

## Python-motor

Python används som specialiserad lokal motor för:

- OCR
- PDF- och bildtolkning
- Excel- och dokumentimport
- tabellutläsning
- framtida dokumentgenerering vid behov

Python ska vara isolerad från UI:t och anropas via tydliga JSON-baserade kontrakt.

Python ska aldrig anropas direkt från React.

## Markdown

Markdown används för:

- backupmetadata
- människoläsbar export
- återställningsunderlag
- auditvänliga snapshots

Markdown är inte primärt sanningslager.

Det genereras från appens riktiga data.

## Föreslagen teknisk gränsdragning

### React renderer

Ansvar:

- rendering
- interaktion
- formulär
- tabeller
- dokumentvy
- filter och drilldown

Får inte:

- läsa databas direkt
- anropa Python direkt
- anropa filsystem direkt
- bära sanningslogik

### Preload API

Ansvar:

- vara enda tillåtna brygga från UI till appkärnan
- exponera typade commands och queries
- begränsa vad renderer får göra

### Electron main

Ansvar:

- appstart
- fönster
- menyer
- IPC
- lokal säkerhet
- databasåtkomst
- filåtkomst
- start och stopp av Python-motorn
- registrering av slices

### TypeScript services

Ansvar:

- use cases
- slice-logik
- arbetsflöden
- validering
- orkestrering
- transaktionsstyrning

### SQLite

Ansvar:

- operativt lokalt sanningslager

### Python document engine

Ansvar:

- dokumenttolkning
- OCR
- extraktion av fält
- extraktion av tabeller
- framtida specialfunktioner för dokument

Kommunikation:

- endast via strikt JSON-kontrakt

### Markdown backupmetadata

Ansvar:

- människoläsbar backup och återställningshjälp

## Dockningsbarhet

Varje ny funktion ska i första hand byggas som en `slice`.

Exempel:

- `/features/document-generator`
- `/features/project-mail`
- `/features/settings`

Varje slice bör minst ha:

- `slice.manifest.ts`
- `contracts.ts`
- `queries.ts`
- `commands.ts`
- `service.ts`
- `viewModel.ts`
- `components.tsx`
- `tests`

## Hårda regler

- UI får bara prata med preload API
- preload API får bara exponera registrerade kontrakt
- services får prata med repositories och adapters
- adapters får prata med SQLite, filsystem, Outlook, banker, Python eller andra externa system
- Python får bara ta emot och returnera JSON enligt schema

## Säkerhetsprincip

Arkitekturen ska skrivas och byggas som om Electron är kraftfullt men farligt om det används slarvigt.

Det betyder:

- minsta möjliga privilegier i renderer
- inga genvägar runt preload
- tydliga IPC-kontrakt
- strikta adaptergränser
- uppdaterade beroenden
- hög disciplin kring filåtkomst och externa processer

## Sammanfattning

Stacken för v1 är vald för att optimera:

- utvecklingshastighet
- tydliga kontrakt
- låg kontext per tillägg
- stark lokal dokumenthantering
- konsekvent UI
- framtida utbyggbarhet

