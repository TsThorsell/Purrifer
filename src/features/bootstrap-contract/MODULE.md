# bootstrap-contract

## Ansvar

`bootstrap-contract` definierar canonical import contract v1 och en återanvändbar schema-validator för bootstrap-pipeline.

## Agda ytor

- versionssatt batch/record-kontrakt
- valideringsregler för obligatoriska fält
- reason-codes för felklassning
- bakåtkompatibel hantering av okända/nya frivilliga fält

## Tillatna beroenden

- inga externa runtime-beroenden

## Tester

- `tests/architecture/bootstrap-contract-validator.test.mjs`
