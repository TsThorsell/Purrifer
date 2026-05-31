# bootstrap-preprocess

## Ansvar

`bootstrap-preprocess` kor en offline preprocess-runner som transformerar raw ingest-filer till canonical records med confidence och review flags.

## Agda ytor

- preprocess-run per ingest_batch_id
- receptbaserad record-generering per filtyp/kallmuster
- canonical payload output utan skrivning till domanobjekt

## Tillatna beroenden

- bootstrap-intake
- bootstrap-contract validator
- shared storage

## Tester

- `tests/architecture/bootstrap-preprocess-runner.test.mjs`
