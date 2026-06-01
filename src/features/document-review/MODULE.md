# document-review

## Ansvar

`document-review` ager den forsta granskningsytan for dokumenttolkning och granskningsbeslut:

- extrahering av falt
- extrahering av tabeller
- manuell justering av faltregioner
- mallsparande for falt och tabeller
- registrering av granskningsbeslut (godkänd/avvisad/manuell)
- queue-baserad visning av dokument i review-läge
- loggning av beslutshistorik med aktör, tidsstempel, orsakskod och anteckning

## Agda ytor

- dokumentgranskningssida
- OCR-resultatlista och tabellsammanfattning
- kommandoytor for mallar
- review-kö, beslutspanel och beslutshistorik

## Tillatna beroenden

- shell-core layout
- document-inbox read-kontrakt
- python-brygga via main-lager

## Tester

- `tests/architecture/slices.test.mjs`

## Begransningar

- ingen slutlig faktura- eller verifikataffar i denna slice
- ingen direkt anrop till python fran renderer

