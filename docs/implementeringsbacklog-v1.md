# Implementeringsbacklog V1

Det här dokumentet bryter ner `PRD V1` till en konkret implementeringsbacklog per slice.

Syftet är att göra nästa steg byggbara utan att varje utvecklare behöver tolka hela PRD:n från början.

## Användning

Det här dokumentet ska användas för att:

- bestämma byggordning
- definiera första leveranser per slice
- synliggöra beroenden mellan slices
- skapa tickets eller uppgifter
- hålla scope för v1 under kontroll

## Övergripande principer

Allt arbete i v1 ska följa:

- slice-arkitekturen
- manifest + moduldoc per slice
- hårda kontrakt mellan lager
- gemensamt designsystem
- tunn kärna

Varje slice ska i normalfallet levereras i små steg:

1. struktur och kontrakt
2. enkel fungerande version
3. förbättringar inom samma ansvar

## Prioriterad byggordning

Föreslagen byggordning för v1:

1. `shell-core`
2. `document-inbox`
3. `voucher-and-proof`
4. `document-review`
5. `entity-registry`
6. `invoice-and-payment`
7. `obligations-and-cases`
8. `search-and-index`
9. `reports-lite`

### Kommentar till ordningen

- `shell-core` behövs först för att allt annat ska kunna docka in
- `document-inbox` ger första riktiga inflödet
- `voucher-and-proof` behövs tidigt för att underlag ska kunna få en stabil plats i modellen
- `document-review` bygger ovanpå inkommet material och verifikatlogik
- `entity-registry` behövs innan klassificeringen blir riktigt användbar
- `invoice-and-payment` kräver både entiteter, dokument och verifikat
- `obligations-and-cases` bygger vidare på betal- och uppföljningslogik
- `search-and-index` blir mest värdefull när flera objekt redan finns
- `reports-lite` bör komma när kärndatan faktiskt existerar

## Gemensamma tvärgående uppgifter

Det här är inte egna slices, men måste göras tidigt och återkommande:

- etablera repo-struktur för slices
- etablera manifestformat
- etablera moduldoc-format
- etablera arkitekturtester
- etablera kontraktsmönster för commands och queries
- etablera IPC-mönster mellan renderer, preload och main
- etablera JSON-kontrakt till Python
- etablera felstandard
- etablera jobbmodell
- etablera design tokens och baskomponenter

## 1. shell-core

### Mål

Bygga den minsta stabila kärnan som andra slices kan docka in i.

### Beroenden

Inga slice-beroenden.

### Första leverans

- Electron-app startar
- React-renderer visar appskal
- vänsternavigering finns
- landningsyta finns med fasta panelplatser
- jobbpanel finns som skal
- inställningssida finns som skal
- slice-registrering finns
- grundläggande felvisning finns

### Uppgifter

- skapa mappstruktur för `shell-core`
- skapa `slice.manifest`
- skapa moduldoc
- sätt upp Electron `main`, `preload`, `renderer`
- sätt upp React med TypeScript
- sätt upp router eller motsvarande route-registrering
- bygg vänsternavigering
- bygg huvudlayout
- bygg panelcontainer för landningsyta
- bygg enkel jobbpanel-layout
- bygg enkel inställningslayout
- skapa första design tokens
- skapa baskomponenter:
  - knapp
  - panel
  - sida
  - sektion
  - tabellskal
  - filterradskal
  - statusindikator
- bygg grundläggande felbanner eller feldialog
- skapa slice registry
- skapa route registry
- skapa grund för applås-hook utan full funktionalitet om vi vill reservera plats

### Definition of done

- appen startar lokalt
- `shell-core` har manifest och moduldoc
- ingen featurelogik har lagts i kärnan
- minst ett arkitekturtest verifierar slice-registrering
- minst ett UI-test verifierar huvudlayout eller navigation

## 2. document-inbox

### Mål

Skapa första verkliga inflödet av nytt material till systemet.

### Beroenden

- `shell-core`

### Första leverans

- användaren kan dra in filer
- användaren kan ladda upp filer manuellt
- användaren kan klistra in bild eller text
- varje objekt blir en inkorgspost
- original lagras i intern dokumentstore
- posten markeras som oklassificerad
- posten kan öppnas i detaljvy

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera kontrakt för:
  - `createInboxItemFromFiles`
  - `createInboxItemFromPaste`
  - `listInboxItems`
  - `getInboxItem`
- definiera datamodell för inkorgspost
- skapa intern dokumentstore-tjänst eller adapterkontrakt
- bygg UI för drop-zon
- bygg UI för paste-zon eller paste-fångst
- bygg UI för inkorgslista
- bygg detaljvy för inkorgspost
- spara metadata:
  - källa
  - filtyp
  - inkomstdatum
  - status
- lägg till enkel klassificeringsstatus `oklassificerad`
- skapa jobb för import när filer tas emot
- skapa loggning och felhantering för importfel

### Definition of done

- en PDF eller bild kan läggas in och blir synlig i inkorgen
- originalfilen finns i intern store
- metadata går att läsa tillbaka
- fel vid import visas tydligt
- relevanta enhetstester och slice-tester finns

## 3. voucher-and-proof

### Mål

Skapa beviskedjan mellan dokument, verifikat och verifieringsstatus.

### Beroenden

- `shell-core`
- `document-inbox`

### Första leverans

- dokumentobjekt finns i modellen
- verifikatobjekt finns i modellen
- verifieringsstatus finns
- underlag kan kopplas till verifikat
- backup till `UL/MD` kan köras för verifikat

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera datamodell för:
  - dokument
  - verifikat
  - verifieringsstatus
- definiera kontrakt för:
  - `createDocumentRecord`
  - `createVoucherFromDocument`
  - `attachDocumentToVoucher`
  - `setVoucherVerificationStatus`
  - `exportVoucherBackup`
- bygg dokumentdetaljvy
- bygg verifikatdetaljvy
- bygg UI för verifieringsstatus
- bygg länkning mellan ett eller flera dokument och ett verifikat
- implementera backupfilnamn:
  - `V######_UL`
  - `V######_MD`
- generera metadata-Markdown för backup
- logga backupfel och backupresultat

### Definition of done

- ett dokument kan uppgraderas till eller kopplas till verifikat
- ett verifikat kan exporteras till backupmapp med underlag + metadata
- verifieringsstatus är synlig och sparas
- verifikat-id är stabilt och globalt per objekttyp

## 4. document-review

### Mål

Ge användaren en riktig granskningsyta för dokumenttolkning.

### Beroenden

- `shell-core`
- `document-inbox`
- `voucher-and-proof`
- Python-protokoll och child-processramverk i kärnan eller gemensamma adapters

### Första leverans

- PDF kan visas i appen
- bild kan visas i appen
- OCR-resultat kan visas bredvid eller ovanpå
- tolkningsrutor kan visas
- användaren kan flytta rutor
- användaren kan spara rättad position

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera kontrakt för:
  - `extractDocumentFields`
  - `extractDocumentTables`
  - `saveFieldTemplate`
  - `saveTableTemplate`
  - `updateFieldRegion`
- bygg PDF-viewer
- bygg bild-viewer
- bygg zoom, panorering och rotation
- bygg enkel beskärning
- bygg overlay för fältrutor
- bygg overlay eller editor för tabellområden
- visa OCR-text och extraherade fält
- visa osäkerhet eller konfidens
- implementera svensk + engelsk OCR-konfiguration
- implementera fallback `svårtolkat`
- spara versionshistorik för mallar

### Definition of done

- användaren kan öppna ett dokument från inkorgen
- användaren kan se och justera ett tolkat fält visuellt
- mall för leverantör/dokumenttyp kan sparas
- appen kan återanvända mallen på nästa liknande dokument

## 5. entity-registry

### Mål

Bygga den generiska struktur som håller isär personer, bolag, verksamheter och fastigheter.

### Beroenden

- `shell-core`

### Första leverans

- entiteter kan skapas
- entitetstyperna finns
- äganderelationer med andel finns
- kontoobjekt finns
- enkel entitetssida finns

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera datamodell för:
  - entitet
  - entitetstyp
  - äganderelation
  - konto
- definiera kontrakt för:
  - `createEntity`
  - `updateEntity`
  - `listEntities`
  - `getEntityDetails`
  - `createOwnershipRelation`
  - `createAccount`
- bygg entitetslista
- bygg entitetsdetaljsida
- bygg UI för ägande och andelar
- bygg UI för konton under entitet
- bygg första visning av entitetens relaterade objektplatshållare

### Definition of done

- användaren kan skapa de fyra entitetstyperna
- ägare och andelar kan registreras
- konton kan kopplas till entitet
- entitetssidan fungerar som framtida ankare för dokument, rapporter och objekt

## 6. invoice-and-payment

### Mål

Bygga huvudflödet för leverantörsfakturor, betalhändelser och matchning.

### Beroenden

- `shell-core`
- `document-inbox`
- `voucher-and-proof`
- `entity-registry`
- gärna `document-review` för bättre fakturadata, men första version kan starta enklare

### Första leverans

- leverantörsfaktura kan skapas
- betalhändelse kan skapas
- faktura och betalning kan kopplas ihop
- delbetalning stöds
- brutto, netto och moms finns

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera datamodell för:
  - leverantörsfaktura
  - betalhändelse
  - betalmetod
  - matchning
  - momsfält
- definiera kontrakt för:
  - `createInvoiceDraft`
  - `createPaymentEvent`
  - `matchPaymentToInvoice`
  - `splitInvoicePayment`
  - `setInvoiceStatus`
- bygg fakturalista
- bygg fakturadetaljvy
- bygg betalhändelselista
- bygg betalhändelsedetaljvy
- bygg matchningsförslag
- bygg UI för delbetalning
- bygg UI för betalmetod:
  - bank
  - Swish
  - kort
  - intern överföring
  - manuell
- bygg stöd för intern överföring, ovillkorat tillskott och villkorat tillskott som klassificering där relevant

### Definition of done

- en leverantörsfaktura kan registreras
- en betalhändelse kan registreras
- användaren kan matcha dem
- fakturastatus uppdateras korrekt till obetald, delbetald eller betald
- brutto, netto och moms sparas och visas

## 7. obligations-and-cases

### Mål

Skapa uppföljningsmotorn för sådant som måste bevakas över tid.

### Beroenden

- `shell-core`
- `entity-registry`
- `invoice-and-payment`

### Första leverans

- åtagande kan skapas
- ärende kan skapas
- återkommande åtagande kan beskrivas
- avvikelseärende kan skapas manuellt eller regelstyrt
- deadlines och checklista finns

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera datamodell för:
  - åtagande
  - återkommande åtagande
  - ärende
  - avvikelseärende
  - checklistepunkt
- definiera kontrakt för:
  - `createObligation`
  - `createCase`
  - `createDeviationCase`
  - `scheduleRecurringObligation`
  - `reopenCase`
  - `completeChecklistItem`
- bygg lista för åtaganden
- bygg detaljsida för åtagande
- bygg lista för ärenden
- bygg detaljsida för ärende
- bygg statusmodell:
  - nytt
  - utkast
  - väntar
  - klart
  - inkomplett men accepterat
  - arkiverat
- bygg checklista
- bygg logik för försenat och avvikande

### Definition of done

- användaren kan skapa ett återkommande åtagande
- systemet kan visa om något är försenat eller avvikande
- ett ärende kan stängas, arkiveras och återöppnas
- checklistor fungerar i ärenden

## 8. search-and-index

### Mål

Göra allt återfinningsbart via en stark lokal sök.

### Beroenden

- `shell-core`
- minst några andra slices med riktig data

### Första leverans

- mastersearch finns
- lokalt index finns
- träffar grupperas per objekttyp
- användaren kan öppna objekt från träfflistan

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera indexstrategi
- definiera kontrakt för:
  - `indexDocumentText`
  - `indexObjectMetadata`
  - `searchAll`
  - `rebuildSearchIndex`
- bygg sökruta
- bygg resultatsida
- bygg träffgrupper:
  - entiteter
  - åtaganden
  - ärenden
  - leverantörsfakturor
  - betalhändelser
  - verifikat
  - dokument
  - innehav
  - händelser
  - noteringar
- bygg filterchips
- bygg sortering på relevans, datum och belopp

### Definition of done

- användaren kan söka på fri text, datum eller belopp
- träffar visas grupperat
- användaren kan drilldowna från träff till objekt
- index kan byggas om lokalt

## 9. reports-lite

### Mål

Ge första användbara översikter som börjar ersätta Excel.

### Beroenden

- `shell-core`
- `entity-registry`
- `invoice-and-payment`
- `obligations-and-cases`
- `search-and-index` är inte ett hårt krav men hjälper

### Första leverans

- kassabok eller transaktionsjournal per entitet
- balansöversikt per entitet
- resultatliknande periodvy per entitet
- budget mot utfall
- föregående år mot utfall

### Uppgifter

- skapa `slice.manifest`
- skapa moduldoc
- definiera read models för:
  - transaktionsjournal
  - balanssnapshot
  - periodutfall
  - budgetjämförelse
- definiera kontrakt för:
  - `listEntityLedger`
  - `getEntityBalanceSnapshot`
  - `getEntityPeriodReport`
  - `getBudgetComparison`
  - `getYearOverYearComparison`
- bygg grafkomponenter enligt designsystemet
- bygg tabellvyer
- bygg drilldown från graf till lista
- bygg tydliga markeringar för osäker eller ofullständig data
- bygg export till PDF/CSV/XLSX på enkel nivå

### Definition of done

- användaren kan se transaktionsjournal per entitet
- användaren kan se enkel balansöversikt per entitet
- användaren kan se budget mot utfall per månad och huvudkonto
- användaren kan jämföra med föregående år
- drilldown till underlag fungerar för minst en rapporttyp

## Tvärgående teknikbacklog

Det här är uppgifter som sannolikt behöver ligga i eller nära kärnan men inte ska urarta till featurekod:

### Databas och migrationer

- välj SQLite-bibliotek
- skapa migrationsramverk
- skapa schema-versionering
- skapa seedmekanism för grundpaket

### Python-motor

- starta child process från Electron main
- bygg JSON Lines-protokoll
- bygg request/response-korrelation via `id`
- bygg timeout-hantering
- bygg restart vid krasch
- bygg schema-validering

### Jobbsystem

- definiera jobbstatus
- skapa jobblagring
- skapa jobbpanelens read model
- skapa enkel progressmodell

### Felmodell

- definiera global feltyp
- skilj på affärsfel och tekniska fel
- mappa Python-fel till appfel
- skapa UI-standard för felvisning

### Designsysteem

- definiera färg- och typografitokens
- definiera spacing
- definiera statusfärger
- definiera tabellmönster
- definiera formulärmönster
- definiera panelmönster

### Arkitekturtester

- verifiera att varje slice har manifest
- verifiera att varje slice har moduldoc
- verifiera tillåtna beroenden
- verifiera att renderer inte får förbjudna imports eller anrop

## Förslag på första milstolpar

### Milstolpe 1: Appskal

- `shell-core` första version klar

### Milstolpe 2: Inflöde

- `document-inbox` klar på första nivå
- användaren kan få in material lokalt

### Milstolpe 3: Underlag och bevis

- `voucher-and-proof` första version klar
- backup till `UL/MD` fungerar

### Milstolpe 4: Granskning

- `document-review` första version klar
- visuella tolkningsrutor fungerar

### Milstolpe 5: Struktur

- `entity-registry` klar på första nivå

### Milstolpe 6: Fakturor och betalningar

- `invoice-and-payment` första version klar

### Milstolpe 7: Uppföljning

- `obligations-and-cases` första version klar

### Milstolpe 8: Sök

- `search-and-index` första version klar

### Milstolpe 9: Rapporter

- `reports-lite` första version klar

## Definition of ready för ny slice

Innan arbete börjar på en slice ska följande finnas:

- namn
- tydligt ansvar
- moduldoc
- manifest
- känd plats i byggordningen
- kända beroenden
- första leverans definierad

## Definition of done för backlogpost

En backlogpost är klar när:

- koden ligger i rätt slice
- manifestet stämmer
- moduldocen stämmer om kontraktet ändrats
- relevanta tester finns
- arkitekturtester fortfarande passerar
- UI följer designsystemet
- förändringen inte har smugit in logik i fel lager

