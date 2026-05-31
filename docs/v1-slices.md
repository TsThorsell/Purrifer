# V1-slices

Det här dokumentet beskriver vilka slices som utgör den första riktiga kärnan i v1.

Målet är att låsa ett första paket som måste fungera innan vi bygger mer avancerade delar.

## V1-kärnan

Följande slices är låsta som första v1-kärna:

1. `shell-core`
2. `entity-registry`
3. `document-inbox`
4. `document-review`
5. `voucher-and-proof`
6. `invoice-and-payment`
7. `obligations-and-cases`
8. `search-and-index`
9. `reports-lite`

## 1. shell-core

Ansvar:

- appskal
- navigation
- landningsyta
- jobbpanel
- inställningar
- designsystem

Det här är den stabila kärnan som andra slices dockar in i.

## 2. entity-registry

Ansvar:

- entiteter
- entitetstyper
- relationer
- ägande
- konton
- grundläggande balansstruktur

Detta är grunden för att privat, bolag, fastigheter och verksamhet ska kunna hållas isär men ändå relateras.

## 3. document-inbox

Ansvar:

- drag-and-drop
- paste
- filimport
- mailimport
- oklassificerad inkorg

Detta är ingången för nytt material.

## 4. document-review

Ansvar:

- PDF-visning
- bildvisning
- OCR-resultat
- rutmarkeringar
- manuell justering
- fältmallar
- tabellmallar

Detta är granskningsytan där appens tolkning blir begriplig och korrigerbar.

## 5. voucher-and-proof

Ansvar:

- dokument
- verifikat
- verifieringsstatus
- koppling mellan underlag och styrkta objekt
- backup till `UL/MD`

Detta är beviskedjan i systemet.

## 6. invoice-and-payment

Ansvar:

- leverantörsfaktura
- betalhändelse
- matchning
- delbetalning
- brutto, netto och moms

Detta är det centrala operativa flödet för fakturor och betalningar.

## 7. obligations-and-cases

Ansvar:

- åtaganden
- ärenden
- avvikelseärenden
- deadlines
- checklistor
- återöppning

Detta är uppföljningsmotorn i systemet.

## 8. search-and-index

Ansvar:

- mastersearch
- filtrering
- lokalt sökindex
- träffgruppering

Detta gör att data verkligen går att återfinna.

## 9. reports-lite

Ansvar:

- kassabok eller transaktionsjournal
- balansöversikt per entitet
- resultatliknande periodvy
- budget mot utfall
- jämförelse mot föregående år

Detta ersätter de första delarna av dagens Excel-sammanställningar.

## Det som inte är v1-kärna

Följande är viktiga framtida områden men inte del av den första kärnan:

- djupare innehavsanalys
- pensionskalkyler
- what-if-scenarier
- mer avancerade investeringstidslinjer
- fullare integrationsstöd mot banker och externa system

## Prioritetsprincip

En ny funktion som inte tydligt stärker de nio ovanstående slicerna bör normalt vänta tills v1-kärnan fungerar sammanhängande.

## Första byggordning

Den första slice som ska byggas är:

1. `shell-core`
2. `document-inbox`

Skälet är att övriga slices behöver en stabil plats att docka in i.

Den första versionen av `shell-core` ska hållas smal och främst ge:

- appskal
- vänsternavigering
- landningsyta med fasta panelplatser
- jobbpanel
- inställningsyta
- designsystemgrund
- slice-registrering

Featurelogik ska inte smygas in i `shell-core`.

### Låst första omfattning för shell-core

Det första byggsteget för `shell-core` ska bara innehålla:

- appstart och fönsterskal
- vänsternavigering
- landningsyta med tomma eller enkla panelplatser
- jobbpanelskal
- inställningssida som skal
- designsystemets första bas
- slice-registrering och route-registrering
- grundläggande felvisning

Det ska inte innehålla riktig domänlogik för:

- dokument
- entiteter
- rapporter
- verifikat
- fakturor
- OCR

Målet är att bygga en stabil dockningshamn, inte att gömma featurelogik i kärnan.

### Varför document-inbox kommer tvåa

`document-inbox` byggs direkt efter `shell-core` eftersom den:

- ger verklig nytta tidigt
- etablerar huvudflödet för nytt material
- skapar en tydlig handoff till senare slices som `document-review`, `voucher-and-proof` och `invoice-and-payment`

Den är därmed den första tydliga användarnära slicen efter appskalet.
