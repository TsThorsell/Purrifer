# Projekt-PM

Det här dokumentet sammanfattar projektet på en nivå som går snabbt att läsa för människa.

Det är en kondenserad bild av vad vi hittills har bestämt om appens syfte, avgränsningar, arkitektur och första leverans.

## Arbetsnamn

Arbetsnamn:

- `Purrifer`

## Syfte

Appen ska vara en `lokal central kontrollpanel` för privat ekonomi, bolag, fastigheter, investeringar och tillhörande dokument.

Den ska hjälpa till att:

- samla ekonomi över flera entiteter
- ta emot och spara dokument
- tolka dokument och föreslå metadata
- hålla ordning på fakturor, betalningar och verifikat
- påminna om sådant som kräver uppföljning
- upptäcka sena eller uteblivna händelser
- ersätta delar av dagens Excel-baserade sammanställningar

Appen ska inte i v1 vara ett fullständigt bokföringssystem.

## Målbild

Målbilden är ett system som:

- fungerar `lokalt först`
- klarar `manuella flöden` innan bankkopplingar finns
- bygger upp ett växande `regel- och historiklager`
- håller isär privat, bolag, fastigheter och investeringar
- låter användaren granska allt viktigt manuellt
- visar tydlig spårbarhet från översikt ner till underlag

## Vad v1 ska vara

V1 ska vara:

- en kontrollpanel
- en dokument- och verifikatmotor
- ett uppföljningssystem för åtaganden, fakturor och betalningar
- en sökbar lokal kunskapsbas
- en första ersättning för vissa Excel-sammanställningar

V1 ska inte vara:

- full dubbelbokföring
- full bankintegration
- full investeringsanalysmotor
- pensions- eller what-if-motor
- mobilapp

## Grundläggande produktprinciper

- `manuellt först`
- `lokalt först`
- `original sparas alltid`
- `förslag men inte autonoma beslut`
- `transparens framför magi`
- `regelbaserat lärande före tung AI`

## Centrala objekt i modellen

De viktigaste objekten är:

- `entitet`
- `konto`
- `innehav`
- `händelse`
- `åtagande`
- `ärende`
- `leverantörsfaktura`
- `betalhändelse`
- `verifikat`
- `dokument`
- `transaktionsunderlag`
- `notering`
- `tagg`

Viktiga kedjor:

- `Entitet -> Konto -> Innehav/Händelser`
- `Åtagande -> Leverantörsfaktura -> Betalhändelse -> Verifikat`
- `Åtagande -> Avvikelseärende`

## Entitetstyper i v1

Följande entitetstyper är låsta:

- `Person`
- `Aktiebolag`
- `Enskild näringsverksamhet`
- `Fastighet`

## Dokument- och betalflöde

Det centrala operativa flödet är:

- material kommer in till `inkorg`
- användaren granskar
- systemet föreslår klassificering
- objekt blir dokument, verifikat, faktura, betalhändelse, ärende eller händelse
- leverantörsfaktura kan matchas mot betalhändelse
- verifikat styrker vad som faktiskt har hänt

Betalhändelser i v1 kan skapas från:

- manuellt importerat transaktionsunderlag
- manuell registrering
- uppladdat eller inklistrat betalbevis

## Viktig uppföljningslogik

Systemet ska kunna:

- bevaka förfallodatum
- flagga sena betalningar
- skapa avvikelseärenden
- skilja på `klart`, `inkomplett men accepterat` och `arkiverat`
- återöppna avslutade objekt med full historik

## Rapporter i v1

V1 ska innehålla:

- `kassabok/transaktionsjournal`
- `balansöversikt per entitet`
- `resultatliknande periodvy per entitet`
- `budget mot utfall`
- `jämförelse mot föregående år`

Budget i v1:

- per månad
- per huvudkonto eller huvudkategori
- per entitet

## Sökning

Appen ska ha en stark `mastersearch` som söker över:

- OCR-text
- dokumentmetadata
- mailtext
- kommentarer
- transaktionstext
- objektens nyckelfält

Sökningen ska vara lokal och indexbaserad.

## Arkitekturprincip

Appen ska byggas som en `slice-baserad modulär monolit` med:

- liten stabil kärna
- hårda kontrakt
- registrerade slices
- moduldocs
- manifest
- ägda filer
- ägda tester
- gemensamt designsystem

## Teknikval

Vald riktning för v1:

- `Electron`
- `TypeScript`
- `React`
- `SQLite`
- `Python` som lokal dokumentmotor
- `Markdown` för backupmetadata

Viktiga gränser:

- `React` är bara UI
- `preload` är enda bro från UI till appkärnan
- `Electron main` äger lokala capabilities
- `Python` körs som child process
- `stdin/stdout + JSON Lines` används mellan main och Python

## Lagring och backup

Vi skiljer på:

- `intern dokumentstore`
- `backupmapp`

Intern dokumentstore:

- apphanterad
- robust
- maskinvänlig

Backupmapp:

- användarvald
- människoläsbar
- innehåller underlag + metadata

Exempel:

- `V000123_UL.pdf`
- `V000123_MD.md`

## Första v1-slices

De nio första slicerna är:

1. `shell-core`
2. `entity-registry`
3. `document-inbox`
4. `document-review`
5. `voucher-and-proof`
6. `invoice-and-payment`
7. `obligations-and-cases`
8. `search-and-index`
9. `reports-lite`

Byggordning som hittills låsts:

1. `shell-core`
2. `document-inbox`

## Viktiga avgränsningar i v1

Inte i v1:

- mobilapp
- mörkt läge
- flerspråkigt UI
- lokal kryptering
- direkt Gmail- eller Outlook-API
- direkt bankkoppling som krav
- handskrifts-OCR
- full juridisk bokföring

## Varför projektet är värt att bygga

Det här systemet har högt värde eftersom det angriper ett verkligt vardagsproblem:

- ekonomi finns utspridd över flera juridiska och praktiska sfärer
- dokument, betalningar och beslut sitter i olika system
- Excel och minne bär för mycket av kontrollen

Målet med Purrifer är att flytta kontrollen från huvudet och arkhögarna till ett spårbart, lokalt och utbyggbart system.
