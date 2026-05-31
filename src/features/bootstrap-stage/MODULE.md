# bootstrap-stage

## Ansvar

`bootstrap-stage` kor stage import gate for canonical preprocess-batcher: schema/ref/dedupe och status `ready|needs-review|rejected` per record.

## Agda ytor

- stage-run per preprocess_batch_id
- validering mot canonical kontrakt
- referenskontroll mot Entitet/Konto
- record-level dedupe inom batch och mot historik

## Tillatna beroenden

- bootstrap-preprocess
- bootstrap-contract validator
- shared storage

## Tester

- `tests/architecture/bootstrap-stage-gate.test.mjs`
