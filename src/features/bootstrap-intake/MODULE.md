# bootstrap-intake

## Ansvar

`bootstrap-intake` hanterar lokal batchingest till råzon via en eller flera mappar och scanneradapter (TWAIN/WIA), med filmetadata och deterministisk hash-dedupe innan preprocess.

## Agda ytor

- val av en eller flera källmappar
- skapande av ingest-batch med source metadata
- filregistrering med path, typ, storlek och hash
- dedupe inom batch samt mot tidigare batcher
- scannerintag via adapter med capability-detection (ADF/duplex) och fallback till enkel scan

## Tillatna beroenden

- shell-core layout
- shared storage

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/bootstrap-intake-behavior.test.mjs`
- `tests/architecture/bootstrap-scanner-intake-behavior.test.mjs`
