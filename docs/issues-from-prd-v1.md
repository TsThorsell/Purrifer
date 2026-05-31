# Issue Breakdown från Befintlig PRD (V1)

Källa: `docs/prd-v1.md`
Label vid publicering: `ready-for-agent`

## Issue 1: Åtagande-CRUD med grundstatus
- Type: AFK
- Blocked by: None - can start immediately

### What to build
Inför en end-to-end vertikal slice där användaren kan skapa, uppdatera, lista och öppna `Åtagande` med v1-statusmodell.

### Acceptance criteria
1. Användaren kan skapa och uppdatera åtaganden med definierade statusar.
2. Åtaganden visas i lista och detaljvy med korrekt status.
3. Persistens och återläsning fungerar stabilt via appens standardkontrakt.

## Issue 2: Ärende-CRUD och checklista kopplat till åtagande
- Type: AFK
- Blocked by: Issue 1

### What to build
Inför en vertikal slice där användaren kan skapa `Ärende` kopplat till `Åtagande`, hantera checklistepunkter och uppdatera ärendestatus.

### Acceptance criteria
1. Användaren kan skapa ärende från åtagande och se kopplingen i UI.
2. Checklistepunkter kan skapas och markeras klara.
3. Ärenden kan statusuppdateras och visas korrekt i list-/detaljvyer.

## Issue 3: Avvikelsemotor v1 för återkommande uppföljning
- Type: AFK
- Blocked by: Issue 1, Issue 2

### What to build
Inför en vertikal slice som skapar `Avvikelseärende` när v1-regler bryts: förfallodatum närmar sig/passerat, saknad betalning efter förfallodatum, dokument utan kopplad åtgärd.

### Acceptance criteria
1. Systemet kan identifiera v1-avvikelser och skapa avvikelseärenden.
2. Avvikelseärenden länkar tillbaka till relevant åtagande/ärende/faktura/dokument.
3. Reglerna är testade på externa beteenden, inte intern implementation.

## Issue 4: Landningsyta-panel för Försenat/Avvikande med drilldown
- Type: AFK
- Blocked by: Issue 3

### What to build
Inför en vertikal slice där landningsytan visar operativa avvikelser och låter användaren drilldowna till rätt objekt.

### Acceptance criteria
1. Panelen visar aktuella avvikelser med tydlig prioritering.
2. Klick på panelpost öppnar korrekt detaljobjekt.
3. Panelen följer etablerat designsystem och stör inte övriga moduler.

## Issue 5: Mastersearch MVP över kärnobjekt
- Type: AFK
- Blocked by: Issue 2, Issue 3

### What to build
Inför en vertikal slice för `mastersearch` över centrala objekttyper: dokument, verifikat, leverantörsfaktura, betalhändelse, åtagande, ärende.

### Acceptance criteria
1. Fri textsökning returnerar träffar från flera objekttyper.
2. Sökning använder lokalt index och fungerar offline i v1-kontext.
3. Träffar kan öppnas till respektive objekt.

## Issue 6: Sökresultatgruppering och drill-in
- Type: AFK
- Blocked by: Issue 5

### What to build
Inför en vertikal slice där sökresultat grupperas per objekttyp och har tydlig navigering till detaljvyer.

### Acceptance criteria
1. Resultat är grupperade per domänobjekt enligt nomenklatur.
2. Användaren kan drilldowna från träff till rätt detaljvy utan manuella omvägar.
3. Sortering/filtrering fungerar för minst datum och relevans.

## Issue 7: Reports-lite: transaktionsjournal och balansöversikt per entitet
- Type: AFK
- Blocked by: Issue 5

### What to build
Inför en vertikal slice för första rapportnyttan: `kassabok/transaktionsjournal` och `balansöversikt` per `Entitet`.

### Acceptance criteria
1. Användaren kan välja entitet och se journal + balansöversikt.
2. Rapporter återger underliggande data konsistent och spårbart.
3. Minst ett drilldown-flöde till underlag fungerar.

## Issue 8: Reports-lite: budget mot utfall + år-jämförelse med osäkerhetsmarkering
- Type: HITL
- Blocked by: Issue 7

### What to build
Inför en vertikal slice för `budget mot utfall` samt `jämförelse mot föregående år`, med explicit markering av osäker/ofullständig data.

### Acceptance criteria
1. Budget/utfall visas per månad och huvudkategori/huvudkonto per entitet.
2. År-jämförelse visar tydliga differenser och osäkerhetsmarkering.
3. HITL-review godkänner semantik, transparens och beslutsstöd.

## Publiceringsordning
Publicera i ordning 1 till 8 så blocker-referenser kan uppdateras med riktiga issue-ID:n.
