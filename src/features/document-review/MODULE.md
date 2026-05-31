# document-review

## Ansvar

`document-review` ager den forsta granskningsytan for dokumenttolkning:

- extrahering av falt
- extrahering av tabeller
- manuell justering av faltregioner
- mallsparande for falt och tabeller

## Agda ytor

- dokumentgranskningssida
- OCR-resultatlista och tabellsammanfattning
- kommandoytor for mallar

## Tillatna beroenden

- shell-core layout
- document-inbox read-kontrakt
- python-brygga via main-lager

## Tester

- `tests/architecture/slices.test.mjs`

## Begransningar

- ingen slutlig faktura- eller verifikataffar i denna slice
- ingen direkt anrop till python fran renderer

