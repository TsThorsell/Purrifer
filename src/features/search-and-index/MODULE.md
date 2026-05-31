# search-and-index

## Ansvar

`search-and-index` ager mastersearch MVP over centrala objekt i lokal lagring.

## Agda ytor

- sokruta for fri text
- sokresultatlista med oppningsbara traffar
- manuellt rebuild-kommando for index

## Tillatna beroenden

- read-only data fran document-inbox
- read-only data fran voucher-and-proof
- read-only data fran invoice-and-payment
- read-only data fran obligations-and-cases

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/mastersearch-behavior.test.mjs`
