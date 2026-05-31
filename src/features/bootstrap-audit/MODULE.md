# bootstrap-audit

## Ansvar

`bootstrap-audit` visar spårbarhet från råfil till preprocess, stage, manuell review och slutligt committat objekt.

## Agda ytor

- lineage-query över bootstrap-tabeller
- audit-tidslinje med stage/review/commit-tidsstamplar
- filtrering per source_file_id eller commit_batch_id

## Tillatna beroenden

- bootstrap-intake
- bootstrap-preprocess
- bootstrap-stage
- bootstrap-review
- bootstrap-commit

## Tester

- `tests/architecture/bootstrap-audit-trail.test.mjs`
