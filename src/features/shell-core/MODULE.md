# shell-core

## Ansvar

`shell-core` ager den stabila karnan for:

- appskal
- navigation
- landningsyta
- jobbvy
- installningsvy
- designsystemets forsta bas
- slice- och route-registrering

## Agda ytor

- huvudlayout
- vansternavigering
- gemensam sidram
- primara panelmönster
- grundlaggande felvisning

## Tillatna beroenden

- Electron appskal
- preload-bro
- slice-registry
- egna rendererkomponenter

## Tester

- `tests/architecture/slices.test.mjs`

## Begransningar

- ingen dokumentlogik
- ingen entitetslogik
- ingen rapportlogik
- ingen OCR-logik
- ingen featuredata ska smygas in i denna slice

