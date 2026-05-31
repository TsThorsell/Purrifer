# document-inbox

## Ansvar

`document-inbox` ager den forsta inkommande hanteringen av nytt material:

- drag and drop
- manuell filuppladdning
- paste av bild eller text
- oklassificerad inkorg
- lagring av originalunderlag i intern dokumentstore

## Agda ytor

- inkorgslista
- intake-zoner
- detaljvy for oklassificerat material

## Tillatna beroenden

- preload-kontrakt
- egna main-services och repositories
- shell-core layout

## Tester

- `tests/architecture/slices.test.mjs`

## Begransningar

- ingen OCR i denna slice
- ingen slutlig dokumentklassificering i denna slice
- ingen verifikatlogik i denna slice
- ingen fakturalogik i denna slice

