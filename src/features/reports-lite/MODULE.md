# reports-lite

## Ansvar

`reports-lite` ager forsta rapportytan med transaktionsjournal och balansoversikt per entitet.

## Agda ytor

- val av entitet for rapport
- journalrad med datum, typ, referens, belopp, kalla
- balanssnapshot (forenklad)
- drilldown-target till underlag

## Tillatna beroenden

- read-only data fran entity-registry
- read-only data fran invoice-and-payment
- read-only referenser till voucher-and-proof vid senare utokning

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/reports-lite-behavior.test.mjs`
