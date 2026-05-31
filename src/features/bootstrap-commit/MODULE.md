# bootstrap-commit

## Ansvar

`bootstrap-commit` committar stage-godkanda records till domanobjekt och skapar beviskedjelankar.

## Agda ytor

- commit-eligibility (ready + manuellt godkanda)
- skrivning till Dokument/Verifikat/Leverantorsfaktura/Betalhandelse
- proof-chain links som ar querybara

## Tillatna beroenden

- bootstrap-stage
- bootstrap-review
- bootstrap-preprocess
- shared storage

## Tester

- `tests/architecture/bootstrap-commit-flow.test.mjs`
