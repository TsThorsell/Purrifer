# entity-registry

## Ansvar

`entity-registry` ager grundstrukturen for entiteter, aganderelationer och konton.

## Agda ytor

- entitetslista med filter
- entitetsdetaljer
- entitets- och konto-CRUD
- relationer och andelar med validering
- visuell fel- och konfliktguide vid regelbrott

## Tillatna beroenden

- shell-core layout
- sqlite via main-services

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/entity-registry-behavior.test.mjs`

