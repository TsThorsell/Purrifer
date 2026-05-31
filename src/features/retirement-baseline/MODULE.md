# retirement-baseline

## Ansvar

`retirement-baseline` ager pensionskalkylens baslinje med antaganden per Entitet, scenarioresultat och manuell HITL-granskning.

## Agda ytor

- antaganden for pensionsscenario
- baslinjeberakning och osakerhetsmarkering
- manuell godkannandeport med granskningsnotering

## Tillatna beroenden

- entity-registry (begreppsnara koppling via entityId)
- holdings-and-events (lasning av baskapital)
- shared storage

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/retirement-baseline-behavior.test.mjs`

