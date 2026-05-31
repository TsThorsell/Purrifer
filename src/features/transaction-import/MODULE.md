# transaction-import

## Ansvar

`transaction-import` ager importer MVP for transaktionsunderlag (CSV/XLSX), valideringspreview, manuell mappning och commit med sparbar metadata.

## Agda ytor

- val av importfil
- validerad preview med felmarkering per rad
- lokal lagring av importbatch for fortsatt granskning
- manuell mappning till Entitet/Konto/objekttyp
- commit av mappade rader till sparbara importposter

## Tillatna beroenden

- shell-core layout
- shared storage

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/transaction-import-behavior.test.mjs`
