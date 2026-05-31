# Nomenklatur för ekonomiappen

Det här dokumentet beskriver vilka ord vi använder i projektet och vad de betyder.

Målet är att vi ska prata om samma saker på samma sätt, både när vi designar appen och när vi senare bygger den.

## Grundprinciper

- Appen är en `central kontrollpanel`, inte ett fullständigt bokföringssystem.
- Appen ska börja med `manuella flöden`.
- Allt nytt material ska `granskas och godkännas manuellt` innan det blir skarpt.
- Originalunderlag ska `alltid sparas`.
- Appen ska vara `generisk`, så att nya personer, bolag, fastigheter och innehav kan läggas till utan omprogrammering.

## Viktiga begrepp

### Entitet

En `entitet` är en part som appen håller reda på.

Exempel:

- person
- bolag
- fastighet

En entitet kan äga, använda, betala för eller vara kopplad till andra objekt i systemet.

### Konto

Ett `konto` är en plats där pengar eller tillgångar hålls.

Exempel:

- bankkonto
- depå
- ISK
- kapitalförsäkring

Ett konto tillhör eller är kopplat till en eller flera entiteter.

### Innehav

Ett `innehav` är en tillgång eller position som byggs upp över tid genom händelser.

Exempel:

- onoterade aktier
- fonder
- fastigheter
- likvida medel
- banklån
- interna lån mellan entiteter

Ett innehav används för att visa historik, värdeutveckling och summeringar över tid.

### Händelse

En `händelse` är något som händer i ett innehav eller i en ekonomisk relation.

Exempel:

- köp
- försäljning
- emission
- konvertering
- värderingsuppdatering
- avgift
- amortering

Händelser används särskilt för tidslinjer och historik.

### Tidslinje

En `tidslinje` är en datumordnad lista av händelser för ett innehav, lån, en fastighet eller annan ekonomisk relation.

Tidslinjen ska göra det möjligt att följa en ekonomisk berättelse över tid, till exempel ett onoterat innehav som Lunar.

### Åtagande

Ett `åtagande` är en långlivad relation eller ett ansvar som finns över tid.

Exempel:

- hemförsäkring
- elavtal
- lån
- abonnemang
- arrende

Ett åtagande kan skapa återkommande fakturor, betalningar och avvikelser.

### Ärende

Ett `ärende` är en konkret arbetsenhet som ska hanteras.

Exempel:

- en faktura som väntar på betalning
- en betalning som saknar verifikat
- en avvikelse i ett återkommande åtagande
- ett dokument som behöver klassificeras

Ett ärende är kortlivat jämfört med ett åtagande.

### Leverantörsfaktura

En `leverantörsfaktura` är en konkret faktura från en leverantör.

Typiska fält:

- leverantör
- fakturadatum
- förfallodatum
- belopp
- OCR eller referensnummer
- kopplad entitet
- kopplat åtagande

En leverantörsfaktura kan vara obetald, delbetald, fullt betald eller betald men inte fullt verifierad.

### Betalhändelse

En `betalhändelse` är den faktiska betalningen eller registreringen av en betalning.

En betalhändelse kan skapas från:

- manuellt importerat transaktionsunderlag
- manuell registrering
- uppladdat eller inklistrat betalbevis

En betalhändelse kan kopplas till en eller flera leverantörsfakturor.

### Verifikat

Ett `verifikat` är ett fristående objekt som består av:

- originalunderlaget
- tolkad data och metadata
- verifieringsstatus
- länkar till de objekt som verifikatet styrker

Ett verifikat kan till exempel bestå av:

- faktura-PDF
- bankskärmdump
- bankutdrag
- Swish-underlag
- e-postbekräftelse

### Dokument

Ett `dokument` är inkommande eller sparat underlag.

Alla dokument är inte verifikat, men verifikat bygger på dokument.

Ett dokument kan vara:

- PDF
- skannad bild
- e-post
- export
- uppladdad fil

### Transaktionsunderlag

Ett `transaktionsunderlag` är material som beskriver transaktioner, men ännu inte är färdigt klassificerat som betalhändelser.

Exempel:

- CSV-kontoutdrag
- XLSX-kontoutdrag
- inklistrade transaktionsrader från bank
- skärmdump av transaktionslista

### Notering

En `notering` är fri text eller enklare dokumentation som ska sparas men inte nödvändigtvis leder till en ekonomisk åtgärd.

Exempel:

- besked från bank eller försäkringsbolag
- investerarkommentar
- intern anteckning

### Tagg

En `tagg` är en fri etikett som används som komplement till den strukturerade modellen.

Taggar ska användas för sådant som inte passar naturligt som egen entitet, status eller objekttyp.

Exempel:

- deklaration
- pension
- lantbruk
- Lunar
- uppfoljning

Taggar ska vara sokbara och kunna laggas pa flera olika objekttyper.

### Avvikelseärende

Ett `avvikelseärende` är ett ärende som skapas när något inte beter sig som förväntat.

Exempel:

- återkommande faktura har inte kommit
- betalning saknas efter förfallodatum
- banktransaktion finns men inget dokument matchar
- dokument kom in men ingen åtgärd eller verifiering har skett

### Återkommande åtagande

Ett `återkommande åtagande` är ett åtagande med ett förväntat mönster över tid.

Exempel:

- månadsvis elräkning
- årlig försäkringspremie
- ränta eller amortering

Det används för att upptäcka avvikelser och skapa nya avvikelseärenden.

## Viktiga samband

De viktigaste objekten hör ihop så här:

`Entitet -> Konto -> Innehav/Händelser`

`Åtagande -> Leverantörsfaktura -> Betalhändelse -> Verifikat`

`Åtagande -> Avvikelseärende`

`Dokument -> Verifikat -> Betalhändelse/Leverantörsfaktura/Ärende/Händelse`

## Vad som ska vara manuellt i början

I första versionen gäller:

- allt nytt material går via en inkorg för oklassificerat material
- varje objekt ska justeras eller godkännas manuellt
- matchningar ska föreslås, inte godkännas automatiskt
- appen ska lära sig av rättningar genom regler och historik

## Verifieringsnivåer

Vi använder dessa nivåer:

- `fullt verifierad`
- `halvverifierad`
- `inkomplett men accepterad`

`Halvverifierad` används när endast manuell notering finns.

`Inkomplett men accepterad` betyder att något får stängas utan varningar eller påminnelser, men fortfarande ska markeras som inte fullt styrkt.

## Sökning

Appen ska ha en `mastersearch` som söker över hela systemet.

Den ska kunna hitta:

- dokumenttext
- dokumentmetadata
- transaktioner
- ärenden
- åtaganden
- innehav
- händelser
- kommentarer
- datum
- belopp
- motparter

## Visuell struktur

Appen ska ha:

- en `landningsyta` som operativ kontrollpanel
- `entitetsvyer` för fördjupning
- en `central dokumentvy` med stark filtrering
- `tidslinjer` för innehav och längre ekonomiska historier

Om ett dokument droppas på landningsytan ska det vara fritt klassificerbart.

Om ett dokument droppas på en entitetssida ska den entiteten vara förvald som sannolik koppling.

## Ord vi bör använda konsekvent

Använd dessa ord konsekvent i projektet:

- `entitet`
- `konto`
- `innehav`
- `händelse`
- `tidslinje`
- `åtagande`
- `ärende`
- `leverantörsfaktura`
- `betalhändelse`
- `verifikat`
- `dokument`
- `transaktionsunderlag`
- `notering`
- `tagg`
- `avvikelseärende`

## Ord vi bör undvika att blanda ihop

- `åtagande` och `ärende` är inte samma sak
- `dokument` och `verifikat` är inte samma sak
- `transaktionsunderlag` och `betalhändelse` är inte samma sak
- `innehav` och `konto` är inte samma sak

## Nästa användning av dokumentet

Det här dokumentet ska vara grund för:

- datamodell
- databasdesign
- användargränssnitt
- importflöden
- sökmodell
- regelmotor
