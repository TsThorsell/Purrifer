# PRD V1

Det här dokumentet beskriver produktkrav för version 1 av appen.

Dokumentet är skrivet för att fungera som styrdokument för design, arkitektur, implementation och prioritering.

## 1. Produktöversikt

### 1.1 Produktnamn

Arbetsnamn:

- `Purrifer`

### 1.2 Produktbeskrivning

Purrifer är en lokal Windows-orienterad desktopapp som fungerar som en central kontrollpanel för ekonomi, dokument och uppföljning över flera entiteter.

Appen ska hjälpa användaren att:

- samla in dokument och transaktionsunderlag
- tolka och klassificera material
- hantera verifikat, fakturor och betalningar
- följa återkommande åtaganden
- få varningar om något saknas, är sent eller avviker
- söka och återfinna allt relevant underlag
- skapa rapporter och översikter per entitet

### 1.3 Produktpositionering

Purrifer är i v1:

- `inte` ett fullständigt bokföringsprogram
- `inte` en mobilapp
- `inte` beroende av direkta bankintegrationer

Purrifer är i v1:

- en lokal kontrollpanel
- ett dokument- och verifikatnav
- ett uppföljningssystem för ekonomi och underlag

## 2. Bakgrund och problem

Användaren har ekonomi utspridd över:

- privat ekonomi
- aktiebolag
- enskild näringsverksamhet
- flera fastigheter
- investeringar

Tillhörande dokument och underlag ligger i:

- banker
- e-post
- skannade dokument
- PDF:er
- bilder
- Excelark

Nuvarande problem:

- för mycket kunskap bärs av minne och manuella rutiner
- dokument och transaktioner är svåra att koppla ihop
- uppföljning av återkommande åtaganden riskerar att falla mellan stolarna
- många sammanställningar görs i Excel utan gemensam struktur

## 3. Mål

### 3.1 Primära mål

- skapa ordning i nuvarande ekonomi
- säkra att underlag sparas och går att hitta
- minska risken för missade betalningar eller utebliven uppföljning
- samla ekonomi per entitet
- bygga en lokal grund för framtida prognos, pension och what-if

### 3.2 Sekundära mål

- ersätta delar av Excel-baserade sammanställningar
- bygga en robust plattform för framtida tillägg
- skapa en mänskligt läsbar backupstruktur

## 4. Icke-mål i v1

Följande ligger uttryckligen utanför v1:

- full dubbelbokföringsmotor
- full juridisk redovisning
- direkt bankkoppling som beroende
- direkt Gmail/Outlook-API
- mobilapp
- mörkt läge
- internationellt UI-stöd
- full lokal kryptering
- handskrifts-OCR
- pensionsmotor och what-if-simulering

## 5. Målgrupp

Primär målgrupp i v1:

- användaren själv
- användarens fru

Appen är i praktiken `single-user first`, även om viss framtidssäkring för flera användare får finnas.

## 6. Kärnprinciper

- `lokal först`
- `manuell granskning först`
- `original sparas alltid`
- `transparens framför automation`
- `regelbaserat lärande med historik`
- `förslag och halvautomation, inte autonomt beslutsfattande`

## 7. Domänmodell

### 7.1 Entitetstyper

V1 ska stödja:

- `Person`
- `Aktiebolag`
- `Enskild näringsverksamhet`
- `Fastighet`

### 7.2 Centrala objekt

V1 ska minst ha dessa centrala objekt:

- `Entitet`
- `Konto`
- `Innehav`
- `Händelse`
- `Åtagande`
- `Ärende`
- `Leverantörsfaktura`
- `Betalhändelse`
- `Verifikat`
- `Dokument`
- `Transaktionsunderlag`
- `Notering`
- `Tagg`

### 7.3 Viktiga relationer

Systemet ska kunna uttrycka:

- äganderelationer med andel
- ansvarsförhållanden
- koppling mellan dokument och verifikat
- koppling mellan faktura och betalhändelse
- koppling mellan åtagande och avvikelseärenden
- koppling mellan innehav och händelser över tid

## 8. Funktionella krav

### 8.1 Landningsyta

Appen ska ha en landningsyta som operativ kontrollpanel.

Den ska minst innehålla paneler för:

- inkorg att granska
- försenat eller avvikande
- saknar verifikat eller matchning
- pågående jobb
- kommande deadlines
- snabb drop/paste-zon
- översikt per entitet

### 8.2 Inkorg och inflöde

V1 ska kunna ta emot:

- PDF
- skannade bilder
- vidarebefordrade mail
- Excel-filer
- CSV/XLSX-kontoutdrag
- copy/paste av transaktionslistor
- paste av bilder eller text

Varje inkommet objekt ska:

- sparas som original
- få en inkorgspost
- märkas som oklassificerat
- kunna granskas manuellt innan det blir skarpt

### 8.3 Dokumentgranskning

V1 ska stödja:

- inbyggd PDF-visning
- inbyggd bildvisning
- zoom
- panorering
- rotation
- enkel beskärning
- tolkningsrutor ovanpå dokument
- manuell justering av fältrutor

V1 ska stödja:

- flersidiga dokument
- fältmallar
- tabellmallar
- svenska och engelska för OCR

V1 ska inte kräva stöd för handskriven text.

### 8.4 Klassificering

Nytt material ska gå via en oklassificerad inkorg.

Systemet ska:

- föreslå objekttyp
- föreslå entitet
- föreslå nyckeldata
- visa osäkerhet
- visa förklaring till förslag

Användaren ska:

- kunna godkänna
- kunna rätta
- kunna dela upp material i flera poster
- kunna koppla till befintliga objekt
- kunna skapa nya objekt från materialet

### 8.5 Regelbaserat lärande

Systemet ska lära sig av rättningar genom:

- regler
- historik
- mallar
- fördelningsmallar

Systemet ska kunna lagra:

- leverantörsprofiler
- entitetskopplingar
- klassificeringsmönster
- fältmallar
- tabellmallar
- matchningsmönster
- åtgärdsmallar
- avvikelsemönster

### 8.6 Dokument, verifikat och verifiering

V1 ska stödja:

- dokument som eget objekt
- verifikat som eget objekt
- verifieringsstatus
- full, halv och inkomplett verifiering

Systemet ska kunna skapa verifikat:

- från fakturaunderlag
- från kvittoliknande underlag
- direkt från annat underlag efter användargranskning

### 8.7 Fakturor och betalningar

Systemet ska stödja:

- leverantörsfaktura som eget objekt
- betalhändelse som eget objekt
- separerad kedja:
  - `åtagande -> leverantörsfaktura -> betalhändelse -> verifikat`
- delbetalningar
- betalning via flera metoder
- brutto, netto och moms

Betalhändelser ska kunna skapas från:

- manuellt importerat transaktionsunderlag
- manuell registrering
- uppladdat eller inklistrat betalbevis

### 8.8 Matchning

Matchning mellan faktura och betalhändelse ska vara:

- förslagsdriven
- manuellt godkänd
- baserad på belopp, datum, text, OCR, historik och entitet

Systemet ska kunna hantera:

- exakt matchning
- delbetalning
- flera betalningar mot en faktura
- sen matchning efter avstämning

### 8.9 Åtaganden och ärenden

Systemet ska skilja på:

- `Åtagande`
- `Ärende`

Åtagande:

- långlivad relation
- kan vara återkommande

Ärende:

- konkret arbetsenhet
- kan uppstå från åtagande eller ad hoc

Systemet ska stödja:

- återkommande åtaganden
- avvikelseärenden
- checklista på ärenden
- återöppning med historik

### 8.10 Avvikelselarm

V1 ska åtminstone kunna varna för:

- förfallodatum närmar sig
- betalning saknas efter förfallodatum
- dokument inkom men ingen åtgärd kopplad
- banktransaktion finns men inget dokument matchar
- återkommande betalning uteblev eller avviker

Avvikelser ska skapa avvikelseärenden.

### 8.11 Innehav och tidslinjer

V1 ska stödja innehav eller positioner för:

- fastigheter
- onoterade aktier
- fonder
- bankkonton och likvida medel
- banklån
- interna lån

För innehav ska systemet kunna visa:

- tidslinje
- totalt investerat
- antal eller saldo
- genomsnittligt anskaffningsvärde där relevant
- senaste värdering
- totalvärde

### 8.12 Lån och kapitalflöden mellan entiteter

Systemet ska stödja:

- banklån
- interna lån mellan entiteter
- ovillkorade tillskott
- villkorade tillskott eller lån
- interna överföringar
- utlägg
- kostnadssplittning
- fördelningsmallar

### 8.13 Sökning

V1 ska ha en `mastersearch`.

Den ska söka över:

- OCR-text
- dokumentmetadata
- mailtext
- kommentarer
- transaktionstext
- objektens nyckelfält

Sökresultat ska grupperas per objekttyp.

### 8.14 Rapporter

V1 ska ha:

- kassabok eller transaktionsjournal
- balansöversikt per entitet
- resultatliknande periodvy per entitet
- budget mot utfall
- jämförelse mot föregående år

Rapporter ska stödja:

- drilldown
- tydlig transparens kring osäker eller ofullständig data
- grafisk vy och tabellvy

### 8.15 Budget

V1-budget ska vara:

- per månad
- per huvudkonto eller huvudkategori
- per entitet

Budget ska kunna visas i graf.

### 8.16 Arkivering

V1 ska stödja:

- `klart`
- `inkomplett men accepterat`
- `arkiverat`

Arkiverade objekt ska fortfarande vara:

- sökbara
- rapporterbara
- granskningsbara

## 9. Icke-funktionella krav

### 9.1 Plattform

V1 ska vara:

- Windows desktop först

### 9.2 Offline och lokal drift

V1 ska vara:

- lokal först
- användbar offline för kärnfunktionerna

### 9.3 Backup

Användaren ska kunna välja en backupmapp.

För verifikat ska backup kunna skriva:

- underlagsfil
- metadata i Markdown

Exempel:

- `V000123_UL.pdf`
- `V000123_MD.md`

### 9.4 Lagring

Originaldokument ska kopieras in i appens interna dokumentstore.

Intern store ska vara:

- apphanterad
- stabil
- maskinvänlig

Backupmappen ska vara:

- människoläsbar
- användarvald

### 9.5 Säkerhet

V1 ska ha:

- valbart lokalt applås

V1 ska inte kräva:

- lokal kryptering
- avancerad behörighetsmodell

### 9.6 Prestanda

Systemet ska designas för att kännas snabbt vid växande mängder dokument och metadata genom:

- lokalt sökindex
- bakgrundsjobb
- tydlig separation mellan originalfiler och metadata

### 9.7 Jobb och bakgrundsarbete

V1 ska ha ett enkelt jobbsystem.

Jobb ska kunna vara:

- köade
- pågående
- klara
- misslyckade

V1 ska ha ett aktivitetscenter eller jobbpanel.

### 9.8 Loggning och felhantering

V1 ska ha:

- applikationslogg
- spårning av viktiga jobb
- gemensam felstandard

Fel ska skiljas i:

- affärsfel
- tekniska fel

## 10. Arkitekturkrav

### 10.1 Övergripande arkitektur

V1 ska byggas som en `slice-baserad modulär monolit`.

Varje ny funktion ska ha:

- slice-manifest
- moduldoc
- ägda filer
- ägda tester

### 10.2 Kärna och slices

Kärnan ska vara liten och äga:

- appstart
- navigation
- designsystem
- layout
- registrering
- gemensamma kontrakt

Featurelogik ska ligga i slices.

### 10.3 Teknikstack

V1 ska byggas med:

- Electron
- TypeScript
- React
- SQLite
- Python

### 10.4 Renderergräns

React får inte:

- anropa databas direkt
- anropa filsystem direkt
- anropa Python direkt

All kommunikation ska gå via preload och affärsnära kontrakt.

### 10.5 Python-motor

Python ska:

- köras som child process
- ägas av Electron main
- kommunicera via stdin/stdout
- använda JSON Lines
- exponera schema-validerade JSON-kontrakt

## 11. Teststrategi

V1 ska minst ha:

- enhetstester
- kontraktstester
- arkitekturtester
- ett fåtal kritiska end-to-end-flöden

## 12. Första v1-slices

Följande slices är låsta för v1-kärnan:

1. `shell-core`
2. `entity-registry`
3. `document-inbox`
4. `document-review`
5. `voucher-and-proof`
6. `invoice-and-payment`
7. `obligations-and-cases`
8. `search-and-index`
9. `reports-lite`

Byggordning som redan låsts:

1. `shell-core`
2. `document-inbox`

## 13. Framgångskriterier

V1 är lyckad om användaren kan:

- lägga in dokument och transaktionsunderlag lokalt
- hitta allt igen via sök och entitetsvyer
- se vilka fakturor och åtaganden som kräver uppföljning
- koppla betalningar till underlag
- få en tydlig rapport per entitet
- lita på att originalunderlag, metadata och backup är spårbara

## 14. Nästa steg efter v1

När v1-kärnan fungerar är naturliga nästa steg:

- djupare innehavsanalys
- pensionskalkyler
- what-if-scenarier
- bättre importörer
- fler integrationer
- förfinad rapportering
